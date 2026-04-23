# Waystar QPP — Quick Payment Pages

A hosted, full-stack web application where service providers configure
branded, reusable payment pages and distribute them to payers via URL, QR
code, or embeddable iframe. Built for the Waystar Hackathon.

## What's in the product

- **Admin portal** — provider administrators log in, create payment pages,
  configure branding / amount mode / custom fields / GL codes / email
  templates, toggle pages live, view reports with filters + CSV export.
- **Public payment page** — branded `/pay/<slug>` route with the Stripe
  Payment Element (card + Apple Pay / Google Pay / Link), WCAG 2.1 AA
  compliant, responsive, keyboard-navigable.
- **Payment plans (differentiator)** — admins enable monthly installments
  on qualifying pages; Stripe Subscriptions handles scheduling; each
  installment lands as a transaction via webhook.
- **Webhook-authoritative state** — transaction status is only written
  from verified Stripe webhooks, never the client. Idempotent via a
  `webhook_events` table with a unique event-id constraint.
- **Branded confirmation emails** — Resend send, per-page template
  overrides with dynamic variables (`{{payer_name}}`, `{{amount}}`,
  custom field responses, etc.), default fallback template.

## Stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router) + TypeScript |
| Auth | Better Auth (self-hosted, Drizzle adapter) |
| Database | PostgreSQL on Railway |
| ORM | Drizzle + drizzle-kit |
| Payments | Stripe Payment Element + Subscriptions |
| Email | Resend (REST, no SDK) |
| UI | Tailwind v4 + shadcn/ui + Base UI primitives |
| Deploy | Railway via Dockerfile (`output: 'standalone'`) |

## Run locally

```bash
pnpm install
cp .env.example .env.local   # fill in keys — see "Environment" below
pnpm db:push                 # apply Drizzle migrations to DATABASE_URL
pnpm db:seed                 # creates demo org, admin, patient, 2 pages
pnpm dev
```

Open <http://localhost:3000>.

**Demo credentials** (after seeding):
- Admin: `billing@memorialhealth.demo` / `demopassword`
- Patient: `patient@demo.com` / `demopassword`

## Environment

Secrets go in `.env.local` (gitignored). Key variables:

```ini
# Postgres
DATABASE_URL=postgresql://...

# Better Auth
BETTER_AUTH_SECRET=<32-byte random string>
BETTER_AUTH_URL=http://localhost:3000

# Stripe (test mode for the hackathon)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Resend (optional in dev; no key → send logged to console)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL="Waystar QPP <onboarding@resend.dev>"

# UploadThing (optional — for future logo upload)
UPLOADTHING_TOKEN=sk_live_...

# Anthropic (powers the AI payment-plan assistant on /pay/<slug>)
# Without this key, the assistant falls back to a deterministic
# "largest installment count" suggestion so the UI still works.
ANTHROPIC_API_KEY=sk-ant-api03-...
```

For local webhook testing:

```bash
stripe listen --forward-to http://localhost:3000/api/webhooks/stripe
```

Copy the `whsec_...` into `STRIPE_WEBHOOK_SECRET`, then trigger events:

```bash
stripe trigger payment_intent.succeeded
```

## Architecture

```
┌─────────────┐   ┌──────────────┐   ┌──────────────┐
│  Admin UI   │──▶│  Admin API   │──▶│              │
│ /admin/*    │   │ /api/admin/* │   │   Postgres   │
└─────────────┘   └──────────────┘   │  (Drizzle)   │
                                     │              │
┌─────────────┐   ┌──────────────┐   │              │
│ Public page │──▶│ Public API   │──▶│              │
│ /pay/<slug> │   │ payment-     │   │              │
└─────────────┘   │  intent      │   └──────▲───────┘
       │          └──────┬───────┘          │
       │                 ▼                  │
       │          ┌──────────────┐   ┌──────┴──────┐
       │          │    Stripe    │──▶│  Webhook    │
       └─────────▶│  (hosted)    │   │  processor  │───▶ Resend
                  └──────────────┘   │ (idempotent)│
                                     └─────────────┘
```

**Key modules**:
- `src/lib/pricing/policy.ts` — amount validation + plan option resolver
- `src/lib/stripe/gateway.ts` — thin Stripe SDK wrapper
- `src/lib/webhooks/processor.ts` — idempotent event dispatcher
- `src/lib/email/` — render + send + confirmation orchestrator
- `src/lib/reports/queries.ts` — filtered transaction queries + aggregates
- `src/lib/validation/page-config.ts` — hand-rolled validator (client + server)
- `src/db/schema.ts` — Drizzle schema (single source of truth)

### Database schema

See `src/db/schema.ts` for full definitions. Key entities:

| Table | Purpose |
|---|---|
| `organizations` | Single-tenant org row (seed creates one) |
| `user`, `session`, `account` | Better Auth tables |
| `admin_profiles`, `patient_profiles` | Role-specific profile data |
| `payment_pages` | Page config: slug, amount mode, GL codes, email template, theme, plan options, active flag |
| `custom_fields` | Up to 10 per page, 5 types, ordered |
| `transactions` | One row per payment (keyed by Stripe PaymentIntent ID) |
| `plans` | Installment plan rows, one per Stripe Subscription |
| `field_responses` | Custom-field values captured at payment time |
| `webhook_events` | Idempotency ledger (unique on `stripe_event_id`) |

All monetary amounts stored as integer **cents** — never floats.

## Testing

```bash
pnpm test          # Vitest, all modules
```

Tested modules:
- `pricing/policy` — amount-mode invariants, plan option resolver
- `webhooks/processor` — 8 cases covering happy paths + idempotency
- `email/render` — 6 cases covering template merge + variable substitution

## Deliverables (hackathon submission)

- Hosted HTTPS URL: (Railway deploy URL)
- Admin login: see "Demo credentials" above
- Two pre-configured demo pages created by `pnpm db:seed`
- Test transactions via Stripe test cards (`4242 4242 4242 4242`)
