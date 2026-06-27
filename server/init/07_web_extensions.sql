-- Web-only tables that live alongside the Supabase dump but are NOT part of
-- the Android app's data model. They store concerns the web app owns:
--   * team_billing       — Stripe customer/sub/plan info per team
--   * web_team_settings  — currency, default view, low-stock alert toggle
--   * web_refresh_tokens — long-lived refresh tokens for the web JWT flow
--   * web_pick_list_codes — short PL-XXXXXX human codes for pick lists
--
-- These are safe to apply to a real Supabase project as a follow-up
-- migration: nothing here renames or deletes existing dump columns.

CREATE TABLE IF NOT EXISTS public.team_billing (
  team_id                uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  plan_id                text NOT NULL DEFAULT 'free',
  stripe_customer_id     text UNIQUE,
  stripe_subscription_id text UNIQUE,
  stripe_price_id        text,
  trial_ends_at          timestamptz,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.web_team_settings (
  team_id          uuid PRIMARY KEY REFERENCES public.teams(id) ON DELETE CASCADE,
  currency         text NOT NULL DEFAULT '£',
  default_view     text NOT NULL DEFAULT 'grid',
  low_stock_alerts boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.web_refresh_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash  text NOT NULL UNIQUE,
  expires_at  timestamptz NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_web_refresh_tokens_user ON public.web_refresh_tokens (user_id);

CREATE TABLE IF NOT EXISTS public.web_pick_list_codes (
  pick_list_id uuid PRIMARY KEY REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  code         text NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS public.web_password_resets (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_team_billing_updated_at BEFORE UPDATE ON public.team_billing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_web_team_settings_updated_at BEFORE UPDATE ON public.web_team_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
