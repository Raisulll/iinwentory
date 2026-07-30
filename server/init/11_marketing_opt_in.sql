-- Marketing / promotional email consent captured at signup.
--
-- Idempotent and non-destructive: safe to re-run and safe to apply as a
-- follow-up migration against an existing Supabase project. Defaults to false
-- so existing rows are treated as "not opted in" (never assume consent).
--
-- IMPORTANT: apply this BEFORE deploying the server build that references
-- profiles.marketing_opt_in — Prisma reads all scalar columns of a model, so a
-- deploy that runs ahead of this migration would break registration/login.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_opt_in boolean NOT NULL DEFAULT false;
