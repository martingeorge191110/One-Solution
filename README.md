# ONE SOLUTIONS — Finishing-Operations Management System

Internal operations tool for **ONE SOLUTIONS** (real-estate finishing works): manage
clients → projects → quotations → payments → daily logs → PDF reports. Bilingual
(Arabic primary / RTL default, English toggle), mobile-first, EGP.

See [`MASTER_PROMPT.md`](./MASTER_PROMPT.md) for the full product specification and the
exact business/financial rules.

## Stack
- **api/** — NestJS 11 + Prisma 6 + PostgreSQL. JWT (httpOnly cookies) + bcrypt.
- **web/** — Next.js 16 (App Router) · React 19 · Tailwind v4 · Radix UI · TanStack
  Query/Table · react-hook-form + zod · recharts · next-intl (ar default + RTL, en) ·
  client-side PDFs (jsPDF + Amiri).
- **docker-compose.yml** — postgres + api + web.

## Prerequisites
- **Node 22** (this repo was built with v22.3.0). If using nvm: `nvm use 22`.
  > In this WSL environment Node 22 lives at `/root/.nvm/versions/node/v22.3.0/bin` —
  > prefix commands with `export PATH="/root/.nvm/versions/node/v22.3.0/bin:$PATH";`
  > since the default shell node is too old.
- PostgreSQL 16 (or use Docker Compose).

## Run locally (without Docker)
```bash
# 1) Database — start Postgres and create a DB, then set api/.env from api/.env.example
cp api/.env.example api/.env        # edit DATABASE_URL

# 2) API
cd api
npm install
npx prisma migrate dev              # creates tables
npm run seed                        # super admin + starter system data
npm run start:dev                   # http://localhost:5000/api  (health: /api/health)

# 3) Web  (new terminal)
cd web
npm install
cp .env.example .env.local          # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm run dev                         # http://localhost:3000  → redirects to /ar
```

Default seeded super admin: `admin@onesolutions.local` / `ChangeMe123!` (override via
`SEED_SUPERADMIN_*` env vars). **Change in production.**

## Run with Docker
```bash
docker compose up --build           # web :3000, api :5000, db :5432
```
(The `api` service runs `prisma migrate deploy` on startup. Run the seed once with
`docker compose exec api npm run seed`.)

## Status
**Phase 1 (Foundation) complete** — see `MASTER_PROMPT.md` §13 for the remaining phases:
auth/users/audit → system data → clients/projects → quotation builder → payments →
daily logs → reports/PDFs → KPIs/alerts → polish.
