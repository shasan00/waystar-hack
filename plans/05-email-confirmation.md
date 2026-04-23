# Slice 5 — Email Confirmation (Resend + React Email)

**Branch:** `email-confirmation` off `webhook-processor` (or off `main` after slice 1 merges)
**Owner:** unassigned
**Est:** ~45 min
**Blocked by:** **slice 1 (webhook processor)** — email fires from inside the processor, and there's no stable seam until the processor exists.

## Why

Guide §2.1.6: *"Confirmation emails must be sent automatically upon successful payment."* Dynamic variables required: payer name, amount paid, transaction ID, date, custom field values. Default template must exist as fallback. Currently nothing is installed or wired.

## Scope

1. **Email Rendering module** (`src/lib/email/render.ts`) — given `{ transaction, page, fieldResponses }`, returns `{ subject, html, text }`. Merges per-page overrides (`paymentPages.emailTemplateBody`) onto defaults.
2. **Send adapter** (`src/lib/email/send.ts`) — thin wrapper around Resend's `emails.send`. In dev / when `RESEND_API_KEY` missing, log to console instead of sending.
3. **Default templates** — React Email components in `src/emails/ConfirmationEmail.tsx` for success, and optionally `PlanInstallmentEmail.tsx` for installment receipts.
4. **Wire into processor** — at the end of `payment_succeeded` and `plan_installment_succeeded` branches, call `sendConfirmationEmail(txn, page)`.
5. **Template variable substitution** — support `{{payer_name}}`, `{{amount}}` (formatted USD), `{{transaction_id}}`, `{{date}}`, `{{org_name}}`, `{{page_title}}`. Seed data already uses this format (src/db/seed.ts:185).

## Files

- `src/lib/email/render.ts` (new)
- `src/lib/email/send.ts` (new)
- `src/lib/email/render.test.ts` (new)
- `src/emails/ConfirmationEmail.tsx` (new)
- `src/lib/webhooks/processor.ts` — add the send call at the right hook point (slice 1 leaves a seam).
- `package.json` — add `resend`, `react-email`, `@react-email/components`.

## Env

- `RESEND_API_KEY` — required in prod, optional in dev (fall back to console logging).
- `EMAIL_FROM` — e.g. `"Waystar QPP <receipts@<verified-domain>>"`. Domain must be verified in Resend before real sends work; for the hackathon use Resend's `onboarding@resend.dev` sandbox sender, which works without verification but only delivers to the account owner's email.

## Template merge rules

- `emailTemplateBody` on the page is a full body override. If present, use it verbatim with variable substitution.
- If absent, use the default React Email component.
- Subject is not on the page today (schema has `emailTemplateBody` only; PRD spec mentioned `emailSubject/Header/Footer` but those columns don't exist). Either (a) add them in a migration, or (b) hardcode subject as `Payment receipt — {{page_title}}`. Recommend (b) for hackathon speed.

## Tests (from PRD lines 178-179)

`render.test.ts`:
- Default template renders when no override is set.
- Override replaces the body when set.
- `{{payer_name}}`, `{{amount}}`, `{{transaction_id}}`, `{{date}}` appear in output.
- Missing `payer_name` (null) renders without throwing; falls back to something reasonable ("there" or just the email).
- Custom field responses render as `Label: value` pairs in both HTML and text outputs.
- User-controlled content (e.g. field response text) is HTML-escaped in the HTML output.

Target: 6 tests, no network, no DB.

## Done when

- `pnpm test` passes new render tests.
- Manual: trigger a test payment with `stripe trigger payment_intent.succeeded` (or a real card on `/pay/<slug>`) → see the send happen (console log in dev, real email in prod).
- `RESEND_API_KEY` absent → processor still succeeds; send is logged, not fatal.
- `pnpm exec tsc --noEmit` clean.

## Out of scope

- Plan final-installment "thank you" vs. per-installment "receipt" distinction. Single template for now, parameterize later.
- Attachments (PDF receipts). Not required by the guide.
- Email template editor UI in admin portal. The `emailTemplateBody` column is editable via slice 2's page editor.
