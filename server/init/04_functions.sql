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
-- (notably the mobile app) inserts without setting it. Items with a NULL
-- team_id are invisible to the web/API, which scope every query by team — so
-- without this they silently vanish from the items list. Only fill when the
-- creator belongs to exactly one team, so we never guess across teams.
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
