import { describe, it, expect } from "vitest";
import { evaluate, type PricingPageConfig } from "./policy";

function page(overrides: Partial<PricingPageConfig> = {}): PricingPageConfig {
  return {
    amountMode: "fixed",
    fixedAmountCents: 5000,
    minAmountCents: null,
    maxAmountCents: null,
    allowPlans: false,
    planInstallmentOptions: [],
    ...overrides,
  };
}

describe("evaluate — input validation", () => {
  it("rejects non-integer cents", () => {
    const r = evaluate({ page: page({ amountMode: "open" }), requestedAmountCents: 12.5 });
    expect(r.valid).toBe(false);
  });

  it("rejects zero", () => {
    const r = evaluate({ page: page({ amountMode: "open" }), requestedAmountCents: 0 });
    expect(r.valid).toBe(false);
  });

  it("rejects negative amounts", () => {
    const r = evaluate({ page: page({ amountMode: "open" }), requestedAmountCents: -100 });
    expect(r.valid).toBe(false);
  });
});

describe("evaluate — fixed mode", () => {
  it("accepts the exact fixed amount", () => {
    const r = evaluate({ page: page(), requestedAmountCents: 5000 });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.normalizedAmountCents).toBe(5000);
  });

  it("rejects any other amount", () => {
    const r = evaluate({ page: page(), requestedAmountCents: 4999 });
    expect(r.valid).toBe(false);
  });

  it("flags misconfiguration when fixedAmount is null", () => {
    const r = evaluate({
      page: page({ fixedAmountCents: null }),
      requestedAmountCents: 5000,
    });
    expect(r.valid).toBe(false);
  });
});

describe("evaluate — range mode", () => {
  const p = page({
    amountMode: "range",
    fixedAmountCents: null,
    minAmountCents: 1000,
    maxAmountCents: 10000,
  });

  it("accepts at the lower boundary", () => {
    const r = evaluate({ page: p, requestedAmountCents: 1000 });
    expect(r.valid).toBe(true);
  });

  it("accepts at the upper boundary", () => {
    const r = evaluate({ page: p, requestedAmountCents: 10000 });
    expect(r.valid).toBe(true);
  });

  it("rejects below min", () => {
    const r = evaluate({ page: p, requestedAmountCents: 999 });
    expect(r.valid).toBe(false);
  });

  it("rejects above max", () => {
    const r = evaluate({ page: p, requestedAmountCents: 10001 });
    expect(r.valid).toBe(false);
  });

  it("flags misconfiguration when min > max", () => {
    const r = evaluate({
      page: page({
        amountMode: "range",
        fixedAmountCents: null,
        minAmountCents: 500,
        maxAmountCents: 100,
      }),
      requestedAmountCents: 300,
    });
    expect(r.valid).toBe(false);
  });

  it("flags misconfiguration when bounds are null", () => {
    const r = evaluate({
      page: page({ amountMode: "range", fixedAmountCents: null }),
      requestedAmountCents: 500,
    });
    expect(r.valid).toBe(false);
  });
});

describe("evaluate — open mode", () => {
  const p = page({ amountMode: "open", fixedAmountCents: null });

  it("accepts any positive integer amount", () => {
    expect(evaluate({ page: p, requestedAmountCents: 1 }).valid).toBe(true);
    expect(evaluate({ page: p, requestedAmountCents: 123456 }).valid).toBe(true);
  });
});

describe("evaluate — plan options", () => {
  const base = page({
    amountMode: "open",
    fixedAmountCents: null,
    allowPlans: true,
    planInstallmentOptions: [2, 3, 4, 6],
  });

  it("returns empty options when plans are disabled", () => {
    const r = evaluate({
      page: { ...base, allowPlans: false },
      requestedAmountCents: 1200,
    });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.planOptions).toEqual([]);
  });

  it("returns configured installment counts that divide the amount evenly", () => {
    const r = evaluate({ page: base, requestedAmountCents: 1200 });
    expect(r.valid).toBe(true);
    // 1200 / 2, 3, 4, 6 all divide evenly
    if (r.valid) expect(r.planOptions).toEqual([2, 3, 4, 6]);
  });

  it("drops installment counts that don't divide evenly", () => {
    // 1000 / 3 = 333.33… → drop 3 and 6
    const r = evaluate({ page: base, requestedAmountCents: 1000 });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.planOptions).toEqual([2, 4]);
  });

  it("drops installment counts < 2", () => {
    const r = evaluate({
      page: { ...base, planInstallmentOptions: [1, 2, 3] },
      requestedAmountCents: 600,
    });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.planOptions).toEqual([2, 3]);
  });

  it("returns empty options when no configured count divides evenly", () => {
    const r = evaluate({
      page: { ...base, planInstallmentOptions: [7] },
      requestedAmountCents: 1000,
    });
    expect(r.valid).toBe(true);
    if (r.valid) expect(r.planOptions).toEqual([]);
  });
});
