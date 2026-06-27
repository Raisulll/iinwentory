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
