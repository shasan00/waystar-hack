import { describe, it, expect, beforeEach, vi } from "vitest";
import type Stripe from "stripe";
import type { DomainEvent } from "@/lib/stripe/gateway";
import {
  processWebhookEvent,
  type ProcessorDeps,
  type SendConfirmationArgs,
} from "./processor";

/**
 * Tests use a hand-rolled fake that models just enough Drizzle surface for
 * the processor to run. The goal is to assert observable behavior: what rows
 * got written, what state transitions happened, and whether the email seam
 * was invoked. Any real DB wiring is left for integration manual checks.
 */

type TxnRow = {
  id: string;
  pageId: string;
  stripePaymentIntentId: string;
  status: "pending" | "succeeded" | "failed" | "refunded";
  amountCents: number;
  planId: string | null;
  installmentNumber: number | null;
  payerEmail: string | null;
  payerName: string | null;
};

type PlanRow = {
  id: string;
  pageId: string;
  totalAmountCents: number;
  installmentCount: number;
  installmentAmountCents: number;
  status: "active" | "complete" | "cancelled";
  stripeSubscriptionId: string;
  payerEmail: string | null;
  payerName: string | null;
};

type WebhookEventRow = {
  id: string;
  stripeEventId: string;
  eventType: string;
};

interface Store {
  webhookEvents: WebhookEventRow[];
  transactions: TxnRow[];
  plans: PlanRow[];
  page: { id: string; glCodes: string[] } | null;
}

function makeFakeDb(store: Store): {
  db: ProcessorDeps["db"];
  uuidCounter: { n: number };
} {
  const uuidCounter = { n: 0 };
  const nextId = (prefix: string) => `${prefix}_${++uuidCounter.n}`;

  // A mini chain-builder that matches the Drizzle call shapes the processor uses.
  const insert = (table: string) => ({
    values: (vals: Record<string, unknown> | Record<string, unknown>[]) => {
      const value = Array.isArray(vals) ? vals[0] : vals;
      const chain = {
        onConflictDoNothing: (_opts: unknown) => ({
          returning: async (_cols?: unknown) => {
            const row = applyInsert(store, table, value, nextId, {
              onConflict: "nothing",
            });
            return row ? [row] : [];
          },
        }),
        onConflictDoUpdate: (opts: { set: Record<string, unknown> }) => {
          // Apply eagerly so the no-returning form works when awaited.
          const row = applyInsert(store, table, value, nextId, {
            onConflict: "update",
            set: opts.set,
          });
          const chain = {
            returning: async (_cols?: unknown) => (row ? [row] : []),
            then: (resolve: (v: unknown) => void) => resolve(undefined),
          };
          return chain;
        },
        returning: async () => {
          const row = applyInsert(store, table, value, nextId, {
            onConflict: "error",
          });
          return row ? [row] : [];
        },
      };
      return chain;
    },
  });

  const update = (table: string) => ({
    set: (patch: Record<string, unknown>) => ({
      where: async (pred: (row: Record<string, unknown>) => boolean) => {
        const rows = getTable(store, table);
        for (const r of rows) {
          if (pred(r as unknown as Record<string, unknown>)) Object.assign(r, patch);
        }
      },
    }),
  });

  const queryProxy = {
    webhookEvents: {
      findFirst: async (_opts: unknown) => null,
    },
    paymentPages: {
      findFirst: async (_opts: unknown) => store.page,
    },
    plans: {
      findFirst: async (opts: { where: (r: PlanRow) => boolean }) => {
        return store.plans.find((p) => opts.where(p)) ?? null;
      },
    },
    transactions: {
      findMany: async (opts: {
        where: (r: TxnRow) => boolean;
        columns?: unknown;
      }) => store.transactions.filter((t) => opts.where(t)),
    },
  };

  const db = {
    insert: (table: unknown) => insert(tableName(table)),
    update: (table: unknown) => update(tableName(table)),
    query: queryProxy,
  } as unknown as ProcessorDeps["db"];

  return { db, uuidCounter };
}

// Our fake tables carry a __name__ that the real Drizzle table objects don't.
// The real processor passes schema table objects to db.insert(...); our fake
// only needs to route by symbolic name, so we read a symbol we attach.
function tableName(table: unknown): string {
  if (typeof table === "object" && table !== null && "__name__" in table) {
    return String((table as { __name__: string }).__name__);
  }
  return "unknown";
}

// The processor imports real schema tables with equality comparisons like
// `eq(plans.stripeSubscriptionId, x)`. drizzle-orm's `eq` returns an SQL node,
// not a predicate function. For the fake, we monkey-patch the schema table
// imports via proxy below.
function getTable(store: Store, table: string): Record<string, unknown>[] {
  if (table === "transactions") return store.transactions as unknown as Record<string, unknown>[];
  if (table === "plans") return store.plans as unknown as Record<string, unknown>[];
  if (table === "webhook_events") return store.webhookEvents as unknown as Record<string, unknown>[];
  return [];
}

function applyInsert(
  store: Store,
  table: string,
  value: Record<string, unknown>,
  nextId: (p: string) => string,
  conflict: {
    onConflict: "nothing" | "update" | "error";
    set?: Record<string, unknown>;
  },
): Record<string, unknown> | null {
  if (table === "webhook_events") {
    const existing = store.webhookEvents.find(
      (w) => w.stripeEventId === value.stripeEventId,
    );
    if (existing) return conflict.onConflict === "nothing" ? null : existing;
    const row: WebhookEventRow = {
      id: nextId("we"),
      stripeEventId: String(value.stripeEventId),
      eventType: String(value.eventType),
    };
    store.webhookEvents.push(row);
    return row as unknown as Record<string, unknown>;
  }

  if (table === "transactions") {
    const pi = String(value.stripePaymentIntentId);
    const existing = store.transactions.find(
      (t) => t.stripePaymentIntentId === pi,
    );
    if (existing) {
      if (conflict.onConflict === "update" && conflict.set) {
        Object.assign(existing, conflict.set);
      }
      return existing as unknown as Record<string, unknown>;
    }
    const row: TxnRow = {
      id: nextId("txn"),
      pageId: String(value.pageId),
      stripePaymentIntentId: pi,
      status: (value.status as TxnRow["status"]) ?? "pending",
      amountCents: Number(value.amountCents ?? 0),
      planId: (value.planId as string | null) ?? null,
      installmentNumber:
        (value.installmentNumber as number | null | undefined) ?? null,
      payerEmail: (value.payerEmail as string | null) ?? null,
      payerName: (value.payerName as string | null) ?? null,
    };
    store.transactions.push(row);
    return row as unknown as Record<string, unknown>;
  }

  if (table === "plans") {
    const sub = value.stripeSubscriptionId as string | undefined;
    if (sub) {
      const existing = store.plans.find((p) => p.stripeSubscriptionId === sub);
      if (existing) return conflict.onConflict === "nothing" ? null : existing;
    }
    const row: PlanRow = {
      id: nextId("plan"),
      pageId: String(value.pageId),
      totalAmountCents: Number(value.totalAmountCents),
      installmentCount: Number(value.installmentCount),
      installmentAmountCents: Number(value.installmentAmountCents),
      status: (value.status as PlanRow["status"]) ?? "active",
      stripeSubscriptionId: String(value.stripeSubscriptionId ?? ""),
      payerEmail: (value.payerEmail as string | null) ?? null,
      payerName: (value.payerName as string | null) ?? null,
    };
    store.plans.push(row);
    return row as unknown as Record<string, unknown>;
  }

  return null;
}

// Monkey-patch Drizzle schema tables with our __name__ symbol so the fake
// db can route. This runs before each test via module mock below.
vi.mock("@/db/schema", async () => {
  const actual = await vi.importActual<typeof import("@/db/schema")>("@/db/schema");
  // Attach __name__ to the exported table objects the processor uses.
  (actual.webhookEvents as unknown as { __name__: string }).__name__ =
    "webhook_events";
  (actual.transactions as unknown as { __name__: string }).__name__ =
    "transactions";
  (actual.plans as unknown as { __name__: string }).__name__ = "plans";
  (actual.paymentPages as unknown as { __name__: string }).__name__ =
    "payment_pages";
  return actual;
});

// drizzle-orm's `eq` returns an SQL node; we intercept it and return a
// predicate that reads the row shape the processor cares about.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<typeof import("drizzle-orm")>(
    "drizzle-orm",
  );
  return {
    ...actual,
    eq: (col: unknown, value: unknown) => {
      // `col` is a ColumnBaseConfig-shaped object; its .name is the DB column.
      const name =
        col && typeof col === "object" && "name" in col
          ? String((col as { name: string }).name)
          : "";
      // Map snake_case DB names to camelCase fields in our fake rows.
      const key = snakeToCamel(name);
      return ((row: Record<string, unknown>) => row[key] === value) as unknown;
    },
  };
});

function snakeToCamel(s: string): string {
  return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
}

function mockRawEvent(id: string, type: string): Stripe.Event {
  return {
    id,
    type,
    object: "event",
    api_version: null,
    created: 1_700_000_000,
    data: { object: {} as unknown as Stripe.PaymentIntent },
    livemode: false,
    pending_webhooks: 0,
    request: { id: null, idempotency_key: null },
  } as Stripe.Event;
}

function paymentSucceededEvent(
  id: string,
  piId: string,
  overrides: Partial<Extract<DomainEvent, { kind: "payment_succeeded" }>> = {},
): DomainEvent {
  return {
    kind: "payment_succeeded",
    stripeEventId: id,
    paymentIntentId: piId,
    amountCents: 5000,
    currency: "usd",
    customerId: null,
    paymentMethodKind: "card",
    metadata: {
      pageId: "page-abc",
      payerEmail: "jordan@example.com",
      payerName: "Jordan Rivera",
      glCode: "4201-PAT",
    },
    receivedAt: new Date(),
    ...overrides,
  };
}

describe("processWebhookEvent", () => {
  let store: Store;
  let deps: ProcessorDeps;
  let sendConfirmation: ProcessorDeps["sendConfirmation"] & { mock: { calls: unknown[][] } };

  beforeEach(() => {
    store = {
      webhookEvents: [],
      transactions: [],
      plans: [],
      page: { id: "page-abc", glCodes: ["4201-PAT"] },
    };
    const { db } = makeFakeDb(store);
    sendConfirmation = vi.fn<(args: SendConfirmationArgs) => Promise<void>>(
      async () => {},
    ) as unknown as typeof sendConfirmation;
    deps = { db, sendConfirmation };
  });

  it("ignored events are recorded but produce no state changes", async () => {
    await processWebhookEvent(
      {
        kind: "ignored",
        stripeEventId: "evt_1",
        eventType: "customer.created",
      },
      { rawEvent: mockRawEvent("evt_1", "customer.created") },
      deps,
    );
    expect(store.webhookEvents).toHaveLength(1);
    expect(store.transactions).toHaveLength(0);
    expect(sendConfirmation).not.toHaveBeenCalled();
  });

  it("payment_succeeded writes a transaction and triggers the email seam", async () => {
    await processWebhookEvent(
      paymentSucceededEvent("evt_1", "pi_100"),
      { rawEvent: mockRawEvent("evt_1", "payment_intent.succeeded") },
      deps,
    );
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({
      pageId: "page-abc",
      status: "succeeded",
      amountCents: 5000,
      payerEmail: "jordan@example.com",
    });
    expect(sendConfirmation).toHaveBeenCalledOnce();
    expect(sendConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "payment", amountCents: 5000 }),
    );
  });

  it("duplicate stripe_event_id is a no-op — transaction not re-applied", async () => {
    const evt = paymentSucceededEvent("evt_dup", "pi_dup");
    await processWebhookEvent(
      evt,
      { rawEvent: mockRawEvent("evt_dup", "payment_intent.succeeded") },
      deps,
    );
    await processWebhookEvent(
      evt,
      { rawEvent: mockRawEvent("evt_dup", "payment_intent.succeeded") },
      deps,
    );
    expect(store.webhookEvents).toHaveLength(1);
    expect(store.transactions).toHaveLength(1);
    expect(sendConfirmation).toHaveBeenCalledOnce();
  });

  it("payment_failed writes a failed transaction and does NOT email", async () => {
    await processWebhookEvent(
      {
        kind: "payment_failed",
        stripeEventId: "evt_f",
        paymentIntentId: "pi_f",
        failureMessage: "card declined",
        metadata: { pageId: "page-abc", payerEmail: "j@e.com" },
        receivedAt: new Date(),
      },
      { rawEvent: mockRawEvent("evt_f", "payment_intent.payment_failed") },
      deps,
    );
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0].status).toBe("failed");
    expect(sendConfirmation).not.toHaveBeenCalled();
  });

  it("plan_installment_succeeded on first installment creates plan + txn, plan stays active", async () => {
    await processWebhookEvent(
      {
        kind: "plan_installment_succeeded",
        stripeEventId: "evt_inv1",
        subscriptionId: "sub_1",
        invoiceId: "in_1",
        paymentIntentId: "pi_inst1",
        amountCents: 10000,
        customerId: "cus_1",
        metadata: {
          pageId: "page-abc",
          installmentCount: "3",
          totalAmountCents: "30000",
          payerEmail: "j@e.com",
          payerName: "Jordan",
          glCode: "4201-PAT",
        },
        receivedAt: new Date(),
      },
      { rawEvent: mockRawEvent("evt_inv1", "invoice.payment_succeeded") },
      deps,
    );
    expect(store.plans).toHaveLength(1);
    expect(store.plans[0].status).toBe("active");
    expect(store.transactions).toHaveLength(1);
    expect(store.transactions[0]).toMatchObject({
      planId: store.plans[0].id,
      installmentNumber: 1,
      amountCents: 10000,
      status: "succeeded",
    });
    expect(sendConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "plan_installment", installmentNumber: 1 }),
    );
  });

  it("plan_installment_succeeded on final installment flips plan to complete", async () => {
    const baseMeta = {
      pageId: "page-abc",
      installmentCount: "2",
      totalAmountCents: "20000",
      payerEmail: "j@e.com",
      payerName: "Jordan",
    };
    const evt = (id: string, pi: string) => ({
      kind: "plan_installment_succeeded" as const,
      stripeEventId: id,
      subscriptionId: "sub_final",
      invoiceId: "in_" + id,
      paymentIntentId: pi,
      amountCents: 10000,
      customerId: "cus_f",
      metadata: baseMeta,
      receivedAt: new Date(),
    });

    await processWebhookEvent(
      evt("evt_a", "pi_a"),
      { rawEvent: mockRawEvent("evt_a", "invoice.payment_succeeded") },
      deps,
    );
    await processWebhookEvent(
      evt("evt_b", "pi_b"),
      { rawEvent: mockRawEvent("evt_b", "invoice.payment_succeeded") },
      deps,
    );

    expect(store.plans[0].status).toBe("complete");
    expect(store.transactions).toHaveLength(2);
    expect(store.transactions[1].installmentNumber).toBe(2);
  });

  it("plan_installment_failed marks plan cancelled", async () => {
    store.plans.push({
      id: "plan_X",
      pageId: "page-abc",
      totalAmountCents: 30000,
      installmentCount: 3,
      installmentAmountCents: 10000,
      status: "active",
      stripeSubscriptionId: "sub_fail",
      payerEmail: null,
      payerName: null,
    });
    await processWebhookEvent(
      {
        kind: "plan_installment_failed",
        stripeEventId: "evt_fail",
        subscriptionId: "sub_fail",
        invoiceId: "in_fail",
        receivedAt: new Date(),
      },
      { rawEvent: mockRawEvent("evt_fail", "invoice.payment_failed") },
      deps,
    );
    expect(store.plans[0].status).toBe("cancelled");
  });

  it("plan_canceled marks plan cancelled", async () => {
    store.plans.push({
      id: "plan_Y",
      pageId: "page-abc",
      totalAmountCents: 30000,
      installmentCount: 3,
      installmentAmountCents: 10000,
      status: "active",
      stripeSubscriptionId: "sub_cancel",
      payerEmail: null,
      payerName: null,
    });
    await processWebhookEvent(
      {
        kind: "plan_canceled",
        stripeEventId: "evt_cancel",
        subscriptionId: "sub_cancel",
        receivedAt: new Date(),
      },
      { rawEvent: mockRawEvent("evt_cancel", "customer.subscription.deleted") },
      deps,
    );
    expect(store.plans[0].status).toBe("cancelled");
  });
});
