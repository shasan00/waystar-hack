import { describe, it, expect } from "vitest";
import { renderConfirmationEmail, type EmailViewModel } from "./render";

function vm(overrides: Partial<EmailViewModel> = {}): EmailViewModel {
  return {
    payerName: "Jane Doe",
    payerEmail: "jane@example.com",
    amountCents: 8470,
    transactionId: "txn_01HXYZ",
    createdAt: new Date("2026-04-23T14:02:00Z"),
    orgName: "Memorial Health",
    pageTitle: "Settle your visit balance",
    pageSlug: "memorial-health-mar-12",
    emailTemplateBody: null,
    fieldResponses: [],
    ...overrides,
  };
}

describe("renderConfirmationEmail", () => {
  it("renders the default template when no override is set", () => {
    const r = renderConfirmationEmail(vm());
    expect(r.subject).toBe("Payment receipt — Settle your visit balance");
    expect(r.text).toContain("Thank you");
    expect(r.text).toContain("Hi Jane Doe");
    expect(r.html).toContain("<!doctype html>");
  });

  it("uses the page's emailTemplateBody override verbatim (with substitution)", () => {
    const body = "Custom thanks, {{payer_name}}. You paid {{amount}}.";
    const r = renderConfirmationEmail(vm({ emailTemplateBody: body }));
    expect(r.text).toContain("Custom thanks, Jane Doe. You paid $84.70.");
    expect(r.text).not.toContain("Thank you — we received your payment");
  });

  it("substitutes all documented variables", () => {
    const body =
      "{{payer_name}} | {{amount}} | {{transaction_id}} | {{date}} | {{org_name}} | {{page_title}}";
    const r = renderConfirmationEmail(vm({ emailTemplateBody: body }));
    expect(r.text).toContain("Jane Doe");
    expect(r.text).toContain("$84.70");
    expect(r.text).toContain("txn_01HXYZ");
    expect(r.text).toMatch(/Apr 23, 2026/);
    expect(r.text).toContain("Memorial Health");
    expect(r.text).toContain("Settle your visit balance");
  });

  it("falls back to 'there' when payerName is null", () => {
    const r = renderConfirmationEmail(vm({ payerName: null }));
    expect(r.text).toContain("Hi there");
    expect(() => renderConfirmationEmail(vm({ payerName: null }))).not.toThrow();
  });

  it("renders custom field responses in both text and html", () => {
    const r = renderConfirmationEmail(
      vm({
        fieldResponses: [
          { label: "Student Name", value: "Jane Doe" },
          { label: "Class Date", value: "2026-04-30" },
        ],
      }),
    );
    expect(r.text).toContain("Student Name: Jane Doe");
    expect(r.text).toContain("Class Date: 2026-04-30");
    expect(r.html).toContain("Student Name");
    expect(r.html).toContain("Class Date");
  });

  it("HTML-escapes user-controlled content", () => {
    const r = renderConfirmationEmail(
      vm({
        fieldResponses: [
          { label: "<script>", value: '"><img onerror=alert(1)>' },
        ],
      }),
    );
    // Dangerous characters must be escaped in HTML output.
    expect(r.html).not.toMatch(/<script>/);
    expect(r.html).not.toMatch(/onerror=alert/);
    expect(r.html).toContain("&lt;script&gt;");
    expect(r.html).toContain("&quot;");
    // Plain text preserves raw text (no escaping needed).
    expect(r.text).toContain("<script>");
  });
});
