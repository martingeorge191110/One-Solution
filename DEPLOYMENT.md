# ONE SOLUTIONS — Free Demo Deployment

Stack chosen for a free, no-custom-domain demo:

| Layer | Service | Public URL | Notes |
|-------|---------|-----------|-------|
| Web (Next.js) | **Vercel** | `https://<project>.vercel.app` | Native Next build. Proxies `/api/*` → Render. |
| API (NestJS)  | **Render** (free Docker web service) | `https://onesolutions-api.onrender.com` | Auto HTTPS. Spins down after ~15 min idle (cold start ~50s). |
| Database | **Neon** (free managed Postgres) | — | Persistent, SSL. Auto-suspends compute when idle. |

> **Why not Cloudflare for the API?** Cloudflare Workers run V8 isolates, not a
> long-running Node server — NestJS can't run there. Cloudflare is frontend-only.

## Networking / auth model (critical)

Auth uses **httpOnly cookies** (`secure`, `sameSite=lax`, no `Domain`). To keep
cookies first-party with no custom domain we use a **same-origin proxy**:

- Web is built with `NEXT_PUBLIC_API_URL=/api` (relative, baked at build time).
- Web runtime env `BACKEND_ORIGIN=https://onesolutions-api.onrender.com`.
- `web/next.config.ts` rewrites `/api/:path*` → `${BACKEND_ORIGIN}/api/:path*`.
- The browser talks **only** to the Vercel origin → cookies bind to `*.vercel.app`,
  `secure`+HTTPS+`sameSite=lax` all satisfied, no CORS, no third-party cookies.

## Production secrets (generated — keep out of git)

Stored locally in `api/.env.production` (gitignored). Set the same values in the
Render dashboard. Rotate the admin password after first login.

```
JWT_SECRET=<48-byte hex>
JWT_REFRESH_SECRET=<different 48-byte hex>
SEED_SUPERADMIN_EMAIL=<real admin email>
SEED_SUPERADMIN_PASSWORD=<strong>
```

## One-time deploy steps

### 1. Database — Neon
1. Create a Neon project (free). Copy the **pooled** connection string
   (`...-pooler...?sslmode=require`).
2. From this machine (Node 22, api devDeps present), apply schema + seed:
   ```fish
   set -x PATH /root/.nvm/versions/node/v22.3.0/bin $PATH
   cd api
   set -x DATABASE_URL "postgresql://...neon...?sslmode=require"
   set -x SEED_SUPERADMIN_EMAIL "admin@…"
   set -x SEED_SUPERADMIN_PASSWORD "…"
   npx prisma migrate deploy   # applies the 2 committed migrations
   npm run seed                # idempotent; creates super admin + system data
   ```

### 2. API — Render
1. Push this repo to GitHub.
2. Render → New → **Blueprint** → pick the repo → it reads `render.yaml`.
3. Fill the `sync:false` secrets: `DATABASE_URL` (Neon), `JWT_SECRET`,
   `JWT_REFRESH_SECRET`, `WEB_ORIGIN` (set after Vercel URL is known).
4. Deploy. Verify: `https://onesolutions-api.onrender.com/api/health` → `{"status":"ok"}`.

### 3. Web — Vercel
From `web/` (Vercel CLI, no GitHub needed):
```fish
cd web
vercel link
vercel env add NEXT_PUBLIC_API_URL production   # value: /api
vercel env add BACKEND_ORIGIN production         # value: https://onesolutions-api.onrender.com
vercel --prod
```
> `NEXT_PUBLIC_API_URL` is build-time — if it changes, redeploy.

### 4. Verify end-to-end (over HTTPS)
- Open the Vercel URL → redirects to `/ar`.
- Log in with the seeded admin.
- Delete the `access_token` cookie in devtools → next action still works (auto-refresh).
- Create a quotation → print the PDF (Amiri fonts + logo render).
- Record a payment (splits supervision vs operational).

## Redeploy / maintenance
- **Web:** `cd web && vercel --prod`.
- **API:** push to the connected branch (autoDeploy) or "Manual Deploy" in Render.
- **New migration:** run `npx prisma migrate deploy` from a dev machine against Neon
  (the Render image has no prisma CLI), then redeploy the API if code changed.
- **Backups:** `pg_dump "$DATABASE_URL" > backup.sql` (Neon also keeps PITR on free tier).
