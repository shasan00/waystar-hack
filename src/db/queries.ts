import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db } from "./client";
import { bills, customFields, paymentPages, transactions } from "./schema";
import type { PaymentPageConfig, AmountMode, FieldType } from "@/lib/demo-data";

/**
 * Fetches a public payment page by slug, joining its org and custom fields.
 * Returns `null` if the page is missing or disabled.
 *
 * Shape-adapts the DB row into `PaymentPageConfig` so the existing
 * `/pay/[slug]` UI + payment-form components keep working unchanged.
 */
export async function getPaymentPageBySlug(
  slug: string,
): Promise<PaymentPageConfig | null> {
  const page = await db.query.paymentPages.findFirst({
    where: eq(paymentPages.slug, slug),
    with: {
      fields: true,
      org: true,
    },
  });

  if (!page || !page.isActive) return null;

  return {
    slug: page.slug,
    orgName: page.org.name,
    orgTagline: undefined,
    brandColor: page.brandColor,
    title: page.title,
    subtitle: page.subtitle ?? "",
    amountMode: page.amountMode as AmountMode,
    fixedAmount: page.fixedAmountCents ?? undefined,
    minAmount: page.minAmountCents ?? undefined,
    maxAmount: page.maxAmountCents ?? undefined,
    glCode: page.glCodes[0] ?? "",
    allowPlans: page.allowPlans,
    planInstallments:
      page.planInstallmentOptions.length > 0
        ? page.planInstallmentOptions
        : undefined,
    headerMessage: page.headerMessage ?? undefined,
    footerMessage: page.footerMessage ?? undefined,
    fields: [...page.fields]
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((f) => ({
        id: String(f.id),
        label: f.label,
        type: f.type as FieldType,
        required: f.required,
        helper: f.helperText ?? undefined,
        options: (f.options as string[] | null) ?? undefined,
        placeholder: f.placeholder ?? undefined,
      })),
  };
}

/**
 * Admin list view — all pages for the given org, newest first.
 * Returns the raw row shape; the caller (admin UI) formats as needed.
 */
export async function listAdminPages(orgId: string) {
  return db
    .select({
      id: paymentPages.id,
      slug: paymentPages.slug,
      title: paymentPages.title,
      amountMode: paymentPages.amountMode,
      fixedAmountCents: paymentPages.fixedAmountCents,
      minAmountCents: paymentPages.minAmountCents,
      maxAmountCents: paymentPages.maxAmountCents,
      isActive: paymentPages.isActive,
      createdAt: paymentPages.createdAt,
    })
    .from(paymentPages)
    .where(eq(paymentPages.orgId, orgId))
    .orderBy(desc(paymentPages.createdAt));
}

/**
 * Admin detail view — full row + ordered custom fields.
 * Returns null if the page doesn't belong to the caller's org.
 */
export async function getAdminPageById(pageId: string, orgId: string) {
  const page = await db.query.paymentPages.findFirst({
    where: eq(paymentPages.id, pageId),
    with: { fields: true, org: true },
  });
  if (!page || page.orgId !== orgId) return null;
  return {
    ...page,
    fields: [...page.fields].sort((a, b) => a.displayOrder - b.displayOrder),
  };
}

export async function listCustomFields(pageId: string) {
  return db
    .select()
    .from(customFields)
    .where(eq(customFields.pageId, pageId))
    .orderBy(customFields.displayOrder);
}

/**
 * Portal dashboard — outstanding bills for this patient, joined to the page
 * so the UI can show provider name + slug for the Pay button.
 */
export async function getOutstandingBillsForPatient(patientId: string) {
  return db
    .select({
      id: bills.id,
      amountCents: bills.amountCents,
      description: bills.description,
      dueDate: bills.dueDate,
      slug: paymentPages.slug,
      provider: paymentPages.title,
      allowPlans: paymentPages.allowPlans,
    })
    .from(bills)
    .innerJoin(paymentPages, eq(bills.pageId, paymentPages.id))
    .where(
      and(eq(bills.patientId, patientId), eq(bills.status, "outstanding")),
    )
    .orderBy(desc(bills.createdAt));
}

/**
 * Portal dashboard — recent successful payments for this patient.
 */
export async function getRecentTransactionsForPatient(
  patientId: string,
  limit = 5,
) {
  return db
    .select({
      id: transactions.id,
      amountCents: transactions.amountCents,
      createdAt: transactions.createdAt,
      provider: paymentPages.title,
    })
    .from(transactions)
    .innerJoin(paymentPages, eq(transactions.pageId, paymentPages.id))
    .where(
      and(
        eq(transactions.patientId, patientId),
        eq(transactions.status, "succeeded"),
      ),
    )
    .orderBy(desc(transactions.createdAt))
    .limit(limit);
}
