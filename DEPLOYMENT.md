# ONE SOLUTIONS — Live Demo Deployment

Fully free, card-free demo. Everything runs on Vercel + Neon.

| Layer | Service | URL |
|-------|---------|-----|
| Web (Next.js) | **Vercel** project `one-solutions` | **https://one-solutions-theta.vercel.app** |
| API (NestJS)  | **Vercel** project `one-solutions-api` (serverless) | https://one-solutions-api.vercel.app |
| Database | **Neon** (free managed Postgres, us-east-1) | — |

**Admin login:** `admin@onesolutions.demo` / `RKSgW0rcr1mX!Aa1` — **rotate after first login.**
(Secrets live in `api/.env.production`, gitignored, and in each Vercel project's env vars.)

> We originally targeted Render for the API, but Render now gates even free services
> behind a credit card. Hosting the API on Vercel as a serverless function keeps the
> whole stack free and card-free. `render.yaml` remains in the repo as an alternative.

## How it fits together (auth + networking)

Auth uses httpOnly cookies (`secure`, `sameSite=lax`, **no `Domain`**). To keep them
first-party with no custom domain, the browser only ever talks to the **web** origin:

- Web built with `NEXT_PUBLIC_API_URL=/api` (relative, baked at build time).
- Web env `BACKEND_ORIGIN=https://one-solutions-api.vercel.app` (build+runtime).
- `web/next.config.ts` rewrites `/api/:path*` → `${BACKEND_ORIGIN}/api/:path*`.
- Browser → `one-solutions-theta.vercel.app/api/*` → (Next rewrite, server-side) → API.
  Cookies bind to the web origin; `secure`+HTTPS+`sameSite=lax` all satisfied; no CORS.

The API is a single Vercel serverless function: `api/api/index.js` loads the compiled
`dist/src/serverless.js`, which boots Nest once (cached across warm invocations) and
hands Vercel the Express instance. `vercel.json` runs `prisma generate && nest build`
and bundles the Prisma query engine (`rhel-openssl-3.0.x`).

> Cold start: first request after ~idle pays ~1-2s Nest bootstrap. Fine for a demo.

## Vercel projects / env vars

Scope/team: `martin-s-projects191110` (`team_4Z1BfxyWkU5Af0RnsXXThSpv`).
**Deployment Protection (Vercel Authentication) is disabled** on both projects so the
demo is publicly reachable (it is ON by default for new projects).

- `one-solutions-api` env: `DATABASE_URL` (Neon, `&connection_limit=1`), `JWT_SECRET`,
  `JWT_REFRESH_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_EXPIRES_IN=7d`.
  (`NODE_ENV=production` is set automatically by Vercel in prod.)
- `one-solutions` (web) env: `NEXT_PUBLIC_API_URL=/api`, `BACKEND_ORIGIN=https://one-solutions-api.vercel.app`.

## Redeploy

```fish
set -x PATH /root/.nvm/versions/node/v22.3.0/bin $PATH
set -x VERCEL_TOKEN <token>
set -x SCOPE martin-s-projects191110

# API
cd api;  vercel deploy --prod --yes --scope $SCOPE --token $VERCEL_TOKEN
# Web (rebuild required if NEXT_PUBLIC_API_URL or BACKEND_ORIGIN changes)
cd web;  vercel deploy --prod --yes --scope $SCOPE --token $VERCEL_TOKEN
```

## Database migrations / seed (run from a dev machine — the serverless image has no prisma CLI)

```fish
set -x PATH /root/.nvm/versions/node/v22.3.0/bin $PATH
cd api
set -x DATABASE_URL "postgresql://neondb_owner:...@ep-snowy-field-atfc6drx.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require"
npx prisma migrate deploy     # apply new migrations
npm run seed                  # idempotent
# Backups: pg_dump "$DATABASE_URL" > backup.sql   (Neon also keeps PITR)
```

## Verified end-to-end (HTTPS, via the web origin)

health 200 · login 201 (Secure/HttpOnly/SameSite=Lax cookies) · `/api/auth/me` ·
dashboard 200 · seeded Arabic system data from Neon · token refresh 201 · login page
RTL renders · logo + Amiri fonts served. PDF print is client-side in the browser
(no server Chromium) and uses the bundled Amiri fonts + logo.
