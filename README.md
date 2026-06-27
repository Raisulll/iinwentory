
# Production env handover

Pulled from **Vercel production** on 2026-06-15 (`vercel env pull --environment=production`).
Two Vercel projects, same team:

| Folder         | Vercel project | App                          | Deployed URL                          |
|----------------|----------------|------------------------------|---------------------------------------|
| `server/`      | `server`       | Express API                  | https://server-pi-five-91.vercel.app  |
| `iinwentory/`  | `iinwentory`   | Vite frontend                | (frontend) → calls the API above      |

## What's in each folder

- **`.env`** — cleaned, ready-to-use production app config. **Use this one.**
- **`.env.full-vercel-pull`** — the raw, unfiltered pull (reference only). Contains extra
  vars you can ignore (see below).

## ⚠️ Notes for whoever receives this

- **Database is Supabase Postgres** (`DATABASE_URL` → `aws-1-eu-west-1.pooler.supabase.com`,
  project `ovahczsudvwcuwvmapyi`).
- The raw pull also contains **Neon** vars (`POSTGRES_*`, `PG*`, `NEON_PROJECT_ID`,
  `DATABASE_URL_UNPOOLED`). These are an **unused** leftover integration — **not** the live
  DB. They were stripped from the clean `.env`. Use `DATABASE_URL` (Supabase).
- Stripped Vercel build-system vars (`VERCEL_*`, `TURBO_*`, `NX_DAEMON`) and the
  short-lived `VERCEL_OIDC_TOKEN` — those are auto-injected by Vercel at build/runtime and
  are not app config.
- These files contain **live secrets** (Supabase service-role key, Stripe secret +
  webhook secret, SMTP password). Hand them over through a secure channel, not email/Slack
  in plain text. Rotate if they leak.

## Re-pulling later

```
cd server      && vercel env pull .env --environment=production --yes
cd iinwentory  && vercel env pull .env --environment=production --yes
```
