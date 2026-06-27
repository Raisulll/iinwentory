# iinwentory server

Express API. Talks to Postgres via Prisma. Schema mirrors the Supabase project
in `../backups/2026-04-22/` 1:1 plus a small set of `web_*` extension tables for
billing, settings, refresh tokens, and pick-list codes.

## Run locally

You need Postgres reachable on the URL in `DATABASE_URL`. Pick one of:

### Option A — Docker (recommended)

```bash
docker compose up -d        # starts Postgres on localhost:54322
npm install
npm run db:generate         # prisma generate
npm run dev                 # tsx watch src/index.ts
```

The container's first boot runs everything in `init/` in order:

1. `00_extensions.sql` — `pgcrypto`, `uuid-ossp`
2. `01_auth.sql` — local `auth` schema with `users` table + `auth.uid()` helpers
3. `02_tables.sql` — copy of `backups/.../tables.sql` (20 dump tables + RLS)
4. `03_indexes.sql` — copy of dump indexes
5. `04_functions.sql` — copy of dump functions
6. `05_triggers.sql` — copy of dump triggers (`handle_new_user` auto-creates a
   profile row when `auth.users` gets a new row)
7. `06_views.sql` — `folder_stats`, `folder_thumbnails`
8. `07_web_extensions.sql` — `team_billing`, `web_team_settings`,
   `web_refresh_tokens`, `web_pick_list_codes`, `web_password_resets`

### Option B — Native Postgres

Install Postgres 16+ locally, then create the database and run the init files
in order:

```bash
createdb iinwentory
for f in init/*.sql; do psql -d iinwentory -f "$f"; done
```

Set `DATABASE_URL` to the local URL in `.env`.

## Bootstrapping a fresh Supabase project

A fresh Supabase project ships with empty `public` schema. To populate it with
the dump's structure (tables, indexes, functions, triggers, views, RLS
policies) plus our `web_*` extension tables, run the bundler and paste the
output into the Supabase SQL Editor:

```bash
npm run db:bundle    # writes init/supabase-bundle.sql (single ~41 KB file)
```

Then in the Supabase dashboard:

1. SQL Editor → **New query**
2. Paste the contents of `init/supabase-bundle.sql`
3. Run

The bundle skips `01_auth.sql` because Supabase already owns the `auth` schema
(including `auth.users` and the `auth.uid()` / `role()` / `email()` helpers).

After it succeeds, paste your Supabase credentials into `.env` (see next
section) and restart the server.

## Connecting to a real Supabase project later

When you're ready to point the server at the Supabase project the dump came from
(or any other Supabase project that has had `init/02_tables.sql` and the rest of
the dump applied), set these in `.env`:

```
DATABASE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?schema=public"
SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."
SUPABASE_JWT_SECRET="..."   # Project Settings → API → JWT Secret
```

The server is designed to be a drop-in:

- It signs and verifies JWTs with the same HS256 + claim shape as Supabase Auth,
  so tokens minted by Supabase Auth (e.g. from `supabase-js` on the frontend)
  will be accepted by `requireAuth`.
- All inventory queries scope by `team_id`, the same shape RLS policies use.
- `auth.users`, `profiles`, and the `handle_new_user` trigger are owned by
  Supabase already, so the local stand-in is harmless when running against
  Supabase: nothing in `01_auth.sql` is re-run.
- The `web_*` tables in `07_web_extensions.sql` should be applied to the
  Supabase project as a regular migration when you wire it up.

## Notes

- We do **not** use Prisma Migrate. `prisma/schema.prisma` is hand-written to
  mirror the dump; the SQL files are the source of truth for schema. Use
  `npx prisma generate` after editing the schema.
- The Prisma client connects as the database owner, which bypasses RLS by
  default. The Express server enforces tenant scoping in code via `team_id`
  filters. If you want RLS enforcement at the DB level, switch to a non-owner
  role and set `request.jwt.claims` per request.
