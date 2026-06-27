-- ───────────────────────────────────────────────────────────────────────────
-- Platform super-admin foundation
--
-- Two things live here, both additive and safe to apply to a real Supabase
-- project as a follow-up migration (nothing is renamed or dropped):
--
--   1. public.admin_audit_log — an immutable trail of every action a platform
--      super-admin takes (status changes, account edits, etc.). This is distinct
--      from public.activity_log, which is per-team and tenant-facing.
--
--   2. public.platform_admins — membership = platform operator. We deliberately
--      do NOT reuse profiles.role: the real Supabase profiles_role_check only
--      allows owner/admin/member, and that table is shared with the Android app.
--      A separate table is additive and keeps a super-admin an ordinary
--      owner/member inside their own team.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action        text NOT NULL,                       -- e.g. 'feedback.status_changed'
  target_type   text,                                -- e.g. 'feedback'
  target_id     text,                                -- affected row id (text: not always a uuid)
  details       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_admin   ON public.admin_audit_log (admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created ON public.admin_audit_log (created_at DESC);

ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.platform_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_admins ENABLE ROW LEVEL SECURITY;

-- Grant the platform operator. Idempotent and best-effort: inserts nothing if
-- the account doesn't exist yet (e.g. a fresh local DB before anyone has
-- registered) — run scripts/grant-super-admin.mjs once the account exists.
INSERT INTO public.platform_admins (user_id)
SELECT id FROM auth.users WHERE email = 'support@imperialtrends.uk'
ON CONFLICT (user_id) DO NOTHING;

-- Operator broadcast banners shown to every signed-in user.
CREATE TABLE IF NOT EXISTS public.announcements (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message    text NOT NULL,
  type       text NOT NULL DEFAULT 'info'
               CHECK (type = ANY (ARRAY['info','warning','success'])),
  active     boolean NOT NULL DEFAULT true,
  starts_at  timestamptz,
  ends_at    timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_announcements_active ON public.announcements (active);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON public.announcements;
CREATE TRIGGER trg_announcements_updated_at BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
