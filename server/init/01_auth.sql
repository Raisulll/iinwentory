-- Local stand-in for the Supabase `auth` schema. It re-creates the bits the
-- public schema and our own RLS policies depend on:
--   * auth.users (with the columns the dump's FKs and triggers reference)
--   * auth.uid()/role()/email() helpers (read JWT claims from session GUCs)
--
-- This file runs ONCE on container init. When the codebase is later pointed
-- at a real Supabase project this whole schema is owned by Supabase already,
-- so nothing here needs to run there.

CREATE SCHEMA IF NOT EXISTS auth;

CREATE TABLE IF NOT EXISTS auth.users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email               text UNIQUE,
  encrypted_password  text,
  email_confirmed_at  timestamptz,
  raw_user_meta_data  jsonb NOT NULL DEFAULT '{}'::jsonb,
  raw_app_meta_data   jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_anonymous        boolean NOT NULL DEFAULT false,
  last_sign_in_at     timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON auth.users (lower(email));

-- JWT claim helpers. Express sets these GUCs per request when running with a
-- user-scoped Postgres connection (see server/src/services/db.ts). They are
-- intentionally permissive when the GUC is unset so that the service-role
-- connection (which bypasses RLS via the table owner) keeps working.
CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
  LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claims', true), '')::jsonb,
    '{}'::jsonb
  );
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
  LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
  LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() ->> 'role';
$$;

CREATE OR REPLACE FUNCTION auth.email() RETURNS text
  LANGUAGE sql STABLE
AS $$
  SELECT auth.jwt() ->> 'email';
$$;
