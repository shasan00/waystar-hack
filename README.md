# Waystar QPP — Hackathon

Quick Payment Pages for healthcare providers. Built for the Waystar Hackathon.

**Read [`KICKOFF.md`](./KICKOFF.md) first** — stack, routes, schema, ownership, timeline.

## Run locally

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

The bottom-right **dev toolbar** lets you jump between: home · Login · Admin · Patient portal · Demo payment page · Simulated SMS inbox.

## Stack

Next.js 16 · TypeScript · Tailwind v4 · shadcn/ui (Radix/Nova) · Geist + Instrument Serif · Supabase (to wire) · Drizzle (to wire) · Stripe Payment Element (to wire) · Resend (to wire) · Twilio WhatsApp sandbox (to wire) · Anthropic Claude (to wire) · Deploy: Vercel.

## Aesthetic

"Clinical Confidence" — editorial serif moments (Instrument Serif on the amount), warm off-white canvas, one signal orange (`--waystar #F15A22`) at ≤8% of pixels, 6px radius. Tokens live in `src/app/globals.css`.

## Deploy

Push to GitHub, import to Vercel, set env vars per `KICKOFF.md` § Environment. No config needed.
