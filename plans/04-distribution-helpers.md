# Slice 4 — Distribution Helpers (Copy URL, Iframe, QR)

**Branch:** `distribution-helpers` off `main`
**Owner:** unassigned
**Est:** ~30 min
**Blocked by:** none
**Blocks:** nothing

## Why

Guide §2.2 is a required functional area with three sub-items: direct URL copy (§2.2.1), embeddable iframe snippet (§2.2.2), and downloadable QR code in PNG/SVG (§2.2.3). The demo script (§4.3) specifically says *"Demonstrate link distribution — show the URL, iframe snippet, and QR code."* Currently none of this is wired — the admin page detail has placeholder UI only.

## Scope

Client-side only. No new API routes. All three widgets live on `/admin/pages/[id]` in a "Share" section.

1. **Copy URL** — one-click copy of `https://<site>/pay/<slug>`. Show a transient "Copied!" indicator.
2. **Iframe snippet** — textarea with `<iframe src="https://<site>/pay/<slug>" width="100%" height="800" style="border:0"></iframe>`, copy button. Verify in the browser that `/pay/<slug>` actually renders inside an iframe (Next.js sets `X-Frame-Options` to SAMEORIGIN by default in some configs — may need to explicitly unset for the `/pay/*` path via `next.config.ts` headers).
3. **QR code PNG/SVG** — generate client-side using the `qrcode` npm package. Two download buttons: one for PNG (canvas.toDataURL), one for SVG (qrcode's `toString` API). Display a preview.

## Files

- `src/app/admin/pages/[id]/share-panel.tsx` (new) — client component with all three widgets.
- `src/app/admin/pages/[id]/page.tsx` — import + render the panel.
- `next.config.ts` — if X-Frame-Options is blocking, add a headers override for `/pay/:path*`.
- `package.json` — add `qrcode` and `@types/qrcode`.

## Environment

The public URL base needs to be readable client-side. Use `process.env.NEXT_PUBLIC_SITE_URL` (already in `.env.example`). Fall back to `window.location.origin` on client if the env var is missing.

## Clipboard

`navigator.clipboard.writeText(...)` — gated behind HTTPS + user gesture (both satisfied inside the admin portal).

## Iframe considerations

Same-origin iframes are fine by default. If a judge tries to embed the iframe on their own domain, it needs `X-Frame-Options: ALLOWALL` (or removed) and `Content-Security-Policy: frame-ancestors *` on the `/pay/*` routes. Add a `headers()` block in `next.config.ts`:

```ts
async headers() {
  return [
    {
      source: "/pay/:path*",
      headers: [
        { key: "X-Frame-Options", value: "ALLOWALL" },
        { key: "Content-Security-Policy", value: "frame-ancestors *;" },
      ],
    },
  ];
}
```

## Tests

Skip — pure integration UI, no logic to unit-test.

## Done when

- `/admin/pages/[id]` shows a Share section with 3 widgets.
- Click copy → URL + iframe snippet land on clipboard; transient confirmation shows.
- Click QR download → PNG and SVG files save with filename like `<slug>-qr.png` / `.svg`.
- Scan the PNG with a phone camera → opens the payment page.
- Paste the iframe into a scratch HTML file on a different origin → payment page renders inside it.
- `pnpm exec tsc --noEmit` clean.
