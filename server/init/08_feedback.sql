-- ───────────────────────────────────────────────────────────────────────────
-- public.feedback
--
-- Stores user feedback submitted from the web app (the "Send feedback" button
-- in the sidebar). It is intentionally lightweight and self-contained:
--
--   * user_id / team_id are OPTIONAL (ON DELETE SET NULL) so a row survives
--     even if the account or team is later removed, and so feedback can be
--     captured before those FKs are known.
--   * `category`, `rating` and `status` are constrained to a small known set
--     to keep reporting clean.
--
-- Safe to apply to a real Supabase project as a follow-up migration: it only
-- ADDS a table + indexes + one trigger, nothing here renames/deletes anything.
-- ───────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  team_id    uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  name       text,
  email      text,
  category   text    NOT NULL DEFAULT 'general'
               CHECK (category = ANY (ARRAY['general','bug','feature','praise','other'])),
  rating     integer CHECK (rating BETWEEN 1 AND 5),
  message    text    NOT NULL,
  page       text,
  status     text    NOT NULL DEFAULT 'new'
               CHECK (status = ANY (ARRAY['new','reviewed','resolved','archived'])),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_feedback_team_id ON public.feedback (team_id);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback (user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status  ON public.feedback (status);
CREATE INDEX IF NOT EXISTS idx_feedback_created ON public.feedback (created_at DESC);

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- Keep updated_at fresh on edits (status changes etc.). Reuses the shared
-- trigger function defined in 04_functions.sql.
DROP TRIGGER IF EXISTS trg_feedback_updated_at ON public.feedback;
CREATE TRIGGER trg_feedback_updated_at BEFORE UPDATE ON public.feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ───────────────────────────────────────────────────────────────────────────
-- Dummy feedback — handy for local dev so the table isn't empty.
--
-- These rows use NULL user_id/team_id so they don't depend on any particular
-- account existing. Re-running them just adds more rows; delete first with
--   DELETE FROM public.feedback WHERE user_id IS NULL;
-- if you want to reset the sample set.
-- ───────────────────────────────────────────────────────────────────────────

INSERT INTO public.feedback (name, email, category, rating, message, page, status)
VALUES
  ('Ava Thompson',  'ava@example.com',    'praise',  5, 'Love the new dashboard — the low-stock alerts are a lifesaver!', '/dashboard', 'new'),
  ('Marcus Lee',    'marcus@example.com', 'bug',     2, 'Editing an item quantity sometimes shows the old value until I refresh.', '/items', 'new'),
  ('Priya Nair',    'priya@example.com',  'feature', 4, 'Would be great to export reports to CSV directly from the Reports page.', '/reports', 'reviewed'),
  ('Tom Becker',    'tom@example.com',    'general', 3, 'The app is solid overall, but the search could be a bit faster on big inventories.', '/search', 'new'),
  ('Sofia Romero',  'sofia@example.com',  'feature', 5, 'Please add barcode scanning from the desktop webcam too!', '/scanner', 'new'),
  ('Daniel Okafor', 'daniel@example.com', 'bug',     1, 'Pick mode crashed once when I assigned a list to a removed teammate.', '/pick-mode', 'resolved'),
  ('Hannah Cole',   NULL,                 'praise',  5, 'Clean UI, easy onboarding. Switched our whole team over in a day.', '/onboarding', 'archived'),
  ('Liam Walsh',    'liam@example.com',   'other',   3, 'Any chance of a dark mode for the marketing site as well?', '/settings', 'new');

-- Reusable query to add a single dummy row on demand:
--   INSERT INTO public.feedback (name, email, category, rating, message, page)
--   VALUES ('Test User', 'test@example.com', 'general', 4, 'Just trying things out.', '/dashboard');
