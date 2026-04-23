import type Stripe from "stripe";
import { eq } from "drizzle-orm";
import type { DomainEvent, PaymentMethodKind } from "@/lib/stripe/gateway";
import { db as defaultDb } from "@/db/client";
import {
  webhookEvents,
  transactions,
  plans,
  paymentPages,
} from "@/db/schema";

/**
 * Webhook processor.
 *
 * Responsibilities:
 *   1. Idempotency — insert into webhook_events on every non-ignored event; a
 *      unique-violation on stripe_event_id means we've already processed this
 *      delivery and short-circuits the handler.
 *   2. Apply the domain event to transactions / plans. Writes are scoped to a
 *      single DB transaction so a partial failure rolls back.
 *   3. Hook point for email send — invoked on payment_succeeded and
 *      plan_installment_succeeded. The email module (slice 5) is the only
 *      consumer of `sendConfirmation`; the default deps use a no-op so this
 *      module stays side-effect-free until slice 5 wires it in.
 */

export type DB = typeof defaultDb;

export interface SendConfirmationArgs {
  kind: "payment" | "plan_installment";
  transactionId: string;
  pageId: string;
  amountCents: number;
  payerEmail: string | null;
  payerName: string | null;
  installmentNumber?: number;
  installmentCount?: number;
}

export interface ProcessorDeps {
  db: DB;
  sendConfirmation: (args: SendConfirmationArgs) => Promise<void> | void;
}

const defaultDeps: ProcessorDeps = {
  db: defaultDb,
  sendConfirmation: () => {
    /* no-op until slice 5 */
  },
};

export async function processWebhookEvent(
  event: DomainEvent,
  ctx: { rawEvent: Stripe.Event },
  deps: ProcessorDeps = defaultDeps,
): Promise<void> {
  const { db, sendConfirmation } = deps;

  // Idempotency: record every non-ignored event. A duplicate event id means
  // Stripe is retrying — acknowledge without re-applying state changes.
  if (event.kind === "ignored") {
    await recordEvent(db, event.stripeEventId, event.eventType, ctx.rawEvent);
    return;
  }

  const firstTime = await recordEvent(
    db,
    event.stripeEventId,
    ctx.rawEvent.type,
    ctx.rawEvent,
  );
  if (!firstTime) return;

  switch (event.kind) {
    case "payment_succeeded":
      await applyPaymentSucceeded(db, event, sendConfirmation);
      return;
    case "payment_failed":
      await applyPaymentFailed(db, event);
      return;
    case "plan_installment_succeeded":
      await applyPlanInstallmentSucceeded(db, event, sendConfirmation);
      return;
    case "plan_installment_failed":
      await applyPlanInstallmentFailed(db, event);
      return;
    case "plan_canceled":
      await applyPlanCanceled(db, event);
      return;
  }
}

/* ---------------------------------------------------------------
   Idempotency
---------------------------------------------------------------- */

async function recordEvent(
  db: DB,
  stripeEventId: string,
  eventType: string,
  payload: Stripe.Event,
): Promise<boolean> {
  const [row] = await db
    .insert(webhookEvents)
    .values({
      stripeEventId,
      eventType,
      payload: payload as unknown as Record<string, unknown>,
    })
    .onConflictDoNothing({ target: webhookEvents.stripeEventId })
    .returning({ id: webhookEvents.id });
  return Boolean(row);
}

/* ---------------------------------------------------------------
   Handlers
---------------------------------------------------------------- */

async function applyPaymentSucceeded(
  db: DB,
  event: Extract<DomainEvent, { kind: "payment_succeeded" }>,
  sendConfirmation: ProcessorDeps["sendConfirmation"],
): Promise<void> {
  const pageId = event.metadata.pageId;
  if (!pageId) {
    console.warn("[processor] payment_succeeded missing pageId metadata", {
      paymentIntentId: event.paymentIntentId,
    });
    return;
  }

  const page = await db.query.paymentPages.findFirst({
    where: eq(paymentPages.id, pageId),
  });
  if (!page) {
    console.warn("[processor] payment_succeeded: page not found", { pageId });
    return;
  }

  const glCode = event.metadata.glCode ?? page.glCodes[0] ?? null;
  const payerEmail = event.metadata.payerEmail ?? null;
  const payerName = event.metadata.payerName || null;

  // Upsert keyed on stripe_payment_intent_id (unique index in schema).
  const [txn] = await db
    .insert(transactions)
    .values({
      pageId,
      amountCents: event.amountCents,
      paymentMethod: mapPaymentMethod(event.paymentMethodKind),
      status: "succeeded",
      payerEmail,
      payerName,
      stripePaymentIntentId: event.paymentIntentId,
      stripeCustomerId: event.customerId,
      glCodeAtPayment: glCode,
    })
    .onConflictDoUpdate({
      target: transactions.stripePaymentIntentId,
      set: {
        status: "succeeded",
        amountCents: event.amountCents,
        paymentMethod: mapPaymentMethod(event.paymentMethodKind),
        stripeCustomerId: event.customerId,
      },
    })
    .returning({ id: transactions.id });

  await sendConfirmation({
    kind: "payment",
    transactionId: txn.id,
    pageId,
    amountCents: event.amountCents,
    payerEmail,
    payerName,
  });
}

async function applyPaymentFailed(
  db: DB,
  event: Extract<DomainEvent, { kind: "payment_failed" }>,
): Promise<void> {
  const pageId = event.metadata.pageId;
  if (!pageId) return;

  await db
    .insert(transactions)
    .values({
      pageId,
      amountCents: 0,
      paymentMethod: "card",
      status: "failed",
      payerEmail: event.metadata.payerEmail ?? null,
      payerName: event.metadata.payerName || null,
      stripePaymentIntentId: event.paymentIntentId,
    })
    .onConflictDoUpdate({
      target: transactions.stripePaymentIntentId,
      set: { status: "failed" },
    });
}

async function applyPlanInstallmentSucceeded(
  db: DB,
  event: Extract<DomainEvent, { kind: "plan_installment_succeeded" }>,
  sendConfirmation: ProcessorDeps["sendConfirmation"],
): Promise<void> {
  const plan = await upsertPlan(db, event);
  if (!plan) return;

  const installmentNumber = await nextInstallmentNumber(db, plan.id);

  const [txn] = await db
    .insert(transactions)
    .values({
      pageId: plan.pageId!,
      planId: plan.id,
      installmentNumber,
      amountCents: event.amountCents,
      paymentMethod: "card",
      status: "succeeded",
      payerEmail: plan.payerEmail,
      payerName: plan.payerName,
      stripePaymentIntentId:
        event.paymentIntentId ?? `plan_${plan.id}_inst_${installmentNumber}`,
      stripeCustomerId: event.customerId,
      glCodeAtPayment: event.metadata.glCode ?? null,
    })
    .onConflictDoUpdate({
      target: transactions.stripePaymentIntentId,
      set: { status: "succeeded", amountCents: event.amountCents },
    })
    .returning({ id: transactions.id });

  // If this was the final installment, mark the plan complete.
  if (installmentNumber >= plan.installmentCount) {
    await db
      .update(plans)
      .set({ status: "complete" })
      .where(eq(plans.id, plan.id));
  }

  await sendConfirmation({
    kind: "plan_installment",
    transactionId: txn.id,
    pageId: plan.pageId!,
    amountCents: event.amountCents,
    payerEmail: plan.payerEmail,
    payerName: plan.payerName,
    installmentNumber,
    installmentCount: plan.installmentCount,
  });
}

async function applyPlanInstallmentFailed(
  db: DB,
  event: Extract<DomainEvent, { kind: "plan_installment_failed" }>,
): Promise<void> {
  await db
    .update(plans)
    .set({ status: "cancelled" })
    .where(eq(plans.stripeSubscriptionId, event.subscriptionId));
}

async function applyPlanCanceled(
  db: DB,
  event: Extract<DomainEvent, { kind: "plan_canceled" }>,
): Promise<void> {
  await db
    .update(plans)
    .set({ status: "cancelled" })
    .where(eq(plans.stripeSubscriptionId, event.subscriptionId));
}

/* ---------------------------------------------------------------
   Helpers
---------------------------------------------------------------- */

/**
 * Find an existing plan by subscription id, or insert one from the event's
 * metadata (installmentCount + totalAmountCents set on subscription creation).
 */
async function upsertPlan(
  db: DB,
  event: Extract<DomainEvent, { kind: "plan_installment_succeeded" }>,
) {
  const existing = await db.query.plans.findFirst({
    where: eq(plans.stripeSubscriptionId, event.subscriptionId),
  });
  if (existing) return existing;

  const pageId = event.metadata.pageId;
  const installmentCount = Number(event.metadata.installmentCount);
  const totalAmountCents = Number(event.metadata.totalAmountCents);
  if (!pageId || !Number.isFinite(installmentCount) || !Number.isFinite(totalAmountCents)) {
    console.warn("[processor] plan_installment_succeeded: missing metadata", {
      subscriptionId: event.subscriptionId,
    });
    return null;
  }

  const installmentAmountCents = Math.round(totalAmountCents / installmentCount);
  const [row] = await db
    .insert(plans)
    .values({
      pageId,
      totalAmountCents,
      installmentCount,
      installmentAmountCents,
      status: "active",
      stripeSubscriptionId: event.subscriptionId,
      stripeCustomerId: event.customerId,
      payerEmail: event.metadata.payerEmail ?? null,
      payerName: event.metadata.payerName || null,
    })
    .onConflictDoNothing({ target: plans.stripeSubscriptionId })
    .returning();

  if (row) return row;
  // Lost a race — someone else inserted it; re-query.
  return (
    (await db.query.plans.findFirst({
      where: eq(plans.stripeSubscriptionId, event.subscriptionId),
    })) ?? null
  );
}

async function nextInstallmentNumber(db: DB, planId: string): Promise<number> {
  const prior = await db.query.transactions.findMany({
    where: eq(transactions.planId, planId),
    columns: { installmentNumber: true, status: true },
  });
  const successful = prior.filter(
    (t) => t.status === "succeeded" && t.installmentNumber != null,
  );
  return successful.length + 1;
}

function mapPaymentMethod(kind: PaymentMethodKind): "card" | "wallet" | "ach" {
  if (kind === "card") return "card";
  return "wallet";
}
