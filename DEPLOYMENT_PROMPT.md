# ONE SOLUTIONS — Deployment Brief (paste into a fresh chat to drive deployment)

You are taking over an **already-built, working** web application called **ONE SOLUTIONS**
and your job is to **deploy it to production**. The code is complete and verified
(features done across 10 phases + auth hardening). Do **not** rebuild features.
Your mission: understand the app, choose a deployment approach with the user, then
**provision, configure, build, migrate, seed, and ship it securely**.

Work methodically: first **read the repo and the docs**, then **ask the user the key
deployment decisions** (below), then execute and verify.

---

## 0. Environment notes (this machine)
- Default shell is `fish`; the default `node` is ancient (v10). Use Node 22 via nvm —
  prefix shell commands with: `export PATH="/root/.nvm/versions/node/v22.3.0/bin:$PATH"; `
- Docker may not be installed here — check (`docker -v`). If absent and the user wants
  Docker, either install it or deploy to a host/PaaS that has it.
- A local PostgreSQL is reachable; a dev DB already exists. Production must use its own DB.
- Repo root: `/professional-projects/one-solutions`

## 1. What the app is (1 paragraph)
Internal operations tool for a finishing-works contractor: manage clients → projects →
**quotations** (with branded Arabic PDF) → **payments** (auto-split into supervision vs
operational) → **daily logs** (purchases + additionals) → **reports** (daily-logs PDF +
final-invoice PDF) → **dashboards/alerts**. Arabic-first (RTL) + English, mobile-first.
Full product/domain spec is in `MASTER_PROMPT.md`; run instructions in `README.md`.

## 2. Repo layout
```
/professional-projects/one-solutions
├── api/            NestJS 11 + Prisma 6 + PostgreSQL  (REST API, port 5000)
├── web/            Next.js 16 (App Router) + Tailwind v4  (port 3000)
├── docker-compose.yml   postgres:16 + api + web   (already written)
├── MASTER_PROMPT.md     full product/domain spec
└── README.md            local run guide
```

## 3. Tech stack
- **API**: NestJS 11, Prisma 6 (PostgreSQL), `jsonwebtoken` auth in a custom global guard
  (NOT Passport), bcrypt, cookie-parser, class-validator. Node ≥ 20.9 (built/tested on 22).
- **Web**: Next.js 16 (App Router, **Turbopack**, `output: "standalone"`), React 19,
  Tailwind v4, Radix UI, TanStack Query/Table, react-hook-form + zod, recharts, next-intl
  (ar default + RTL, en). PDFs are **client-side** (browser print of an HTML template).
- No headless browser / Chromium is needed at runtime (PDFs print in the user's browser).
  Logos use `unoptimized` images, so `sharp` is not required.

## 4. Build & run (per package)
- API: `npm install` → `npm run build` (→ `dist/`) → start with `node dist/src/main.js`.
  Prisma: `npx prisma generate` (build time), `npx prisma migrate deploy` (prod migrations),
  `npm run seed` (one-time seed). Health check: `GET /api/health` (public, returns `{status:'ok'}`).
- Web: `npm install` → `npm run build`. **It uses `output: "standalone"`**, so run it with
  `node .next/standalone/server.js` (NOT `next start`). The Docker image already does this.
  Copy `.next/static` and `public/` next to the standalone server (the Dockerfile handles it).

## 5. Environment variables (authoritative — what the code actually reads)
**API** (`api/.env`):
- `DATABASE_URL` — Postgres connection string (prod DB).
- `PORT` (default 5000), `NODE_ENV` (`production` in prod).
- `WEB_ORIGIN` — allowed CORS origin (the public web origin). Needed only if the browser
  calls the API cross-origin; not needed with the same-origin proxy (see §6).
- `JWT_SECRET` — access-token secret. **Generate a strong unique value for prod.**
- `JWT_REFRESH_SECRET` — refresh-token secret. **Use a different strong value.**
- `JWT_ACCESS_EXPIRES_IN` (default `15m`), `JWT_REFRESH_EXPIRES_IN` (default `7d`).
- `SEED_SUPERADMIN_EMAIL`, `SEED_SUPERADMIN_PASSWORD` — used once by the seed. **Set a real
  admin email + strong password for prod; do not ship the dev defaults.**
> Note: `api/.env.example` is slightly stale (shows `JWT_EXPIRES_IN`); the running code uses
> the four JWT_* vars above (see `api/src/common/token/token.service.ts`). Update the example.

**Web** (build-time + runtime):
- `NEXT_PUBLIC_API_URL` — **baked at build time** into the client bundle. Default
  `http://localhost:5000/api`. For production use the same-origin proxy: set it to **`/api`**.
- `BACKEND_ORIGIN` — runtime env for the Next.js server's rewrite proxy (see §6); the internal
  API URL, e.g. `http://api:5000`.

## 6. CRITICAL — auth cookies & networking (read carefully before choosing topology)
Auth uses **httpOnly cookies** (`access_token` 15m, `refresh_token` 7d), `sameSite: 'lax'`,
and `secure: true` when `NODE_ENV=production`. Two consequences:

1. **Production must be HTTPS.** With `secure` cookies, the browser won't store/send them over
   plain HTTP. Terminate TLS (reverse proxy / load balancer / PaaS).
2. **Prefer a single public origin (no cross-site cookies).** `web/next.config.ts` already
   defines a rewrite: `/api/:path*` → `${BACKEND_ORIGIN}/api/:path*`. So the recommended,
   lowest-friction setup is:
   - Build web with `NEXT_PUBLIC_API_URL=/api`.
   - Set `BACKEND_ORIGIN` (web runtime) to the internal API address (e.g. `http://api:5000`).
   - The browser then talks **only** to the web origin; Next proxies `/api/*` to the API.
     Cookies are same-origin (no SameSite/CORS issues), and only the web app is publicly exposed.
   If instead you expose the API on its own public origin, then: keep it **same registrable
   domain** as the web (e.g. `app.example.com` + `api.example.com`), set `WEB_ORIGIN` to the
   web origin, ensure CORS `credentials` are allowed (already enabled in `api/src/main.ts`),
   and confirm cookies are sent (may require `sameSite: 'none'` + `secure` for true cross-site —
   that's a small code change in `auth.service.ts` cookie options if you go cross-site).

**Recommendation:** put everything behind one HTTPS origin via the Next proxy (or an nginx
reverse proxy: `/` → web:3000, `/api` → api:5000). Simplest and most secure.

## 7. Existing deployment assets (review and harden, don't assume correct)
- `docker-compose.yml`: `db` (postgres:16, volume `pg_data`), `api` (builds `./api`, runs
  `npx prisma migrate deploy && node dist/src/main`, port 5000), `web` (builds `./web`,
  `NEXT_PUBLIC_API_URL` build arg, port 3000). **It was written but never run** — validate it.
  For the same-origin proxy, change the web build arg to `NEXT_PUBLIC_API_URL=/api` and add
  `BACKEND_ORIGIN=http://api:5000` to the web service env. Consider adding an nginx/Caddy
  service for TLS + single entrypoint, or deploy behind the platform's HTTPS.
- `api/Dockerfile` (multi-stage, prisma generate) and `web/Dockerfile` (standalone,
  `node server.js`, accepts `NEXT_PUBLIC_API_URL` build arg) exist — review them.
- Seeding is one-time: after first `migrate deploy`, run `docker compose exec api npm run seed`
  (or equivalent). Then verify you can log in and **immediately change the admin password** if a
  default was used.

## 8. Production checklist (make sure all are handled)
- [ ] HTTPS / TLS in front of everything (required for secure cookies).
- [ ] Single public origin via Next `/api` proxy (or nginx) — `NEXT_PUBLIC_API_URL=/api`,
      `BACKEND_ORIGIN` set; OR a correctly-configured same-site cross-origin setup.
- [ ] Strong, unique `JWT_SECRET` and `JWT_REFRESH_SECRET` (not the dev values).
- [ ] Production `DATABASE_URL`; run `prisma migrate deploy`; **never** `migrate dev` in prod.
- [ ] Seed once with a real `SEED_SUPERADMIN_*`; change the password after first login.
- [ ] `NODE_ENV=production` for the API.
- [ ] Web built with the production `NEXT_PUBLIC_API_URL` (build-time!). Rebuild if it changes.
- [ ] Persistent volume + automated backups for Postgres.
- [ ] Health checks wired to `GET /api/health`; restart policies.
- [ ] Logs + basic monitoring; secrets stored in the platform's secret store (not committed).
- [ ] `web/public/fonts/Amiri-*.ttf` and `web/public/logo.jpeg` ship with the web image (PDFs
      and branding depend on them) — confirm they're present in the build.
- [ ] Confirm the app works end-to-end over HTTPS: login, token auto-refresh (delete the
      access cookie → still logged in), create a quotation, print a PDF, record a payment.

## 9. What to do (your workflow)
1. Read: `README.md`, `docker-compose.yml`, `api/Dockerfile`, `web/Dockerfile`,
   `web/next.config.ts`, `api/src/main.ts`, `api/src/modules/auth/*`, `api/.env.example`.
2. Ask the user the deployment decisions:
   - **Target**: self-managed VPS with Docker Compose? Kubernetes? Or a PaaS (Railway / Render /
     Fly.io / DigitalOcean App Platform)? (Docker Compose on a VPS behind a reverse proxy is the
     straightforward match for this repo.)
   - **Domain(s)** and who manages DNS/TLS (Let's Encrypt via nginx/Caddy, or platform-managed).
   - **Database**: containerized Postgres (with backups) vs a managed Postgres (recommended for
     prod durability). Get the prod `DATABASE_URL`.
   - **Secrets**: where they want secrets stored; generate the JWT secrets.
   - Branch/registry/CI preferences (build locally vs CI; push images to a registry?).
3. Produce a concise **deployment plan** for their chosen target, then execute it step by step,
   verifying each step (build succeeds, container healthy, migration applied, login works over
   HTTPS, PDF prints). Keep the same-origin/cookie/HTTPS constraints from §6 front-of-mind.
4. Hand back: the live URL, the admin login (and that the password was rotated), how to run
   migrations/seed/backups, and how to redeploy.

## 10. Gotchas learned during development (save time)
- Node 22 required; the repo's web build uses **Turbopack** (SWC native binary crashes on some
  Linux/WSL hosts — Turbopack avoids it).
- `next start` warns/!works with `output: standalone` — use the standalone server.
- `NEXT_PUBLIC_API_URL` is compile-time; changing it requires a web rebuild.
- Prisma can't `upsert`/lookup on a NULL value in a compound unique (handled in code already).
- The seed is idempotent; running it twice is safe.
- PDFs are client-side print (no server Chromium). Don't add Playwright to prod for PDFs.
```
