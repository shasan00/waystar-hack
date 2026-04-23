/**
 * Pricing & Plan Policy — pure validation layer.
 *
 * Single source of truth for:
 *   - is the requested amount valid under this page's amount mode?
 *   - what plan options (installment counts) are offered for this amount?
 *
 * Consumed by the public payment page UI and the payment-intent/plan API routes.
 */

export type AmountMode = "fixed" | "range" | "open";

export interface PricingPageConfig {
  amountMode: AmountMode;
  fixedAmountCents: number | null;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  allowPlans: boolean;
  planInstallmentOptions: number[];
}

export interface EvaluateInput {
  page: PricingPageConfig;
  requestedAmountCents: number;
}

export type EvaluateResult =
  | {
      valid: true;
      normalizedAmountCents: number;
      planOptions: number[];
    }
  | {
      valid: false;
      error: string;
    };

/**
 * Installment counts must be >= 2 (otherwise it isn't a plan) and the per-
 * installment amount must be a positive whole-cent integer. We don't allow
 * fractional cents — drop any count that doesn't divide evenly.
 */
function qualifyingPlanOptions(
  amountCents: number,
  allowPlans: boolean,
  options: number[],
): number[] {
  if (!allowPlans) return [];
  return options
    .filter((n) => Number.isInteger(n) && n >= 2)
    .filter((n) => amountCents % n === 0);
}

export function evaluate({ page, requestedAmountCents }: EvaluateInput): EvaluateResult {
  if (!Number.isInteger(requestedAmountCents)) {
    return { valid: false, error: "Amount must be a whole number of cents." };
  }
  if (requestedAmountCents <= 0) {
    return { valid: false, error: "Amount must be greater than zero." };
  }

  switch (page.amountMode) {
    case "fixed": {
      if (page.fixedAmountCents == null) {
        return { valid: false, error: "Page is misconfigured: fixed amount not set." };
      }
      if (requestedAmountCents !== page.fixedAmountCents) {
        return {
          valid: false,
          error: `This page charges a fixed amount of ${page.fixedAmountCents} cents.`,
        };
      }
      break;
    }
    case "range": {
      const { minAmountCents: min, maxAmountCents: max } = page;
      if (min == null || max == null) {
        return { valid: false, error: "Page is misconfigured: range bounds not set." };
      }
      if (min > max) {
        return { valid: false, error: "Page is misconfigured: min exceeds max." };
      }
      if (requestedAmountCents < min) {
        return { valid: false, error: `Amount must be at least ${min} cents.` };
      }
      if (requestedAmountCents > max) {
        return { valid: false, error: `Amount must be no more than ${max} cents.` };
      }
      break;
    }
    case "open":
      break;
    default: {
      const _exhaustive: never = page.amountMode;
      return { valid: false, error: `Unknown amount mode: ${_exhaustive}` };
    }
  }

  return {
    valid: true,
    normalizedAmountCents: requestedAmountCents,
    planOptions: qualifyingPlanOptions(
      requestedAmountCents,
      page.allowPlans,
      page.planInstallmentOptions,
    ),
  };
}
