import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import {
  customFields,
  fieldResponses,
  paymentPages,
  transactions,
  organizations,
} from "@/db/schema";
import { renderConfirmationEmail, type FieldResponseView } from "./render";
import { sendEmail, type SendResult } from "./send";

/**
 * Load a transaction + its page + its field responses, render the email, and
 * send it via the Resend adapter. Called from the webhook processor after a
 * successful `payment_succeeded` or `plan_installment_succeeded` event.
 *
 * Returns a `SendResult`. On failure, logs but never throws — the processor
 * must not re-queue on email failure (Stripe would retry the webhook and
 * double-charge state).
 */
export async function sendConfirmationForTransaction(
  transactionId: string,
): Promise<SendResult> {
  const txn = await db.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
  });
  if (!txn) {
    return { ok: false, error: `transaction ${transactionId} not found` };
  }
  if (!txn.payerEmail) {
    return { ok: false, error: "transaction has no payer_email" };
  }
  const page = await db.query.paymentPages.findFirst({
    where: eq(paymentPages.id, txn.pageId),
  });
  if (!page) {
    return { ok: false, error: `page ${txn.pageId} not found` };
  }
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, page.orgId),
  });

  // Join field responses with their custom-field labels.
  const responses: FieldResponseView[] = [];
  const rawResponses = await db
    .select({
      value: fieldResponses.value,
      label: customFields.label,
    })
    .from(fieldResponses)
    .innerJoin(customFields, eq(fieldResponses.fieldId, customFields.id))
    .where(eq(fieldResponses.transactionId, transactionId));
  for (const r of rawResponses) {
    responses.push({ label: r.label, value: r.value ?? "" });
  }

  const rendered = renderConfirmationEmail({
    payerName: txn.payerName,
    payerEmail: txn.payerEmail,
    amountCents: txn.amountCents,
    transactionId: txn.id,
    createdAt: txn.createdAt,
    orgName: org?.name ?? "your provider",
    pageTitle: page.title,
    pageSlug: page.slug,
    emailTemplateBody: page.emailTemplateBody,
    fieldResponses: responses,
  });

  const result = await sendEmail({ to: txn.payerEmail, email: rendered });
  if (!result.ok) {
    console.error("[email] send failed", {
      transactionId,
      error: result.error,
    });
  }
  return result;
}
