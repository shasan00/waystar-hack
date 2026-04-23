# Waystar QPP Hackathon — Team Kickoff

**Deadline:** today, 6:00 PM. **Team of 4.**

## The product, in one sentence
A hosted full-stack app where healthcare providers configure branded, reusable **Quick Payment Pages** and distribute them to patients (URL, iframe, QR, **text**). Patients can log in to see outstanding bills and pay. Admins see transactions + reports.

## Stack (locked)
- **Next.js 15** (App Router) + **TypeScript**
- **Tailwind v4** + **shadcn/ui**
- **Supabase** — Postgres + Auth + Storage (logo uploads)
- **Drizzle ORM** — typed SQL
- **Stripe Payment Element** (card-only, webhook-driven) — sandbox mode
- **Resend** — email receipts
- **Twilio WhatsApp sandbox** — differentiator (text-to-pay)
- **Vercel** — deploy
- **Anthropic Claude** — the bot's reply brain

## Aesthetic (locked): "Clinical Confidence"
- Fonts: `Instrument Serif` (display + big amounts) · `Geist` (UI) · `Geist Mono` (numbers)
- Palette CSS vars: `--canvas #FAFAF7`, `--ink #0A0A0A`, `--ink-muted #6B6B6B`, `--rule #E8E6E0`, `--waystar #F15A22`, `--waystar-deep #C8430E`, `--waystar-wash #FFF4EC`, `--success #1F7A3A`
- Orange on **≤8% of pixels per screen** — signal, not wash
- Motion: restrained. Stagger fade-ups on load, count-up dollar amounts, orange underline on active nav. No gradients, no glow blobs, no emoji.
- Border radius: **6px** (serious), not `rounded-full`

## Routes & owners

| # | Route | Owner | What it does |
|---|---|---|---|
| 1 | `/login` (role tabs: Admin / Patient) | A | Supabase email+password, redirects by role |
| 2 | `/admin` | A | Summary tiles + recent activity |
| 3 | `/admin/pages` | A | List all QPPs, status, quick copy-URL |
| 4 | `/admin/pages/[id]` | A | Config editor w/ live preview, tabs: Branding / Amount / Fields / GL / Email / Share / Send-by-text |
| 5 | `/admin/reports` | C | Filters, summary, GL breakdown, CSV export |
| 6 | `/portal` | A | Patient dashboard — outstanding bills + recent payments preview |
| 7 | `/portal/history` | A | Full payment history |
| 8 | `/pay/[slug]` | B | **Flagship** public payment page — branded, WCAG AA, Stripe Payment Element |
| 9 | `/pay/[slug]/success` | B | Receipt |
| 10 | `/dev/inbox` | C | Simulated SMS/WhatsApp inbox for on-stage demo |

Deferred: `/` marketing, `/pay/[slug]/embed`.

## Data model (Drizzle, starter)

```
organizations  (id, name, logo_url, brand_color)
admin_users    (id, org_id, email, password_hash)
patients       (id, email, password_hash, full_name, phone)
payment_pages  (id, org_id, slug, title, description, brand_color, logo_url,
                amount_mode 'fixed'|'range'|'open', fixed_amount, min_amount, max_amount,
                gl_code, email_template, allow_plans bool, is_active, created_at)
custom_fields  (id, page_id, label, type, options_json, required, display_order)
bills          (id, patient_id, page_id, amount, description, status 'outstanding'|'paid'|'cancelled', due_date, created_at)
transactions   (id, page_id, bill_id?, patient_id?, amount, payment_method, status,
                payer_email, payer_name, stripe_payment_intent_id,
                plan_id?, plan_installment_number?, created_at)
field_responses (id, transaction_id, field_id, value)
plans          (id, bill_id, total_amount, installment_count, installment_amount, status)
messages       (id, patient_id, direction 'in'|'out', channel 'whatsapp', body, created_at)  -- for /dev/inbox
```

## Environment variables
Put in `.env.local` (never commit):
```
DATABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
RESEND_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=whatsapp:+14155238886
ANTHROPIC_API_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Conventions
- `src/app/` — routes (App Router)
- `src/components/ui/` — shadcn primitives (don't edit)
- `src/components/` — app components
- `src/lib/` — clients (stripe, supabase, resend, twilio, anthropic), utils
- `src/db/schema.ts` — Drizzle schema (single source)
- `src/db/index.ts` — db client
- `"use server"` files for server actions; API routes under `src/app/api/` for webhooks only
- **Stripe webhook route must declare `export const runtime = 'nodejs'`** (not edge)
- Never mark a transaction `succeeded` from the client — only from the webhook
- All money in **cents** (integer) in DB; format to dollars at the edge
- No hardcoded secrets. Ever.

## Run locally
```
pnpm install
cp .env.local.example .env.local   # fill in keys
pnpm db:push                       # drizzle migrations
pnpm dev
```

## Ownership timeline (target)

| Time | Milestone |
|---|---|
| T+0:30 | Scaffold done, everyone cloned, `.env.local` filled |
| T+2:00 | Schema pushed, auth works, shell layouts exist |
| T+4:00 | Payment page renders config, Stripe test payment lands webhook |
| T+5:30 | Reports page, admin editor feature-complete |
| T+6:30 | Differentiator (text-to-pay, PAY/PLAN) end-to-end via /dev/inbox |
| T+7:00 | **Kill switch** — if differentiator broken, cut AI, ship dumb text-to-pay |
| T+7:30 | Polish, a11y audit (Lighthouse), demo dry run |
| T+8:00 | Submit |

## Demo script (write now, polish later)
1. Admin logs in → creates "Memorial Health — 3/12 Visit" page ($847, allow plans, 1 custom field: Account#)
2. Admin shares: copy URL, show iframe, show QR
3. Admin clicks "Send by text" → patient phone buzzes on WhatsApp
4. Switch to patient: reply `PLAN` → bot offers 3-pay → patient picks → link arrives
5. Open link on `/pay/[slug]` — branded, amount counts up to $282.33, "Payment 1 of 3"
6. Pay with test card `4242 4242 4242 4242`
7. Success page → email receipt (show in Resend)
8. Back to admin `/reports` → transaction visible, filter by GL code, export CSV
9. Mention HIPAA/TCPA/BAA one-liner

## Rules of engagement
- Branch per feature: `a/admin-pages`, `b/pay-page`, `c/reports`, `d/schema`
- Merge to `main` via PR — Vercel will auto-deploy previews
- If you're stuck > 15 min, ask the group chat
- If the scope grows, **cut** rather than stretch — partial-but-polished beats complete-but-broken
