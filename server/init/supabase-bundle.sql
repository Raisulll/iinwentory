-- Supabase bundle generated 2026-04-25T12:34:03.258Z
-- Apply once to a fresh Supabase project (SQL Editor → New query → paste).
-- Source dump: backups/2026-04-22/

-- ════════════════════════════════════════════════════════════════════
-- Extensions
-- ════════════════════════════════════════════════════════════════════
-- Extensions available in vanilla Postgres that Supabase also ships with.
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════════════
-- Public tables (dump)
-- ════════════════════════════════════════════════════════════════════
-- public schema tables (reconstructed from information_schema + pg_constraint)
-- Generated 2026-04-22

CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  role text NOT NULL DEFAULT 'member',
  pin_hash text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  department text,
  permissions jsonb DEFAULT '{"role":"member"}'::jsonb,
  business_name text,
  business_address text,
  password_was_reset boolean DEFAULT false
);

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role = ANY (ARRAY['owner'::text,'admin'::text,'member'::text,'client'::text])),
  joined_at timestamptz DEFAULT now(),
  CONSTRAINT team_members_team_id_user_id_key UNIQUE (team_id, user_id),
  CONSTRAINT team_members_user_id_unique UNIQUE (user_id),
  CONSTRAINT team_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT team_members_user_id_profiles_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE
);

CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  created_by uuid REFERENCES auth.users(id),
  expires_at timestamptz DEFAULT (now() + '7 days'::interval),
  used_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  icon text,
  colour text,
  description text,
  sku text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id),
  created_by uuid REFERENCES auth.users(id),
  cover_image text
);

CREATE TABLE public.items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  sku text,
  quantity integer NOT NULL DEFAULT 0,
  min_quantity integer NOT NULL DEFAULT 0,
  cost_price numeric,
  sell_price numeric,
  weight numeric,
  dimensions jsonb,
  photos text[],
  custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb,
  folder_id uuid REFERENCES public.folders(id) ON DELETE SET NULL,
  location text,
  notes text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  colour text,
  created_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id),
  created_by uuid REFERENCES auth.users(id)
);

CREATE TABLE public.item_tags (
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id),
  PRIMARY KEY (item_id, tag_id)
);

CREATE TABLE public.pick_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  assigned_to uuid REFERENCES public.profiles(id),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.pick_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id uuid NOT NULL REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity_requested integer NOT NULL DEFAULT 1,
  quantity_picked integer NOT NULL DEFAULT 0,
  location_hint text,
  unit_price numeric,
  picked_at timestamptz,
  picked_by uuid,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.pick_list_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id uuid NOT NULL REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  user_id uuid,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.pick_list_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pick_list_id uuid NOT NULL REFERENCES public.pick_lists(id) ON DELETE CASCADE,
  pick_list_item_id uuid NOT NULL REFERENCES public.pick_list_items(id) ON DELETE CASCADE,
  issue_type text NOT NULL CHECK (issue_type = ANY (ARRAY['damaged_stock'::text,'missing_unit'::text,'wrong_stock_at_location'::text,'barcode_mismatch'::text,'other'::text])),
  quantity_affected integer NOT NULL DEFAULT 0,
  quantity_actually_picked integer NOT NULL DEFAULT 0,
  notes text,
  reported_by uuid REFERENCES auth.users(id),
  team_id uuid REFERENCES public.teams(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  item_id uuid,
  pick_list_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  "timestamp" timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  related_item_id uuid,
  related_pick_list_id uuid,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid REFERENCES public.items(id) ON DELETE SET NULL,
  transaction_type text NOT NULL,
  quantity_before integer NOT NULL DEFAULT 0,
  quantity_after integer NOT NULL DEFAULT 0,
  quantity_change integer NOT NULL DEFAULT 0,
  reference_id uuid,
  reference_type text,
  performed_by uuid,
  notes text,
  folder_name text,
  item_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.stock_counts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.stock_count_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stock_count_id uuid NOT NULL REFERENCES public.stock_counts(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  expected_quantity integer NOT NULL DEFAULT 0,
  counted_quantity integer,
  difference integer,
  counted_by uuid,
  counted_at timestamptz,
  notes text
);

CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_number text NOT NULL UNIQUE,
  supplier_name text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  notes text,
  order_date timestamptz DEFAULT now(),
  expected_date timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  team_id uuid REFERENCES public.teams(id)
);

CREATE TABLE public.purchase_order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  po_id uuid NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  quantity_ordered integer NOT NULL DEFAULT 0,
  quantity_received integer NOT NULL DEFAULT 0,
  unit_cost numeric,
  received_at timestamptz,
  received_by uuid
);

CREATE TABLE public.client_folder_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_id uuid NOT NULL REFERENCES public.folders(id) ON DELETE CASCADE,
  granted_by uuid REFERENCES auth.users(id),
  granted_at timestamptz DEFAULT now(),
  CONSTRAINT client_folder_access_user_id_folder_id_key UNIQUE (user_id, folder_id)
);

-- Enable RLS on all public tables
ALTER TABLE public.activity_log           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_folder_access   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.folders                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_tags              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_comments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_issues       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_list_items        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pick_lists             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_count_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_counts           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions           ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════════════
-- Indexes (dump)
-- ════════════════════════════════════════════════════════════════════
-- Indexes on public schema

CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id);
CREATE INDEX idx_activity_log_item ON public.activity_log USING btree (item_id);
CREATE INDEX idx_activity_log_pick_list ON public.activity_log USING btree (pick_list_id);
CREATE INDEX idx_activity_log_team_id ON public.activity_log USING btree (team_id);
CREATE INDEX idx_activity_log_timestamp ON public.activity_log USING btree ("timestamp" DESC);
CREATE INDEX idx_activity_log_user ON public.activity_log USING btree (user_id);

CREATE UNIQUE INDEX client_folder_access_pkey ON public.client_folder_access USING btree (id);
CREATE UNIQUE INDEX client_folder_access_user_id_folder_id_key ON public.client_folder_access USING btree (user_id, folder_id);
CREATE INDEX idx_cfa_team_user ON public.client_folder_access USING btree (team_id, user_id);
CREATE INDEX idx_cfa_user_id ON public.client_folder_access USING btree (user_id);

CREATE UNIQUE INDEX folders_pkey ON public.folders USING btree (id);
CREATE INDEX idx_folders_parent ON public.folders USING btree (parent_folder_id);
CREATE INDEX idx_folders_team_id ON public.folders USING btree (team_id);

CREATE INDEX idx_item_tags_tag ON public.item_tags USING btree (tag_id);
CREATE UNIQUE INDEX item_tags_pkey ON public.item_tags USING btree (item_id, tag_id);

CREATE INDEX idx_items_created_by ON public.items USING btree (created_by);
CREATE INDEX idx_items_folder_id ON public.items USING btree (folder_id);
CREATE INDEX idx_items_name ON public.items USING btree (name);
CREATE INDEX idx_items_sku ON public.items USING btree (sku);
CREATE INDEX idx_items_status ON public.items USING btree (status);
CREATE INDEX idx_items_team_id ON public.items USING btree (team_id);
CREATE UNIQUE INDEX items_pkey ON public.items USING btree (id);

CREATE INDEX idx_notifications_created ON public.notifications USING btree (created_at DESC);
CREATE INDEX idx_notifications_read ON public.notifications USING btree (is_read);
CREATE INDEX idx_notifications_user ON public.notifications USING btree (user_id);
CREATE UNIQUE INDEX notifications_pkey ON public.notifications USING btree (id);

CREATE INDEX idx_pick_list_comments_pick_list ON public.pick_list_comments USING btree (pick_list_id);
CREATE UNIQUE INDEX pick_list_comments_pkey ON public.pick_list_comments USING btree (id);

CREATE INDEX idx_pick_list_issues_pick_list_id ON public.pick_list_issues USING btree (pick_list_id);
CREATE INDEX idx_pick_list_issues_pick_list_item_id ON public.pick_list_issues USING btree (pick_list_item_id);
CREATE INDEX idx_pick_list_issues_team_id ON public.pick_list_issues USING btree (team_id);
CREATE UNIQUE INDEX pick_list_issues_pkey ON public.pick_list_issues USING btree (id);

CREATE INDEX idx_pick_list_items_item ON public.pick_list_items USING btree (item_id);
CREATE INDEX idx_pick_list_items_pick_list ON public.pick_list_items USING btree (pick_list_id);
CREATE UNIQUE INDEX pick_list_items_pkey ON public.pick_list_items USING btree (id);

CREATE INDEX idx_pick_lists_created_by ON public.pick_lists USING btree (created_by);
CREATE INDEX idx_pick_lists_status ON public.pick_lists USING btree (status);
CREATE INDEX idx_pick_lists_team_id ON public.pick_lists USING btree (team_id);
CREATE UNIQUE INDEX pick_lists_pkey ON public.pick_lists USING btree (id);

CREATE INDEX idx_profiles_role ON public.profiles USING btree (role);
CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE INDEX idx_po_items_item ON public.purchase_order_items USING btree (item_id);
CREATE INDEX idx_po_items_po ON public.purchase_order_items USING btree (po_id);
CREATE UNIQUE INDEX purchase_order_items_pkey ON public.purchase_order_items USING btree (id);

CREATE INDEX idx_purchase_orders_po_number ON public.purchase_orders USING btree (po_number);
CREATE INDEX idx_purchase_orders_status ON public.purchase_orders USING btree (status);
CREATE INDEX idx_purchase_orders_team_id ON public.purchase_orders USING btree (team_id);
CREATE UNIQUE INDEX purchase_orders_pkey ON public.purchase_orders USING btree (id);
CREATE UNIQUE INDEX purchase_orders_po_number_key ON public.purchase_orders USING btree (po_number);

CREATE INDEX idx_stock_count_items_item ON public.stock_count_items USING btree (item_id);
CREATE INDEX idx_stock_count_items_sc ON public.stock_count_items USING btree (stock_count_id);
CREATE UNIQUE INDEX stock_count_items_pkey ON public.stock_count_items USING btree (id);

CREATE INDEX idx_stock_counts_created_by ON public.stock_counts USING btree (created_by);
CREATE INDEX idx_stock_counts_status ON public.stock_counts USING btree (status);
CREATE INDEX idx_stock_counts_team_id ON public.stock_counts USING btree (team_id);
CREATE UNIQUE INDEX stock_counts_pkey ON public.stock_counts USING btree (id);

CREATE INDEX idx_tags_team_id ON public.tags USING btree (team_id);
CREATE UNIQUE INDEX tags_pkey ON public.tags USING btree (id);

CREATE INDEX idx_team_invites_code ON public.team_invites USING btree (invite_code);
CREATE UNIQUE INDEX team_invites_invite_code_key ON public.team_invites USING btree (invite_code);
CREATE UNIQUE INDEX team_invites_pkey ON public.team_invites USING btree (id);

CREATE INDEX idx_team_members_team_id ON public.team_members USING btree (team_id);
CREATE INDEX idx_team_members_user_id ON public.team_members USING btree (user_id);
CREATE UNIQUE INDEX team_members_pkey ON public.team_members USING btree (id);
CREATE UNIQUE INDEX team_members_team_id_user_id_key ON public.team_members USING btree (team_id, user_id);
CREATE UNIQUE INDEX team_members_user_id_unique ON public.team_members USING btree (user_id);

CREATE UNIQUE INDEX teams_pkey ON public.teams USING btree (id);

CREATE INDEX idx_transactions_created ON public.transactions USING btree (created_at DESC);
CREATE INDEX idx_transactions_item ON public.transactions USING btree (item_id);
CREATE INDEX idx_transactions_performed_by ON public.transactions USING btree (performed_by);
CREATE INDEX idx_transactions_team_id ON public.transactions USING btree (team_id);
CREATE INDEX idx_transactions_type ON public.transactions USING btree (transaction_type);
CREATE UNIQUE INDEX transactions_pkey ON public.transactions USING btree (id);

-- ════════════════════════════════════════════════════════════════════
-- Functions (dump)
-- ════════════════════════════════════════════════════════════════════
-- Functions in public schema
-- Generated from pg_get_functiondef()

CREATE OR REPLACE FUNCTION public.get_client_accessible_folder_ids(p_user_id uuid)
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  WITH RECURSIVE accessible AS (
    SELECT f.id
    FROM folders f
    INNER JOIN client_folder_access cfa ON cfa.folder_id = f.id
    WHERE cfa.user_id = p_user_id

    UNION

    SELECT f.id
    FROM folders f
    INNER JOIN accessible a ON f.parent_folder_id = a.id
  )
  SELECT id FROM accessible;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_team_ids()
 RETURNS SETOF uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT team_id FROM team_members WHERE user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_client_role()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE user_id = auth.uid() AND role = 'client'
  );
$function$;

CREATE OR REPLACE FUNCTION public.is_team_admin(p_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = p_team_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$function$;

CREATE OR REPLACE FUNCTION public.pick_item(p_pick_list_item_id uuid, p_quantity_picked integer, p_picked_by uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_item_id UUID;
  v_current_picked INT;
  v_quantity_requested INT;
  v_actual_pick INT;
BEGIN
  SELECT item_id, quantity_picked, quantity_requested
  INTO v_item_id, v_current_picked, v_quantity_requested
  FROM pick_list_items
  WHERE id = p_pick_list_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pick list item not found';
  END IF;

  v_actual_pick := LEAST(p_quantity_picked, v_quantity_requested - v_current_picked);

  IF v_actual_pick <= 0 THEN
    RAISE EXCEPTION 'Nothing to pick';
  END IF;

  UPDATE pick_list_items
  SET
    quantity_picked = v_current_picked + v_actual_pick,
    picked_at = now(),
    picked_by = p_picked_by
  WHERE id = p_pick_list_item_id;

  UPDATE items
  SET quantity = GREATEST(quantity - v_actual_pick, 0)
  WHERE id = v_item_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Backfill an item's team_id from its creator's membership when a client
-- (notably the mobile app) inserts without setting it. NULL-team items are
-- invisible to the web/API, which scope every query by team. Only fill when
-- the creator belongs to exactly one team, so we never guess across teams.
CREATE OR REPLACE FUNCTION public.items_fill_team_id()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_count int;
  v_team  uuid;
BEGIN
  IF NEW.team_id IS NULL AND NEW.created_by IS NOT NULL THEN
    SELECT count(DISTINCT team_id), min(team_id::text)::uuid
      INTO v_count, v_team
      FROM public.team_members
      WHERE user_id = NEW.created_by;
    IF v_count = 1 THEN
      NEW.team_id := v_team;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- ════════════════════════════════════════════════════════════════════
-- Triggers (dump)
-- ════════════════════════════════════════════════════════════════════
-- Triggers (public + auth + storage)

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER trg_folders_updated_at BEFORE UPDATE ON public.folders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_items_updated_at BEFORE UPDATE ON public.items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_items_fill_team_id ON public.items;
CREATE TRIGGER trg_items_fill_team_id BEFORE INSERT ON public.items FOR EACH ROW EXECUTE FUNCTION public.items_fill_team_id();
CREATE TRIGGER set_pick_list_issues_updated_at BEFORE UPDATE ON public.pick_list_issues FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_pick_lists_updated_at BEFORE UPDATE ON public.pick_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER trg_stock_counts_updated_at BEFORE UPDATE ON public.stock_counts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- storage.* triggers are system-managed by Supabase; listed for reference only:
-- enforce_bucket_name_length_trigger (storage.buckets INSERT/UPDATE)
-- protect_buckets_delete (storage.buckets DELETE, STATEMENT)
-- protect_objects_delete (storage.objects DELETE, STATEMENT)
-- update_objects_updated_at (storage.objects BEFORE UPDATE)

-- ════════════════════════════════════════════════════════════════════
-- Views (dump)
-- ════════════════════════════════════════════════════════════════════
-- Views in public schema
-- Generated from pg_get_viewdef()

CREATE OR REPLACE VIEW public.folder_stats AS
 SELECT f.id AS folder_id,
    f.team_id,
    ( SELECT count(*) AS count
           FROM folders sub
          WHERE sub.parent_folder_id = f.id) AS subfolder_count,
    COALESCE(sum(i.quantity), 0::bigint) AS unit_count,
    COALESCE(sum(i.quantity::numeric * COALESCE(i.sell_price, i.cost_price, 0::numeric)), 0::numeric) AS total_value
   FROM folders f
     LEFT JOIN items i ON i.folder_id = f.id AND i.status = 'active'::text
  GROUP BY f.id, f.team_id;

CREATE OR REPLACE VIEW public.folder_thumbnails AS
 SELECT id AS folder_id,
    team_id,
    COALESCE(( SELECT array_agg(sub.photo) AS array_agg
           FROM ( SELECT unnest(i.photos) AS photo
                   FROM items i
                  WHERE i.folder_id = f.id AND i.status = 'active'::text AND i.photos IS NOT NULL AND array_length(i.photos, 1) > 0
                 LIMIT 4) sub), ARRAY[]::text[]) AS thumbnails
   FROM folders f;

-- ════════════════════════════════════════════════════════════════════
-- Web extension tables
-- ════════════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════════════
-- RLS policies (from policies.json)
-- ════════════════════════════════════════════════════════════════════
-- RLS policies (converted from schema/policies.json)

CREATE POLICY "Authenticated users can insert activity_log" ON public.activity_log
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create activity_log" ON public.activity_log
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids() AS get_user_team_ids)) OR ((team_id IS NULL) AND (user_id = auth.uid()))));

CREATE POLICY "Users can view activity_log" ON public.activity_log
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids() AS get_user_team_ids)) OR ((team_id IS NULL) AND (user_id = auth.uid()))));

CREATE POLICY "Clients can view own folder access" ON public.client_folder_access
  FOR SELECT
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "Owners/admins can manage client folder access" ON public.client_folder_access
  FOR ALL
  TO public
  USING ((team_id IN ( SELECT tm.team_id FROM team_members tm WHERE ((tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner','admin']))))));

CREATE POLICY "Authenticated users can insert folders" ON public.folders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create folders" ON public.folders
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can delete folders" ON public.folders
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can update folders" ON public.folders
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can view folders" ON public.folders
  FOR SELECT
  TO public
  USING ((((team_id IS NULL) AND (created_by = auth.uid())) OR ((team_id IN ( SELECT get_user_team_ids())) AND (NOT is_client_role())) OR ((team_id IN ( SELECT get_user_team_ids())) AND is_client_role() AND (id IN ( SELECT get_client_accessible_folder_ids(auth.uid()))))));

CREATE POLICY "Authenticated users can insert item_tags" ON public.item_tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create item_tags" ON public.item_tags
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (item_id IN ( SELECT items.id FROM items WHERE (items.created_by = auth.uid()))))));

CREATE POLICY "Users can delete item_tags" ON public.item_tags
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (item_id IN ( SELECT items.id FROM items WHERE (items.created_by = auth.uid()))))));

CREATE POLICY "Users can view item_tags" ON public.item_tags
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (item_id IN ( SELECT items.id FROM items WHERE (items.created_by = auth.uid()))))));

CREATE POLICY "Users can create items" ON public.items
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can delete items" ON public.items
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can update items" ON public.items
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can view items" ON public.items
  FOR SELECT
  TO public
  USING ((((team_id IS NULL) AND (created_by = auth.uid())) OR ((team_id IN ( SELECT get_user_team_ids())) AND (NOT is_client_role())) OR ((team_id IN ( SELECT get_user_team_ids())) AND is_client_role() AND (folder_id IN ( SELECT get_client_accessible_folder_ids(auth.uid()))))));

CREATE POLICY "Authenticated users can insert notifications" ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE
  TO authenticated
  USING ((user_id = auth.uid()))
  WITH CHECK ((user_id = auth.uid()));

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT
  TO authenticated
  USING ((user_id = auth.uid()));

CREATE POLICY "Authenticated users can insert comments" ON public.pick_list_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view comments" ON public.pick_list_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create pick_list_comments" ON public.pick_list_comments
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (user_id = auth.uid()))));

CREATE POLICY "Users can delete own comments" ON public.pick_list_comments
  FOR DELETE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can view pick_list_comments" ON public.pick_list_comments
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (user_id = auth.uid()))));

CREATE POLICY "Users can delete their own pick list issues" ON public.pick_list_issues
  FOR DELETE
  TO public
  USING ((reported_by = auth.uid()));

CREATE POLICY "Users can insert pick list issues for their team or personal data" ON public.pick_list_issues
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (reported_by = auth.uid()))));

CREATE POLICY "Users can update their own pick list issues" ON public.pick_list_issues
  FOR UPDATE
  TO public
  USING ((reported_by = auth.uid()));

CREATE POLICY "Users can view pick list issues for their team or personal data" ON public.pick_list_issues
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (reported_by = auth.uid()))));

CREATE POLICY "Authenticated users can insert pick_list_items" ON public.pick_list_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create pick_list_items" ON public.pick_list_items
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (pick_list_id IN ( SELECT pick_lists.id FROM pick_lists WHERE (pick_lists.created_by = auth.uid()))))));

CREATE POLICY "Users can delete pick_list_items" ON public.pick_list_items
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (pick_list_id IN ( SELECT pick_lists.id FROM pick_lists WHERE (pick_lists.created_by = auth.uid()))))));

CREATE POLICY "Users can update pick_list_items" ON public.pick_list_items
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (pick_list_id IN ( SELECT pick_lists.id FROM pick_lists WHERE (pick_lists.created_by = auth.uid()))))));

CREATE POLICY "Users can view pick_list_items" ON public.pick_list_items
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (pick_list_id IN ( SELECT pick_lists.id FROM pick_lists WHERE (pick_lists.created_by = auth.uid()))))));

CREATE POLICY "Authenticated users can insert pick_lists" ON public.pick_lists
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create pick_lists" ON public.pick_lists
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can delete pick_lists" ON public.pick_lists
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can update pick_lists" ON public.pick_lists
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can view pick_lists" ON public.pick_lists
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can delete purchase_order_items" ON public.purchase_order_items
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase_order_items" ON public.purchase_order_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update purchase_order_items" ON public.purchase_order_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view purchase_order_items" ON public.purchase_order_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert purchase_orders" ON public.purchase_orders
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create purchase_orders" ON public.purchase_orders
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can delete purchase_orders" ON public.purchase_orders
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can update purchase_orders" ON public.purchase_orders
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can view purchase_orders" ON public.purchase_orders
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Authenticated users can delete stock_count_items" ON public.stock_count_items
  FOR DELETE
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock_count_items" ON public.stock_count_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update stock_count_items" ON public.stock_count_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can view stock_count_items" ON public.stock_count_items
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert stock_counts" ON public.stock_counts
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create stock_counts" ON public.stock_counts
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can delete stock_counts" ON public.stock_counts
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can update stock_counts" ON public.stock_counts
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can view stock_counts" ON public.stock_counts
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Authenticated users can insert tags" ON public.tags
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create tags" ON public.tags
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can delete tags" ON public.tags
  FOR DELETE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can update tags" ON public.tags
  FOR UPDATE
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Users can view tags" ON public.tags
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (created_by = auth.uid()))));

CREATE POLICY "Admins can create invites" ON public.team_invites
  FOR INSERT
  TO public
  WITH CHECK ((team_id IN ( SELECT tm.team_id FROM team_members tm WHERE ((tm.user_id = auth.uid()) AND (tm.role = ANY (ARRAY['owner','admin']))))));

CREATE POLICY "Anyone can read invite by code" ON public.team_invites
  FOR SELECT
  TO public
  USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Invite can be updated on use" ON public.team_invites
  FOR UPDATE
  TO public
  USING ((auth.uid() IS NOT NULL));

CREATE POLICY "Users can view team invites" ON public.team_invites
  FOR SELECT
  TO public
  USING ((team_id IN ( SELECT get_user_team_ids())));

CREATE POLICY "Admins can delete team members" ON public.team_members
  FOR DELETE
  TO public
  USING (is_team_admin(team_id));

CREATE POLICY "Admins can update team members" ON public.team_members
  FOR UPDATE
  TO public
  USING (is_team_admin(team_id));

CREATE POLICY "Users can insert team members" ON public.team_members
  FOR INSERT
  TO public
  WITH CHECK (((user_id = auth.uid()) AND ((EXISTS ( SELECT 1 FROM teams t WHERE ((t.id = team_members.team_id) AND (t.created_by = auth.uid())))) OR (team_id IN ( SELECT get_user_team_ids())) OR (EXISTS ( SELECT 1 FROM team_invites ti WHERE ((ti.team_id = team_members.team_id) AND (ti.used_by IS NULL) AND (ti.expires_at > now())))))));

CREATE POLICY "Users can leave team" ON public.team_members
  FOR DELETE
  TO public
  USING ((user_id = auth.uid()));

CREATE POLICY "Users can view team members" ON public.team_members
  FOR SELECT
  TO public
  USING ((team_id IN ( SELECT get_user_team_ids())));

CREATE POLICY "Authenticated users can create teams" ON public.teams
  FOR INSERT
  TO public
  WITH CHECK ((auth.uid() IS NOT NULL));

CREATE POLICY "Team owners can update team" ON public.teams
  FOR UPDATE
  TO public
  USING ((id IN ( SELECT tm.team_id FROM team_members tm WHERE ((tm.user_id = auth.uid()) AND (tm.role = 'owner')))));

CREATE POLICY "Users can view own teams" ON public.teams
  FOR SELECT
  TO public
  USING (((id IN ( SELECT get_user_team_ids())) OR (created_by = auth.uid())));

CREATE POLICY "Authenticated users can insert transactions" ON public.transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can create transactions" ON public.transactions
  FOR INSERT
  TO public
  WITH CHECK (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (performed_by = auth.uid()))));

CREATE POLICY "Users can view transactions" ON public.transactions
  FOR SELECT
  TO public
  USING (((team_id IN ( SELECT get_user_team_ids())) OR ((team_id IS NULL) AND (performed_by = auth.uid()))));

