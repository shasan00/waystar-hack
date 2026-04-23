# Quick Payment Pages (QPP)

Waystar Hackathon — hosted branded payment pages for service providers.

## Stack

- Next.js 14 (App Router) + TypeScript
- Tailwind + shadcn/ui
- Drizzle ORM + Postgres (Railway)
- Stripe (Payment Element + Subscriptions)
- Better Auth, Resend, UploadThing

## Local development

```bash
cp .env.example .env
npm install
npm run dev
```

Visit http://localhost:3000 and http://localhost:3000/api/health.

## Scripts

- `npm run dev` — Next dev server
- `npm run build` — production build
- `npm run start` — production server
- `npm run db:generate` — generate Drizzle migrations
- `npm run db:migrate` — apply migrations
- `npm run db:push` — push schema (dev)
- `npm run db:studio` — open Drizzle Studio

## Deployment

Railway via `Dockerfile` with `output: 'standalone'`. Set `DATABASE_URL` plus the keys in `.env.example`.
