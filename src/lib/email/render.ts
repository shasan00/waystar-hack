/**
 * Render confirmation email content.
 *
 * Pure function: no I/O, no network, no DB. Takes a pre-assembled view model
 * and returns `{ subject, html, text }` ready to hand to the send adapter.
 *
 * Template precedence:
 *   1. `emailTemplateBody` on the page — used verbatim (with variable
 *      substitution) as the plain-text body. HTML is derived from it.
 *   2. Default template — opinionated but minimal.
 *
 * Subject is always `Payment receipt — {{page_title}}` (per plan decision).
 */

export type FieldResponseView = {
  label: string;
  value: string;
};

export type EmailViewModel = {
  payerName: string | null;
  payerEmail: string;
  amountCents: number;
  transactionId: string;
  createdAt: Date;
  orgName: string;
  pageTitle: string;
  pageSlug: string;
  emailTemplateBody: string | null;
  fieldResponses: FieldResponseView[];
};

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

const DEFAULT_TEMPLATE_BODY = `Hi {{payer_name}},

Thank you — we received your payment of {{amount}} on {{date}}.

Transaction ID: {{transaction_id}}

If you have any questions about this payment, reply to this email.

— {{org_name}}`;

function formatUsd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

function formatDate(d: Date): string {
  return d.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function substitute(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{([a-zA-Z_][a-zA-Z0-9_]*)\}\}/g, (_, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : "";
  });
}

function buildVars(vm: EmailViewModel): Record<string, string> {
  return {
    payer_name: vm.payerName?.trim() ? vm.payerName : "there",
    amount: formatUsd(vm.amountCents),
    transaction_id: vm.transactionId,
    date: formatDate(vm.createdAt),
    org_name: vm.orgName,
    page_title: vm.pageTitle,
  };
}

function textBody(vm: EmailViewModel): string {
  const vars = buildVars(vm);
  const base = vm.emailTemplateBody?.trim()
    ? vm.emailTemplateBody
    : DEFAULT_TEMPLATE_BODY;
  const rendered = substitute(base, vars);
  if (vm.fieldResponses.length === 0) return rendered;
  const responses = vm.fieldResponses
    .map((r) => `${r.label}: ${r.value}`)
    .join("\n");
  return `${rendered}\n\n---\n${responses}`;
}

function htmlBody(vm: EmailViewModel, text: string): string {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
    .map((p) => `<p style="margin:0 0 14px 0;">${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("\n");

  const responsesTable =
    vm.fieldResponses.length > 0
      ? `
<table role="presentation" cellspacing="0" cellpadding="0" style="margin:12px 0 0 0;border-collapse:collapse;">
  ${vm.fieldResponses
    .map(
      (r) => `
  <tr>
    <td style="padding:4px 12px 4px 0;color:#6B6B6B;font-size:12px;">${escapeHtml(r.label)}</td>
    <td style="padding:4px 0;color:#0A0A0A;font-size:13px;">${escapeHtml(r.value)}</td>
  </tr>`,
    )
    .join("")}
</table>`
      : "";

  return `<!doctype html>
<html>
  <body style="margin:0;padding:0;background:#FAFAF7;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0A0A0A;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
      <div style="font-size:11px;letter-spacing:0.14em;text-transform:uppercase;color:#6B6B6B;margin-bottom:8px;">
        ${escapeHtml(vm.orgName)}
      </div>
      <div style="font-size:24px;line-height:1.2;margin-bottom:24px;">
        Payment receipt — ${escapeHtml(vm.pageTitle)}
      </div>
      <div style="font-size:14px;line-height:1.55;color:#0A0A0A;">
        ${paragraphs}
      </div>
      ${responsesTable}
      <hr style="border:none;border-top:1px solid #E8E6E0;margin:28px 0 16px 0;">
      <div style="font-size:11px;color:#6B6B6B;">
        Transaction ID: <code style="font-family:ui-monospace,Menlo,monospace;">${escapeHtml(vm.transactionId)}</code>
      </div>
    </div>
  </body>
</html>`;
}

export function renderConfirmationEmail(vm: EmailViewModel): RenderedEmail {
  const text = textBody(vm);
  const html = htmlBody(vm, text);
  const subject = substitute("Payment receipt — {{page_title}}", buildVars(vm));
  return { subject, html, text };
}
