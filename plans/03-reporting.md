# Slice 3 — Reporting Query Module + CSV Export

**Branch:** `reporting` off `main` (merge slice 1 first, or rebase after)
**Owner:** unassigned
**Est:** ~1 hr
**Blocked by:** slice 1 (webhook processor) — without real transactions persisting, there's nothing to aggregate. The seeded historical transaction is enough to develop against, but the demo needs #1 live.

## Why

`/admin/reports` renders mock data from a hardcoded `TXNS` array. Filters don't filter. The CSV export button is disabled. Guide §2.5 requires transaction list + filters + summary + GL breakdown + payment-method breakdown; §2.5.2 stretch adds CSV export (low-effort, high-signal for judging).

## Scope

1. **Reporting Query module** (`src/lib/reports/queries.ts`) — pure server-side, given filter params returns:
   - `transactions` (paginated list)
   - `summary` (total count, total amount, average)
   - `byGlCode` (array of `{ glCode, count, amountCents }`)
   - `byPaymentMethod` (array of `{ method, count, amountCents }`)
2. **API routes:**
   - `GET /api/admin/reports/transactions?from=&to=&pageId=&status=&limit=&offset=` → list + count
   - `GET /api/admin/reports/summary?<same filters>` → summary + breakdowns
   - `GET /api/admin/reports/export.csv?<same filters>` → text/csv, respects filters
3. **Wire `src/app/admin/reports/page.tsx`** to fetch real data. Keep the visual design; swap the data source.

## Files

- `src/lib/reports/queries.ts` (new)
- `src/app/api/admin/reports/transactions/route.ts` (new)
- `src/app/api/admin/reports/summary/route.ts` (new)
- `src/app/api/admin/reports/export.csv/route.ts` (new)
- `src/app/admin/reports/page.tsx` (rewire)

## Filters

From §2.5.1:
- `from` / `to` — ISO date strings, applied against `transactions.createdAt`
- `pageId` — UUID, exact match
- `status` — `succeeded | failed | pending | refunded` (schema enum)

Default: last 30 days, all pages, `status = succeeded`.

## Aggregates

Use Drizzle's SQL builder, not query API, for the breakdowns:
```
SELECT gl_code_at_payment, COUNT(*), SUM(amount_cents)
FROM transactions
WHERE <filters>
GROUP BY gl_code_at_payment
```
Similar for `payment_method`. Return cents as integers — format currency in the UI.

## CSV format

Header row: `transaction_id,created_at,page_slug,amount_cents,status,payment_method,gl_code,payer_email,payer_name`.

Stream via `new Response(csv, { headers: { "Content-Type": "text/csv", "Content-Disposition": 'attachment; filename="transactions.csv"' } })`. Escape fields that contain `,` / `"` / newlines with standard CSV quoting.

Respect active filters — export query is the same as the transactions query without pagination.

## Session + role gating

Same as slice 2: all `/api/admin/reports/*` routes check session + admin role.

## Tests

Skip unit tests for this module — PRD line 185 explicitly excludes the reporting module from the test budget. Manual validation is enough.

## Done when

- Reports page loads real transactions from DB.
- Changing filters refetches with correct results.
- Summary tiles (total, count, avg) reflect filtered set.
- GL bar chart + payment-method bar chart render from real aggregates.
- CSV button downloads a correctly-escaped CSV matching current filters.
- `pnpm exec tsc --noEmit` clean.
