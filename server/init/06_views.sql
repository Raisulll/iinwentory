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
