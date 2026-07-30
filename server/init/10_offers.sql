-- Web-only table backing the promotional-offer system.
--
-- Stripe is the source of truth for the discount itself (a Stripe Coupon holds
-- the percent/amount off, expiry and max-redemption cap). This table only maps
-- a public slug — used both as the ?offer= link param and as the typed promo
-- code — onto that coupon, plus the app-side rules Stripe can't express:
-- new-users-only eligibility and which plans the offer applies to.
--
-- Safe to apply as a follow-up migration: creates a new table only.

CREATE TABLE IF NOT EXISTS public.offers (
  slug             text PRIMARY KEY,                       -- 'welcome30' (link param + typed code, lowercase)
  stripe_coupon_id text NOT NULL,                          -- the Stripe Coupon this offer applies
  description      text,                                   -- human label shown in the UI/admin
  new_users_only   boolean NOT NULL DEFAULT true,          -- eligible only for teams that never subscribed
  allowed_plans    text[] NOT NULL DEFAULT '{advanced,premium}',
  active           boolean NOT NULL DEFAULT true,          -- kill switch, independent of Stripe expiry
  valid_until      timestamptz,                            -- app-side campaign end (null = rely on Stripe cap)
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- Idempotent trigger creation (CREATE TRIGGER has no IF NOT EXISTS).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_offers_updated_at') THEN
    CREATE TRIGGER trg_offers_updated_at BEFORE UPDATE ON public.offers
      FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
  END IF;
END$$;

-- Seed the launch offer. The Stripe coupon id must be created first (Dashboard
-- or scripts/stripe-setup.mjs) and pasted in here; update before applying.
-- INSERT INTO public.offers (slug, stripe_coupon_id, description)
-- VALUES ('welcome30', 'REPLACE_WITH_STRIPE_COUPON_ID', '30% off your first plan');
