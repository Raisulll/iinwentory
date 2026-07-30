-- Offer email campaigns.
--
-- Two additions, both idempotent and non-destructive (safe to re-run and safe to
-- apply as a follow-up migration against an existing Supabase project):
--
--   1. profiles.marketing_unsubscribed_at — set when a recipient clicks the
--      unsubscribe link in a campaign email. Distinct from marketing_opt_in
--      (which defaults false for everyone): this records an *explicit* opt-out so
--      campaigns can suppress those users even when sending to "all matched".
--
--   2. offer_email_log — one row per (offer, recipient) email attempt. Backs the
--      admin campaign feature: dedupe (don't email the same person the same offer
--      twice), delivery attribution, and an audit trail of who was contacted.
--
-- IMPORTANT: apply this BEFORE deploying the server build that references these,
-- since Prisma reads all scalar columns of a model (a deploy ahead of the
-- migration would break profile reads).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS marketing_unsubscribed_at timestamptz;

CREATE TABLE IF NOT EXISTS public.offer_email_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_slug  text NOT NULL REFERENCES public.offers(slug) ON DELETE CASCADE,
  user_id     uuid,                                  -- recipient profile id (null if not resolvable)
  email       text NOT NULL,                         -- lowercased address the mail was sent to
  status      text NOT NULL DEFAULT 'sent',          -- 'sent' | 'failed' | 'skipped'
  error       text,                                  -- transport error when status='failed'
  sent_at     timestamptz NOT NULL DEFAULT now(),
  -- One record per offer+recipient so re-running a campaign skips prior sends.
  CONSTRAINT offer_email_log_offer_email_key UNIQUE (offer_slug, email)
);

CREATE INDEX IF NOT EXISTS idx_offer_email_log_offer ON public.offer_email_log (offer_slug);
