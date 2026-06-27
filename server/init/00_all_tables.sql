create table public.activity_log (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  action_type text not null,
  item_id uuid null,
  pick_list_id uuid null,
  details jsonb not null default '{}'::jsonb,
  timestamp timestamp with time zone not null default now(),
  team_id uuid null,
  constraint activity_log_pkey primary key (id),
  constraint activity_log_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_activity_log_user on public.activity_log using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_activity_log_item on public.activity_log using btree (item_id) TABLESPACE pg_default;

create index IF not exists idx_activity_log_pick_list on public.activity_log using btree (pick_list_id) TABLESPACE pg_default;

create index IF not exists idx_activity_log_timestamp on public.activity_log using btree ("timestamp" desc) TABLESPACE pg_default;

create index IF not exists idx_activity_log_team_id on public.activity_log using btree (team_id) TABLESPACE pg_default;



create table public.client_folder_access (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  user_id uuid not null,
  folder_id uuid not null,
  granted_by uuid null,
  granted_at timestamp with time zone null default now(),
  constraint client_folder_access_pkey primary key (id),
  constraint client_folder_access_user_id_folder_id_key unique (user_id, folder_id),
  constraint client_folder_access_folder_id_fkey foreign KEY (folder_id) references folders (id) on delete CASCADE,
  constraint client_folder_access_granted_by_fkey foreign KEY (granted_by) references auth.users (id) on delete set null,
  constraint client_folder_access_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint client_folder_access_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_cfa_user_id on public.client_folder_access using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_cfa_team_user on public.client_folder_access using btree (team_id, user_id) TABLESPACE pg_default;


create view public.folder_stats as
select
  f.id as folder_id,
  f.team_id,
  (
    select
      count(*) as count
    from
      folders sub
    where
      sub.parent_folder_id = f.id
  ) as subfolder_count,
  COALESCE(sum(i.quantity), 0::bigint) as unit_count,
  COALESCE(
    sum(
      i.quantity::numeric * COALESCE(i.sell_price, i.cost_price, 0::numeric)
    ),
    0::numeric
  ) as total_value
from
  folders f
  left join items i on i.folder_id = f.id
  and i.status = 'active'::text
group by
  f.id,
  f.team_id;



create view public.folder_thumbnails as
select
  id as folder_id,
  team_id,
  COALESCE(
    (
      select
        array_agg(sub.photo) as array_agg
      from
        (
          select
            unnest(i.photos) as photo
          from
            items i
          where
            i.folder_id = f.id
            and i.status = 'active'::text
            and i.photos is not null
            and array_length(i.photos, 1) > 0
          limit
            4
        ) sub
    ),
    array[]::text[]
  ) as thumbnails
from
  folders f;



create table public.folders (
  id uuid not null default gen_random_uuid (),
  name text not null,
  parent_folder_id uuid null,
  icon text null,
  colour text null,
  description text null,
  sku text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  cover_image text null,
  team_id uuid null,
  created_by uuid null,
  constraint folders_pkey primary key (id),
  constraint folders_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint folders_parent_folder_id_fkey foreign KEY (parent_folder_id) references folders (id) on delete set null,
  constraint folders_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_folders_parent on public.folders using btree (parent_folder_id) TABLESPACE pg_default;

create index IF not exists idx_folders_team_id on public.folders using btree (team_id) TABLESPACE pg_default;

create trigger trg_folders_updated_at BEFORE
update on folders for EACH row
execute FUNCTION update_updated_at ();



create table public.item_tags (
  item_id uuid not null,
  tag_id uuid not null,
  team_id uuid null,
  constraint item_tags_pkey primary key (item_id, tag_id),
  constraint item_tags_item_id_fkey foreign KEY (item_id) references items (id) on delete CASCADE,
  constraint item_tags_tag_id_fkey foreign KEY (tag_id) references tags (id) on delete CASCADE,
  constraint item_tags_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_item_tags_tag on public.item_tags using btree (tag_id) TABLESPACE pg_default;


create table public.items (
  id uuid not null default gen_random_uuid (),
  name text not null,
  description text null,
  sku text null,
  quantity integer not null default 0,
  min_quantity integer not null default 0,
  cost_price numeric null,
  sell_price numeric null,
  weight numeric null,
  dimensions jsonb null,
  photos text[] null,
  custom_fields jsonb not null default '{}'::jsonb,
  folder_id uuid null,
  location text null,
  notes text null,
  status text not null default 'active'::text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null,
  team_id uuid null,
  constraint items_pkey primary key (id),
  constraint items_folder_id_fkey foreign KEY (folder_id) references folders (id) on delete set null,
  constraint items_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_items_folder_id on public.items using btree (folder_id) TABLESPACE pg_default;

create index IF not exists idx_items_sku on public.items using btree (sku) TABLESPACE pg_default;

create index IF not exists idx_items_status on public.items using btree (status) TABLESPACE pg_default;

create index IF not exists idx_items_name on public.items using btree (name) TABLESPACE pg_default;

create index IF not exists idx_items_created_by on public.items using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_items_team_id on public.items using btree (team_id) TABLESPACE pg_default;

create trigger trg_items_updated_at BEFORE
update on items for EACH row
execute FUNCTION update_updated_at ();


create table public.notifications (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  type text not null default 'info'::text,
  title text not null,
  message text null,
  related_item_id uuid null,
  related_pick_list_id uuid null,
  is_read boolean not null default false,
  created_at timestamp with time zone not null default now(),
  constraint notifications_pkey primary key (id),
  constraint notifications_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_notifications_user on public.notifications using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_notifications_read on public.notifications using btree (is_read) TABLESPACE pg_default;

create index IF not exists idx_notifications_created on public.notifications using btree (created_at desc) TABLESPACE pg_default;


create table public.pick_list_comments (
  id uuid not null default gen_random_uuid (),
  pick_list_id uuid not null,
  user_id uuid null,
  content text not null,
  created_at timestamp with time zone not null default now(),
  team_id uuid null,
  constraint pick_list_comments_pkey primary key (id),
  constraint pick_list_comments_pick_list_id_fkey foreign KEY (pick_list_id) references pick_lists (id) on delete CASCADE,
  constraint pick_list_comments_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_pick_list_comments_pick_list on public.pick_list_comments using btree (pick_list_id) TABLESPACE pg_default;


create table public.pick_list_issues (
  id uuid not null default gen_random_uuid (),
  pick_list_id uuid not null,
  pick_list_item_id uuid not null,
  issue_type text not null,
  quantity_affected integer not null default 0,
  quantity_actually_picked integer not null default 0,
  notes text null,
  reported_by uuid null,
  team_id uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint pick_list_issues_pkey primary key (id),
  constraint pick_list_issues_pick_list_id_fkey foreign KEY (pick_list_id) references pick_lists (id) on delete CASCADE,
  constraint pick_list_issues_pick_list_item_id_fkey foreign KEY (pick_list_item_id) references pick_list_items (id) on delete CASCADE,
  constraint pick_list_issues_reported_by_fkey foreign KEY (reported_by) references auth.users (id) on delete set null,
  constraint pick_list_issues_team_id_fkey foreign KEY (team_id) references teams (id),
  constraint pick_list_issues_issue_type_check check (
    (
      issue_type = any (
        array[
          'damaged_stock'::text,
          'missing_unit'::text,
          'wrong_stock_at_location'::text,
          'barcode_mismatch'::text,
          'other'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_pick_list_issues_pick_list_id on public.pick_list_issues using btree (pick_list_id) TABLESPACE pg_default;

create index IF not exists idx_pick_list_issues_pick_list_item_id on public.pick_list_issues using btree (pick_list_item_id) TABLESPACE pg_default;

create index IF not exists idx_pick_list_issues_team_id on public.pick_list_issues using btree (team_id) TABLESPACE pg_default;

create trigger set_pick_list_issues_updated_at BEFORE
update on pick_list_issues for EACH row
execute FUNCTION update_updated_at ();


create table public.pick_list_items (
  id uuid not null default gen_random_uuid (),
  pick_list_id uuid not null,
  item_id uuid not null,
  quantity_requested integer not null default 1,
  quantity_picked integer not null default 0,
  location_hint text null,
  unit_price numeric null,
  picked_at timestamp with time zone null,
  picked_by uuid null,
  sort_order integer not null default 0,
  created_at timestamp with time zone not null default now(),
  team_id uuid null,
  constraint pick_list_items_pkey primary key (id),
  constraint pick_list_items_item_id_fkey foreign KEY (item_id) references items (id) on delete CASCADE,
  constraint pick_list_items_pick_list_id_fkey foreign KEY (pick_list_id) references pick_lists (id) on delete CASCADE,
  constraint pick_list_items_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_pick_list_items_pick_list on public.pick_list_items using btree (pick_list_id) TABLESPACE pg_default;

create index IF not exists idx_pick_list_items_item on public.pick_list_items using btree (item_id) TABLESPACE pg_default;


create table public.pick_lists (
  id uuid not null default gen_random_uuid (),
  name text not null,
  status text not null default 'draft'::text,
  assigned_to uuid null,
  notes text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  created_by uuid null,
  team_id uuid null,
  client_id uuid null,
  constraint pick_lists_pkey primary key (id),
  constraint pick_lists_assigned_to_fkey foreign KEY (assigned_to) references profiles (id),
  constraint pick_lists_client_id_fkey foreign KEY (client_id) references auth.users (id) on delete set null,
  constraint pick_lists_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_pick_lists_client_id on public.pick_lists using btree (client_id) TABLESPACE pg_default
where
  (client_id is not null);

create index IF not exists idx_pick_lists_status on public.pick_lists using btree (status) TABLESPACE pg_default;

create index IF not exists idx_pick_lists_created_by on public.pick_lists using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_pick_lists_team_id on public.pick_lists using btree (team_id) TABLESPACE pg_default;

create trigger trg_pick_lists_updated_at BEFORE
update on pick_lists for EACH row
execute FUNCTION update_updated_at ();


create table public.profiles (
  id uuid not null,
  full_name text null,
  avatar_url text null,
  role text not null default 'member'::text,
  pin_hash text null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  department text null,
  permissions jsonb null default '{"role": "member"}'::jsonb,
  business_name text null,
  business_address text null,
  password_was_reset boolean null default false,
  constraint profiles_pkey primary key (id),
  constraint profiles_role_check check (
    (
      role = any (
        array['owner'::text, 'admin'::text, 'member'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_profiles_role on public.profiles using btree (role) TABLESPACE pg_default;

create trigger trg_profiles_updated_at BEFORE
update on profiles for EACH row
execute FUNCTION update_updated_at ();


create table public.purchase_order_items (
  id uuid not null default gen_random_uuid (),
  po_id uuid not null,
  item_id uuid not null,
  quantity_ordered integer not null default 0,
  quantity_received integer not null default 0,
  unit_cost numeric null,
  received_at timestamp with time zone null,
  received_by uuid null,
  constraint purchase_order_items_pkey primary key (id),
  constraint purchase_order_items_item_id_fkey foreign KEY (item_id) references items (id) on delete CASCADE,
  constraint purchase_order_items_po_id_fkey foreign KEY (po_id) references purchase_orders (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_po_items_po on public.purchase_order_items using btree (po_id) TABLESPACE pg_default;

create index IF not exists idx_po_items_item on public.purchase_order_items using btree (item_id) TABLESPACE pg_default;


create table public.purchase_orders (
  id uuid not null default gen_random_uuid (),
  po_number text not null,
  supplier_name text not null,
  status text not null default 'draft'::text,
  notes text null,
  order_date timestamp with time zone null default now(),
  expected_date timestamp with time zone null,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  team_id uuid null,
  constraint purchase_orders_pkey primary key (id),
  constraint purchase_orders_po_number_key unique (po_number),
  constraint purchase_orders_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_status on public.purchase_orders using btree (status) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_po_number on public.purchase_orders using btree (po_number) TABLESPACE pg_default;

create index IF not exists idx_purchase_orders_team_id on public.purchase_orders using btree (team_id) TABLESPACE pg_default;

create trigger trg_purchase_orders_updated_at BEFORE
update on purchase_orders for EACH row
execute FUNCTION update_updated_at ();


create table public.stock_count_items (
  id uuid not null default gen_random_uuid (),
  stock_count_id uuid not null,
  item_id uuid not null,
  expected_quantity integer not null default 0,
  counted_quantity integer null,
  difference integer null,
  counted_by uuid null,
  counted_at timestamp with time zone null,
  notes text null,
  constraint stock_count_items_pkey primary key (id),
  constraint stock_count_items_item_id_fkey foreign KEY (item_id) references items (id) on delete CASCADE,
  constraint stock_count_items_stock_count_id_fkey foreign KEY (stock_count_id) references stock_counts (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_stock_count_items_sc on public.stock_count_items using btree (stock_count_id) TABLESPACE pg_default;

create index IF not exists idx_stock_count_items_item on public.stock_count_items using btree (item_id) TABLESPACE pg_default;


create table public.stock_counts (
  id uuid not null default gen_random_uuid (),
  name text not null,
  status text not null default 'draft'::text,
  notes text null,
  created_by uuid null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  completed_at timestamp with time zone null,
  team_id uuid null,
  constraint stock_counts_pkey primary key (id),
  constraint stock_counts_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_stock_counts_status on public.stock_counts using btree (status) TABLESPACE pg_default;

create index IF not exists idx_stock_counts_created_by on public.stock_counts using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_stock_counts_team_id on public.stock_counts using btree (team_id) TABLESPACE pg_default;

create trigger trg_stock_counts_updated_at BEFORE
update on stock_counts for EACH row
execute FUNCTION update_updated_at ();


create table public.subscription_events (
  id uuid not null default gen_random_uuid (),
  team_id uuid null,
  stripe_event_id text null,
  event_type text not null,
  plan text null,
  billing_interval text null,
  status text null,
  raw jsonb null,
  created_at timestamp with time zone not null default now(),
  constraint subscription_events_pkey primary key (id),
  constraint subscription_events_stripe_event_id_key unique (stripe_event_id),
  constraint subscription_events_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists subscription_events_team_idx on public.subscription_events using btree (team_id, created_at desc) TABLESPACE pg_default;


create table public.tags (
  id uuid not null default gen_random_uuid (),
  name text not null,
  colour text null,
  created_at timestamp with time zone not null default now(),
  team_id uuid null,
  created_by uuid null,
  constraint tags_pkey primary key (id),
  constraint tags_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint tags_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_tags_team_id on public.tags using btree (team_id) TABLESPACE pg_default;


create table public.team_billing (
  team_id uuid not null,
  plan_id text not null default 'free'::text,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  stripe_price_id text null,
  trial_ends_at timestamp with time zone null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint team_billing_pkey primary key (team_id),
  constraint team_billing_stripe_customer_id_key unique (stripe_customer_id),
  constraint team_billing_stripe_subscription_id_key unique (stripe_subscription_id),
  constraint team_billing_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger trg_team_billing_updated_at BEFORE
update on team_billing for EACH row
execute FUNCTION update_updated_at ();


create table public.team_invites (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  invite_code text not null,
  created_by uuid null,
  expires_at timestamp with time zone null default (now() + '7 days'::interval),
  used_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint team_invites_pkey primary key (id),
  constraint team_invites_invite_code_key unique (invite_code),
  constraint team_invites_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint team_invites_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint team_invites_used_by_fkey foreign KEY (used_by) references auth.users (id) on delete set null
) TABLESPACE pg_default;

create index IF not exists idx_team_invites_code on public.team_invites using btree (invite_code) TABLESPACE pg_default;

create table public.team_members (
  id uuid not null default gen_random_uuid (),
  team_id uuid not null,
  user_id uuid not null,
  role text not null default 'member'::text,
  joined_at timestamp with time zone null default now(),
  constraint team_members_pkey primary key (id),
  constraint team_members_team_id_user_id_key unique (team_id, user_id),
  constraint team_members_user_id_unique unique (user_id),
  constraint team_members_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE,
  constraint team_members_user_id_profiles_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint team_members_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE,
  constraint team_members_role_check check (
    (
      role = any (
        array[
          'owner'::text,
          'admin'::text,
          'member'::text,
          'client'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_team_members_user_id on public.team_members using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_team_members_team_id on public.team_members using btree (team_id) TABLESPACE pg_default;


create table public.teams (
  id uuid not null default gen_random_uuid (),
  name text not null,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  plan text not null default 'free'::text,
  billing_interval text null,
  subscription_status text null,
  stripe_customer_id text null,
  stripe_subscription_id text null,
  subscription_current_period_end timestamp with time zone null,
  subscription_cancel_at_period_end boolean not null default false,
  subscription_source text null,
  apple_original_transaction_id text null,
  constraint teams_pkey primary key (id),
  constraint teams_created_by_fkey foreign KEY (created_by) references auth.users (id) on delete set null,
  constraint teams_billing_interval_check check (
    (
      billing_interval = any (array['monthly'::text, 'annual'::text])
    )
  ),
  constraint teams_plan_check check (
    (
      plan = any (
        array['free'::text, 'advanced'::text, 'premium'::text]
      )
    )
  ),
  constraint teams_subscription_source_check check (
    (
      subscription_source = any (array['stripe'::text, 'apple'::text])
    )
  )
) TABLESPACE pg_default;

create index IF not exists teams_stripe_customer_idx on public.teams using btree (stripe_customer_id) TABLESPACE pg_default;

create index IF not exists teams_stripe_subscription_idx on public.teams using btree (stripe_subscription_id) TABLESPACE pg_default;

create unique INDEX IF not exists teams_apple_original_tx_idx on public.teams using btree (apple_original_transaction_id) TABLESPACE pg_default
where
  (apple_original_transaction_id is not null);

  create table public.transactions (
  id uuid not null default gen_random_uuid (),
  item_id uuid null,
  transaction_type text not null,
  quantity_before integer not null default 0,
  quantity_after integer not null default 0,
  quantity_change integer not null default 0,
  reference_id uuid null,
  reference_type text null,
  performed_by uuid null,
  notes text null,
  folder_name text null,
  item_name text null,
  created_at timestamp with time zone not null default now(),
  team_id uuid null,
  constraint transactions_pkey primary key (id),
  constraint transactions_item_id_fkey foreign KEY (item_id) references items (id) on delete set null,
  constraint transactions_team_id_fkey foreign KEY (team_id) references teams (id)
) TABLESPACE pg_default;

create index IF not exists idx_transactions_item on public.transactions using btree (item_id) TABLESPACE pg_default;

create index IF not exists idx_transactions_type on public.transactions using btree (transaction_type) TABLESPACE pg_default;

create index IF not exists idx_transactions_created on public.transactions using btree (created_at desc) TABLESPACE pg_default;

create index IF not exists idx_transactions_performed_by on public.transactions using btree (performed_by) TABLESPACE pg_default;

create index IF not exists idx_transactions_team_id on public.transactions using btree (team_id) TABLESPACE pg_default;


create table public.web_password_resets (
  user_id uuid not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  constraint web_password_resets_pkey primary key (user_id),
  constraint web_password_resets_token_hash_key unique (token_hash),
  constraint web_password_resets_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.web_pick_list_codes (
  pick_list_id uuid not null,
  code text not null,
  constraint web_pick_list_codes_pkey primary key (pick_list_id),
  constraint web_pick_list_codes_code_key unique (code),
  constraint web_pick_list_codes_pick_list_id_fkey foreign KEY (pick_list_id) references pick_lists (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.web_refresh_tokens (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  token_hash text not null,
  expires_at timestamp with time zone not null,
  created_at timestamp with time zone not null default now(),
  constraint web_refresh_tokens_pkey primary key (id),
  constraint web_refresh_tokens_token_hash_key unique (token_hash),
  constraint web_refresh_tokens_user_id_fkey foreign KEY (user_id) references auth.users (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_web_refresh_tokens_user on public.web_refresh_tokens using btree (user_id) TABLESPACE pg_default;


create table public.web_team_settings (
  team_id uuid not null,
  currency text not null default '£'::text,
  default_view text not null default 'grid'::text,
  low_stock_alerts boolean not null default true,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint web_team_settings_pkey primary key (team_id),
  constraint web_team_settings_team_id_fkey foreign KEY (team_id) references teams (id) on delete CASCADE
) TABLESPACE pg_default;

create trigger trg_web_team_settings_updated_at BEFORE
update on web_team_settings for EACH row
execute FUNCTION update_updated_at ();