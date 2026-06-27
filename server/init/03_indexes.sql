-- Indexes on public schema

CREATE UNIQUE INDEX activity_log_pkey ON public.activity_log USING btree (id);
CREATE INDEX idx_activity_log_item ON public.activity_log USING btree (item_id);
CREATE INDEX idx_activity_log_pick_list ON public.activity_log USING btree (pick_list_id);
CREATE INDEX idx_activity_log_team_id ON public.activity_log USING btree (team_id);
-- Composite index matching the /api/activity query (team scope + ordered cursor pagination).
CREATE INDEX idx_activity_log_team_timestamp ON public.activity_log USING btree (team_id, "timestamp" DESC, id DESC);
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
