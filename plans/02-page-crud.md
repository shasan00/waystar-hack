# Slice 2 — Admin Payment-Page CRUD

**Branch:** `page-crud` off `main`
**Owner:** unassigned
**Est:** ~1.5 hr
**Blocked by:** none
**Blocks:** nothing hard, but slice 6 (deploy) feels incomplete without this

## Why

The admin editor UI renders (`src/app/admin/pages/[id]/editor-tabs.tsx`) but inputs are read-only — there's no `onChange`, no save button, no POST/PATCH. The hackathon guide's demo script (§4.3) explicitly asks: *"Walk through the admin portal — create or edit a payment page."* Can't demo that today.

## Scope

Wire the existing editor to a real API so admins can:
1. Create a new page with slug-uniqueness enforcement.
2. Edit an existing page (title, subtitle, header/footer, theme, amount mode + bounds, GL codes, plan config, email template).
3. Toggle active/inactive.
4. Delete a page (soft via `isActive = false`; hard delete cascade is too scary).
5. Manage custom fields: add / delete / reorder (simple up/down buttons, NOT dnd-kit — that's cut).

## Files

- `src/app/api/admin/pages/route.ts` — `POST` (create) + `GET` (list, already in DB queries).
- `src/app/api/admin/pages/[id]/route.ts` — `PATCH` (update), `DELETE` (soft delete → isActive false).
- `src/app/api/admin/pages/[id]/custom-fields/route.ts` — `POST` (create field), `PATCH` (reorder batch), `DELETE /:fieldId` (delete field).
- `src/app/admin/pages/[id]/editor-tabs.tsx` — make it a client component (if not already), wire onChange handlers, debounced autosave or explicit Save button.
- `src/app/admin/pages/new/page.tsx` — POST to create route, then `router.push(/admin/pages/<id>)`.
- `src/lib/validation/page-config.ts` — new. Zod (or hand-rolled) validation for amount-mode invariants: fixed requires `fixedAmountCents`, range requires `min <= max`, open allows all null bounds.

## Session + role gating

All `/api/admin/**` routes must check `auth.api.getSession()` and `session.user.role === "admin"`, returning 401/403 otherwise. Pattern is already in `src/app/api/admin/users/route.ts:20-26` — copy it.

## Slug uniqueness

Schema already has `uniqueIndex("payment_pages_slug_idx")`. On POST, catch the PG unique-violation error (`23505`) and return 409 with a clear message. Also enforce slug format client-side: `^[a-z0-9-]{3,60}$`.

## Amount-mode invariants

From PRD line 108 and §2.1.3 of the guide:
- `fixed` → `fixedAmountCents > 0`, `min/max` null.
- `range` → `min > 0`, `max >= min`, `fixed` null.
- `open` → all amount fields null.

Write this as a pure function in `src/lib/validation/page-config.ts`, use it on both client (before submit) and server (before insert). No Zod install is strictly required — matches the "don't add deps lightly" bar.

## Custom-field reorder

The `displayOrder` column is an integer. For reorder, accept `PATCH /api/admin/pages/:id/custom-fields` with a body like `{ order: [fieldId1, fieldId2, ...] }`. In a single transaction: update each row's `displayOrder` to its index. Simple up/down buttons on the client produce this array.

## Tests

Low-leverage — PRD explicitly excludes config-module tests (prd.md:183). Skip unit tests for route handlers; rely on manual demo-path validation.

## Done when

- Can create a new page from `/admin/pages/new`, edit its fields, see changes persist across refresh.
- Duplicate slug → 409 with readable error.
- Toggle "Active" → `/pay/<slug>` returns 404 when inactive, renders when active.
- Add/delete/reorder custom fields works end-to-end.
- `pnpm exec tsc --noEmit` clean; existing 18 tests still pass.

## Out of scope

- Live preview alongside the editor (guide §2.1.2 "real-time preview"). Ship save first; preview is a nice-to-have polish item.
- UploadThing logo upload. Keep the logo URL as a text input for now — guide says "upload or specify", text input satisfies the spec.
- Drag-and-drop reorder (`@dnd-kit/sortable`). Up/down buttons meet the "orderable" requirement.
