-- ─────────────────────────────────────────────────────────────────────────────
-- Fix cross-app login (web <-> mobile).
--
-- The web app creates auth.users rows directly (bypassing Supabase Auth), and
-- historically omitted the columns GoTrue (used by the mobile app) needs to
-- authenticate a user. This backfill repairs every existing account so it can
-- be logged into from BOTH apps. Safe to run multiple times.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Make every user discoverable + password-loginable by GoTrue (mobile).
UPDATE auth.users
SET
  aud  = 'authenticated',
  role = 'authenticated',
  -- Ensure the email provider is registered. Preserve any existing providers.
  raw_app_meta_data = CASE
    WHEN raw_app_meta_data ? 'providers'
      THEN raw_app_meta_data
    ELSE COALESCE(raw_app_meta_data, '{}'::jsonb)
         || '{"provider":"email","providers":["email"]}'::jsonb
  END,
  -- Treat web-created accounts as confirmed so GoTrue allows password login.
  email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE coalesce(aud, '') <> 'authenticated'
   OR coalesce(role, '') <> 'authenticated'
   OR NOT (raw_app_meta_data ? 'providers');

-- 2. GoTrue scans these token columns into non-nullable Go strings; a NULL value
--    breaks login with a scan error. Force them to empty strings.
UPDATE auth.users
SET
  confirmation_token         = COALESCE(confirmation_token, ''),
  recovery_token             = COALESCE(recovery_token, ''),
  email_change               = COALESCE(email_change, ''),
  email_change_token_new     = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, '')
WHERE confirmation_token IS NULL
   OR recovery_token IS NULL
   OR email_change IS NULL
   OR email_change_token_new IS NULL
   OR email_change_token_current IS NULL;

-- 3. Make sure every auth user has a public.profiles row (the web app requires
--    it; mobile-created users normally get one via the handle_new_user trigger).
INSERT INTO public.profiles (id, full_name)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', u.email)
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;
