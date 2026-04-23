# Slice 1 — Webhook Event Processor

**Branch:** `webhook-processor` off `main`
**Owner:** unassigned
**Est:** ~1 hr
**Blocked by:** none
**Blocks:** slice 3 (reporting — needs real transactions), slice 5 (email — fires from here)

## Why

Real Stripe payments currently don't persist. The route receives events and verifies signatures, but the handler is a stub (`src/lib/webhooks/processor.ts` just `console.log`s). Until this lands, `/admin/reports` will always show seeded data only, and the guide's "at least one completed test transaction visible in reporting" submission checkbox can't be satisfied from a live demo.

## Scope

Replace the stub with an idempotent processor that:
1. Inserts the Stripe event ID into `webhookEvent` (unique constraint = idempotency).
2. Dispatches on the normalized `DomainEvent` kind (already produced by `gateway.parseWebhookEvent`).
3. Writes rows into `transactions` / `plans` and updates their status.
4. Exposes a seam for email send (slice 5 plugs in here).

## Files

- `src/lib/webhooks/processor.ts` — replace stub with full dispatch.
- `src/lib/webhooks/processor.test.ts` — new. Mock the DB seam + email seam.
- `src/app/api/webhooks/stripe/route.ts` — pass the parsed domain event to `processEvent`.
- Possibly a thin `src/lib/webhooks/persist.ts` if you want to separate DB writes from dispatch (optional, keep it inline if simpler).

## Domain events to handle

From `src/lib/stripe/gateway.ts:19-67`:

| Event kind | Action |
|---|---|
| `payment_succeeded` | Upsert `transactions` by `stripePaymentIntentId` → `status: "succeeded"`, set `amountCents`, `paymentMethod` (from `paymentMethodKind` → schema enum: card/wallet/ach), `payerEmail`, `glCodeAtPayment`. Page ID from `metadata.pageId`. Trigger email send (seam). |
| `payment_failed` | Upsert `transactions` → `status: "failed"`. No email. |
| `plan_installment_succeeded` | Find or create `plans` row by `stripeSubscriptionId` (stored where? schema has no column — see open question below). Insert a new `transactions` row with `planId` + `installmentNumber`. If this is the final installment (count reached), flip plan to `complete`. |
| `plan_installment_failed` | Plan → `cancelled` (schema enum is `cancelled`, not `failed`). |
| `plan_canceled` | Plan → `cancelled`. |
| `ignored` | No-op, still record in `webhookEvent`. |

## Idempotency

Wrap the whole handler in a single transaction:
```
INSERT INTO webhook_event (stripe_event_id, event_type, payload) VALUES (…)
ON CONFLICT (stripe_event_id) DO NOTHING
```
If the insert returns 0 rows, return early — already processed.

## Schema is ready

Migration `drizzle/0001_furry_argent.sql` is already applied to the Railway DB. It:
- Added the `webhook_events` table with unique index on `stripe_event_id`.
- Made `plans.bill_id` nullable.
- Added `plans.page_id` (FK → payment_pages), `stripe_subscription_id` (unique), `stripe_customer_id`, `payer_email`, `payer_name`.

Drizzle model: `schema.webhookEvents`, `schema.plans` (with new fields). Use `db.query.webhookEvents.findFirst(...)` and `db.insert(webhookEvents)` for idempotency checks.

One mapping note still relevant:
- **`payment_method` enum translation** — gateway emits `card | wallet_apple | wallet_google | wallet_link`; DB enum is `card | wallet | ach`. Collapse all wallet variants → `wallet`.

## Tests (Vitest, per PRD lines 174-178)

In `processor.test.ts`, mock `db` and `sendEmail` seams:
- Duplicate `stripeEventId` → no-op (returns success, no second insert).
- `payment_succeeded` → transaction row written with `status: succeeded`, email seam called once.
- `payment_failed` → transaction row written with `status: failed`, email seam NOT called.
- `plan_installment_succeeded` on first installment → transaction with `planId` + `installmentNumber: 1`, plan stays `active`.
- `plan_installment_succeeded` on final installment → plan flips to `complete`.
- `plan_installment_failed` → plan → `cancelled`.
- `plan_canceled` → plan → `cancelled`.
- `ignored` → `webhookEvent` inserted, nothing else happens.

Target: 8 tests, all pass deterministically without network.

## Done when

- `pnpm test` passes new processor tests.
- `pnpm exec tsc --noEmit` clean.
- Manual: use Stripe CLI `stripe trigger payment_intent.succeeded` against local dev → new row appears in `transactions`.
