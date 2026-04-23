import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./client";
import { paymentPages } from "./schema";
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
