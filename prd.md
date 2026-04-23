## Problem Statement

Service providers (yoga studios, municipalities, utilities, non-profits, and healthcare-adjacent billers) need a way to collect online payments for recurring or one-off services without engaging engineering resources every time. Existing single-use checkout links are too short-lived, hard to brand, and don't support the long-lived, self-service billing experiences providers need. Administrators want to stand up a branded, accessible, shareable payment page in minutes — not weeks — and see reporting on who paid, how much, and for what GL code. End users (payers) want a fast, trustworthy payment experience that works on any device, respects accessibility needs, and — especially for larger balances — offers flexible payment options like installment plans.

## Solution

Quick Payment Pages (QPP): a hosted, full-stack web application where provider administrators log into an admin portal, configure reusable branded payment pages (amount modes, custom fields, GL codes, email templates, theming), and distribute those pages via unique URL, embeddable iframe, or QR code. End users land on the public page, fill in configured fields, and pay via Stripe (card + digital wallets). Successful payments trigger a branded confirmation email rendered with per-page template overrides. Admins view reporting with filters, summaries, GL/payment-method breakdowns, and CSV export. The product differentiator is **payment plans**: admins can enable monthly installments on qualifying pages, and Stripe Subscriptions handles scheduled charges with the webhook pipeline recording each installment as a transaction.

## Current Status (as of 2026-04-23)

**Legend:** ✓ done · ◐ partial (UI only, or stubbed, or backend only) · ✗ not started

**High-level:**
- ✓ Stack core installed (Next.js 16 + TS, Drizzle + pg, Better Auth, Stripe SDK)
- ✓ DB schema + migration for all core tables (`src/db/schema.ts`, `drizzle/0000_*.sql`)
- ✓ Stripe Payment Gateway module (`src/lib/stripe/gateway.ts`): `createPaymentIntent`, `createSubscriptionForPlan`, `verifyWebhookSignature`, `parseWebhookEvent`
- ✓ Webhook route with signature verify (`src/app/api/webhooks/stripe/route.ts`)
- ✓ Better Auth wired (`src/lib/auth.ts`, `/api/auth/[...all]`)
- ✓ Demo data for 2 demo pages (`src/lib/demo-data.ts`)
- ◐ Admin UI scaffolded but inputs read-only (no `onChange`, nothing persists)
- ◐ Public `/pay/[slug]` renders theme + fields, but payment form is a 900ms fake — no Payment Element
- ◐ Reports page mocks transactions; CSV button disabled
- ✗ Webhook Event Processor (stub — console.log, no idempotency, no DB writes)
- ✗ Email module (Resend + React Email not installed)
- ✗ Pricing & Plan Policy module (no pure validation layer)
- ✗ Reporting Query module (no real aggregates or CSV endpoint)
- ✗ Distribution helpers (copy URL, iframe snippet, QR — UI hooks exist, logic missing)
- ✗ UploadThing logo upload
- ✗ Drag-drop field reorder (`@dnd-kit/sortable` not installed)
- ✗ Auth middleware (admin routes unprotected)
- ✗ Vitest + tests for the three target modules

**Missing deps:** `@stripe/react-stripe-js`, `resend`, `react-email`, `uploadthing`, `react-hook-form`, `zod` (direct), `@dnd-kit/sortable`, `vitest`, `qrcode`

## User Stories

1. ◐ As a provider admin, I want to log into a secure admin portal, so that only authorized staff can configure payment pages. — *Better Auth + login UI in place; no middleware guards admin routes; `login-form.tsx` still routes on role, not real credential check.*
2. ◐ As a provider admin, I want to create a new payment page with a unique human-readable URL slug, so that I can share a memorable link with payers. — *UI route exists (`/admin/pages/new`); no POST endpoint, no slug-uniqueness check.*
3. ◐ As a provider admin, I want to edit the configuration of an existing payment page, so that I can update details without recreating it. — *Editor tabs render; inputs are read-only, no PATCH endpoint.*
4. ✗ As a provider admin, I want to enable or disable a payment page without deleting it, so that I can pause collection temporarily.
5. ◐ As a provider admin, I want to see a list of all my payment pages with status indicators, so that I can manage them at a glance. — *List renders from `DEMO_PAGES`.*
6. ✗ As a provider admin, I want to upload an organization logo to a payment page, so that payers recognize my brand. — *UploadThing not installed; drop zone is visual only.*
7. ◐ As a provider admin, I want to choose from five curated themes, so that every page is visually distinct while remaining WCAG-compliant. — *Theme rendering works on public page; selector UI not wired to persistence.*
8. ◐ As a provider admin, I want to set a page title, subtitle, header message, and footer message. — *Fields present in editor; don't save.*
9. ✗ As a provider admin, I want to preview the payment page in real time as I configure it.
10. ◐ As a provider admin, I want to configure a fixed payment amount per page. — *Schema + UI present; no save, no validation layer.*
11. ◐ As a provider admin, I want to configure a min/max payment range. — *Same as #10.*
12. ◐ As a provider admin, I want to configure a user-entered amount mode. — *Same as #10.*
13. ◐ As a provider admin, I want to add up to 10 custom input fields to a payment page. — *UI shows list; add/delete disabled; no endpoint.*
14. ◐ As a provider admin, I want each custom field to support text, number, dropdown, date, or checkbox types. — *Schema enum exists; UI editor disabled.*
15. ✗ As a provider admin, I want to mark custom fields as required or optional.
16. ✗ As a provider admin, I want to add placeholder and helper text to custom fields.
17. ✗ As a provider admin, I want to drag-and-drop custom fields to reorder them. — *`@dnd-kit/sortable` not installed; current UI is disabled up/down buttons.*
18. ◐ As a provider admin, I want to associate a GL code with each payment page. — *Schema + UI present; no save.*
19. ◐ As a provider admin, I want to define a custom confirmation email template (subject, header, footer) per payment page. — *UI present; no save, no send.*
20. ✗ As a provider admin, I want the system to fall back to a default email template. — *No email module.*
21. ✗ As a provider admin, I want confirmation emails to include dynamic variables.
22. ✗ As a provider admin, I want to copy a payment page's public URL with one click. — *`publicUrl` string is rendered; no clipboard handler wired.*
23. ✗ As a provider admin, I want to generate an embeddable iframe snippet for each payment page.
24. ✗ As a provider admin, I want to download a QR code (PNG or SVG). — *`qrcode` not installed.*
25. ◐ As a provider admin, I want to enable payment plans on a qualifying page. — *Checkbox exists; gateway module supports `createSubscriptionForPlan`; no save, no API route.*
26. ◐ As a provider admin, I want to set a minimum qualifying amount for payment plans. — *Schema + UI; no save.*
27. ◐ As a provider admin, I want to configure which installment counts are allowed. — *Schema + UI; no save.*
28. ◐ As a provider admin, I want to view a report of all transactions with filters. — *Reports page renders mock `TXNS` array; filter controls don't filter.*
29. ◐ As a provider admin, I want to see summary stats. — *Shown but computed from mock data.*
30. ◐ As a provider admin, I want to see a breakdown of revenue by GL code. — *Bar chart from mock data.*
31. ◐ As a provider admin, I want to see a breakdown of transactions by payment method. — *Mock data.*
32. ✗ As a provider admin, I want to export the current filtered report to CSV. — *Button disabled; no endpoint.*
33. ✓ As a payer, I want to land on a branded, themed payment page that clearly identifies the provider.
34. ✓ As a payer, I want the payment page to be responsive on mobile.
35. ◐ As a payer, I want form fields to have visible labels and error messages. — *Labels present; error messages partial (no validation layer).*
36. ✗ As a payer, I want to pay with a credit or debit card. — *Form is a placeholder with fake 900ms submit; no Stripe Payment Element.*
37. ✗ As a payer, I want to use a digital wallet. — *Requires Payment Element.*
38. ✗ As a payer, I want clear error messages when my card is declined or invalid. — *No real submission.*
39. ✓ As a payer, I want to see the total amount I will be charged before submitting.
40. ◐ As a payer on a page with plans enabled, I want to choose between paying in full or paying in monthly installments. — *UI exists; selection doesn't drive a real subscription yet.*
41. ✗ As a payer on an installment plan, I want the first installment charged immediately and subsequent installments charged automatically. — *Gateway supports it; no route calls it; webhook processor doesn't record installments.*
42. ✗ As a payer, I want to receive a confirmation email with transaction details after a successful payment. — *No Resend integration.*
43. ◐ As a payer using a screen reader, I want all form inputs, buttons, and error messages to be announced correctly. — *shadcn/Radix primitives provide baseline; no axe pass yet.*
44. ◐ As a payer using keyboard-only navigation, I want to Tab through the form. — *Baseline from shadcn; not audited.*
45. ◐ As a payer with color vision differences, I want information to be conveyed without relying solely on color. — *Curated themes help; not audited.*
46. ◐ As the system, I want to record every successful payment via Stripe webhook. — *Route receives events; processor doesn't write to DB.*
47. ✗ As the system, I want to process each Stripe webhook event idempotently. — *`webhookEvent` table exists; no insert on process.*
48. ✓ As the system, I want to verify Stripe webhook signatures.
49. ✗ As the system, I want to send confirmation emails via Resend only from the webhook handler.
50. ✓ As the system, I want to store Stripe payment intent IDs and subscription IDs on transactions and plans. — *Schema supports it; no writes yet.*
51. ✗ As a judge, I want to see a publicly hosted HTTPS URL, admin login credentials, two pre-configured demo pages, and at least one completed transaction. — *Not deployed; no real transaction recorded.*
52. ◐ As a judge, I want a README covering setup, environment variables, architecture, and schema. — *README exists; content not yet updated for QPP.*

## Implementation Decisions

### Stack

- **Framework:** Next.js 14 (App Router) + TypeScript — monolith collapsing frontend + backend in one codebase
- **Auth:** Better Auth (self-hosted, framework-agnostic tables)
- **Database:** PostgreSQL hosted on Railway
- **ORM:** Drizzle + drizzle-kit for migrations and studio
- **Payments:** Stripe Payment Element (embedded, branded, inherits WCAG compliance); Stripe Subscriptions (monthly, `cancel_at`) for payment plans
- **Email:** Resend + React Email for rendered templates
- **File storage:** UploadThing for logo uploads
- **UI:** shadcn/ui + Tailwind + Radix primitives; `@dnd-kit/sortable` for accessible drag-and-drop; `react-hook-form` + `zod` for forms
- **Deployment:** Railway via Dockerfile with `output: 'standalone'` for portability to AWS/Azure
- **QR codes:** `qrcode` npm package, client-side generation
- **CSV:** Server-side serialization of filtered report results

### Modules to build

- ✗ **Payment Page Config module** — CRUD for payment pages, slug uniqueness, amount-mode invariants, transactional custom-field reorder. Consumed by admin API routes and public page renderer.
- ✗ **Pricing & Plan Policy module** — Pure function layer. Input: page config + requested amount + plan selection. Output: `{ valid, normalizedAmountCents, planOptions }`. Single source of truth for amount validation used by public page UI and submission API.
- ✓ **Stripe Payment Gateway module** — Thin abstraction over the Stripe Node SDK. Methods: `createPaymentIntent`, `createSubscriptionForPlan`, `verifyWebhookSignature`, `parseWebhookEvent` (maps Stripe events to normalized domain events). *Implemented in `src/lib/stripe/gateway.ts`.*
- ◐ **Webhook Event Processor module** — Takes a normalized domain event and applies it idempotently using the `webhookEvent` table. Transitions transaction and plan state, triggers email rendering + send. *Stub at `src/lib/webhooks/processor.ts` — logs only.*
- ✗ **Email Rendering module** — Given transaction + page config, merges per-page template overrides with defaults, renders the React Email component to `{ subject, html, text }`. Does not send.
- ◐ **Theme module** — Maps theme enum to CSS variable bundle and derived `brandColor` hex. Consumed by public page, admin preview, and email rendering. *Tailwind/globals.css carry the base; theme enum not fully wired to CSS variables bundle.*
- ✗ **Reporting Query module** — Given filters, returns paginated transaction list, summary aggregates, GL breakdown, and payment-method breakdown. Powers both UI and CSV export.

### Thin integration layers (not modules)

Next.js route handlers, admin UI screens, public payment page, distribution helpers (URL/iframe/QR), UploadThing wiring, CSV serializer, Better Auth wiring, Resend send adapter.

### Schema (Drizzle, PostgreSQL)

- `paymentPage` — id, slug (unique), title, description, headerMessage, footerMessage, logoUrl, theme (enum: classic-blue, evergreen, sunset, midnight, slate), brandColor (hex, derived from theme), amountMode (fixed/range/user_entered), fixedAmount, minAmount, maxAmount (cents integers), glCode, emailSubject, emailHeader, emailFooter, paymentPlansEnabled, paymentPlanMinAmount, paymentPlanAllowedCounts (int[]), isActive, createdBy, createdAt, updatedAt
- `customField` — id, pageId (FK, cascade), label, fieldType (text/number/dropdown/date/checkbox), options (jsonb for dropdown), required, placeholder, helperText, displayOrder
- `transaction` — id, pageId (FK), amount (cents), paymentMethod (card/wallet_apple/wallet_google/wallet_link), status (pending/succeeded/failed), payerEmail, payerName, stripePaymentIntentId (unique), stripeCustomerId, glCode, paymentPlanId (FK nullable), createdAt
- `fieldResponse` — id, transactionId (FK, cascade), fieldId (FK), value
- `paymentPlan` — id, pageId (FK), stripeSubscriptionId (unique), stripeCustomerId, totalAmount, installmentAmount, installmentCount, interval (month-only), status (active/completed/canceled/failed), payerEmail, payerName, createdAt, updatedAt
- `webhookEvent` — id, stripeEventId (unique), eventType, processedAt, payload (jsonb)
- Better Auth tables (user, account, session, verification) auto-generated

### Key architectural decisions

- **All monetary amounts stored as integer cents.** No floats. No `numeric`.
- **Webhooks are the source of truth** for transaction state, not client-side callbacks. The `webhookEvent` table provides idempotency via unique constraint on `stripeEventId`.
- **Curated themes only** (no free-form color picker). Guarantees WCAG AA compliance without runtime contrast computation. `brandColor` hex is stored for doc-literal schema compliance but derived from the theme enum.
- **Single GL per page** (not many-to-many). Matches the doc's sample schema.
- **Single-tenant.** No organization scoping — all admins see all pages.
- **Payment plans via Stripe Subscriptions + `cancel_at`** (not self-hosted scheduler). Monthly only, fixed equal installments. Fake-mode fallback (first charge only, scheduled installments shown as "upcoming") if running behind at hour 5.
- **Shared contract types.** API request/response shapes defined as Zod schemas consumed by both client (via `react-hook-form` resolvers) and server (via route handler validation).

### API surface (high level, not exhaustive)

- ✗ Admin CRUD: `POST/GET/PATCH /api/admin/pages`, `POST/DELETE /api/admin/pages/:id/custom-fields`, reorder endpoint
- ✗ Public config read: `GET /api/public/pages/:slug` (returns safe subset)
- ✗ Payment init: `POST /api/public/pages/:slug/payment-intent`, `POST /api/public/pages/:slug/payment-plan`
- ◐ Webhook: `POST /api/webhooks/stripe` (raw body, signature-verified) — *route + signature verify done; handler body is a stub.*
- ✗ Reporting: `GET /api/admin/reports/transactions` (filters), `GET /api/admin/reports/summary`, `GET /api/admin/reports/export.csv`
- ✗ Uploads: UploadThing route handler for logos
- ✓ Auth: `/api/auth/[...all]` (Better Auth)
- ✓ Health: `/api/health`

### Scope commitments

- **Core:** all mandatory functional requirements from the guide
- **Stretches committed:** digital wallets (free via Payment Element), CSV export, GL + payment-method breakdowns
- **Differentiator:** payment plans (Tier 1: working Stripe Subscriptions; fake-mode fallback)
- **Cut:** ACH, i18n, dark mode, E2E tests, mobile wrapper, webhook refund handling, custom Luhn validation, free-form brand color picker, multi-GL per page, organization/multi-tenant

### Team & timeline

- 4 devs, ~7 hours
- Ownership split: Dev 1 (infra/auth/schema), Dev 2 (admin portal), Dev 3 (public page + payments + plans), Dev 4 (distribution/email/a11y)
- Checkpoints: schema freeze hour 1, API contract freeze hour 2, feature freeze hour 5, demo prep hour 6

## Testing Decisions

### What makes a good test

Tests should assert external, observable behavior of a module — given an input, what does the module return or persist? — rather than implementation details like which internal helper is called or how data is shaped mid-pipeline. Tests should be deterministic (no real network, no real DB where avoidable), fast, and readable as a specification of the module's contract. Prefer a small number of high-value tests over broad coverage given the 7-hour window.

### Modules targeted for tests

*Status: ✗ Vitest not installed; no test files exist.*

1. **Pricing & Plan Policy module** — Pure-function, easy to test exhaustively. Cases: fixed mode accepts exact amount only; range mode enforces min ≤ amount ≤ max; user-entered accepts any positive; plan options returned only when amount ≥ `paymentPlanMinAmount` and plans enabled; allowed counts returned as configured; disabled plans return empty options; zero/negative amounts rejected in every mode; boundary conditions (amount == min, amount == max).

2. **Webhook Event Processor module** — Correctness-critical. Cases: duplicate `stripeEventId` is a no-op (returns success without re-applying); `payment_intent.succeeded` records a transaction and triggers email render; `invoice.payment_succeeded` for a plan records a transaction with `paymentPlanId` set and advances plan progress; final installment transitions plan to `completed`; `invoice.payment_failed` marks plan as `failed`; `customer.subscription.deleted` marks plan as `canceled`. Stripe interactions mocked at the gateway boundary.

3. **Email Rendering module** — Template merging and variable substitution. Cases: default template renders when no overrides set; per-page overrides (subject/header/footer) replace defaults; dynamic variables (payer name, amount formatted as currency, transaction ID, date, custom field label/value pairs) appear in rendered output; missing optional fields (payer name null) render without breaking; HTML output passes through without escape bugs for user-controlled content.

### Modules explicitly not tested (given time budget)

- Stripe Payment Gateway — mostly I/O against Stripe; mock-heavy tests would be low-value and brittle.
- Payment Page Config — exercised manually via admin UI during development and demo.
- Theme — trivial mapping; visual inspection during demo covers it.
- Reporting Query — exercised by the CSV export demo step.
- Route handlers, UI components, distribution helpers — thin integration layers, no dedicated tests.

### Prior art

Greenfield repo; no prior test patterns to follow. Use Vitest (first-class TS, fast, works with Next.js) with a simple `describe`/`it` structure. Mock the Stripe SDK and Resend SDK at module boundaries. No need for a test DB — the modules selected for testing are pure enough to run in-memory with injected dependencies.

## Out of Scope

- ACH / bank transfer payments
- Internationalization / multi-language support
- Dark mode UI variant
- End-to-end tests (Playwright, Cypress)
- Native mobile app wrapper (React Native, Flutter)
- Stripe webhook handling for refunds, disputes, or chargebacks beyond the happy-path events listed
- Real-time collaboration on page configuration
- Multi-tenant / organization scoping of admins and pages
- Role-based access control within the admin portal
- Many-to-many GL codes per page (single GL per page for MVP)
- Free-form brand color picker (curated themes only)
- Self-hosted payment scheduler (Stripe Subscriptions owns scheduling)
- Payer self-service plan management (cancel plan, update card without admin)
- HIPAA / PCI-DSS compliance beyond what Stripe Elements inherits
- Audit logging of admin actions
- Dynamic contrast computation for user-picked colors (eliminated by curated themes)
- Webhook endpoint for downstream consumers (i.e., we receive Stripe webhooks but do not emit our own)
- Refund UI (acknowledged as a valuable future feature but not in the differentiator)
- Dashboard / analytics for payer drop-off
- Multi-currency (USD only)

## Further Notes

- **Healthcare framing:** The product is domain-agnostic in code and demo pages (yoga, parking, utilities, donations — matching the guide examples). The payment-plans differentiator is pitched in the demo script with a healthcare lens (patient financial hardship, bad-debt reduction), matching Waystar's domain, without making healthcare-specific claims in the product itself. The team will not claim HIPAA compliance.
- **AI coding assistants** will be used extensively. One dev on the team owns "verify AI output against current Next.js App Router and Better Auth docs" to catch hallucinated APIs. Drizzle ORM queries will be funneled through one dev to keep query style (relational vs. builder) consistent across the codebase.
- **Fake-mode fallback for payment plans** is an explicit risk mitigation: if Stripe Subscriptions integration is not working by hour 5, the payer-side UI ships fully with only the first charge executing real, subsequent installments rendered as "upcoming" in the admin plan view. The demo pitch acknowledges the scope cut honestly.
- **Demo deliverables** at submission time: two pre-configured pages (one recurring-friendly e.g., yoga membership; one fixed-amount e.g., parking), at least one completed transaction visible in reporting, admin login credentials shared with judges, publicly accessible Railway URL over HTTPS.
- **Accessibility commitment:** target Lighthouse a11y score ≥ 95 on public payment pages. Dev 4 runs axe DevTools and keyboard-only navigation pass before feature freeze.
