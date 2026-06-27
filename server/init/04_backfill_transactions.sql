-- ─────────────────────────────────────────────────────────────────────────────
-- Backfill: seed a "create" transaction for every existing item.
--
-- The transactions audit trail only started capturing item lifecycle events
-- (create / adjustment / move / update / delete) from the application code
-- onward. Items that already existed have no rows, so the Transactions report
-- shows up blank for them. This script inserts one historical "create" row per
-- item, preserving the item's original created_at / created_by.
--
-- Idempotent: re-running it will NOT create duplicates — it skips any item that
-- already has a "create" transaction.
-- ─────────────────────────────────────────────────────────────────────────────

insert into public.transactions (
  item_id,
  transaction_type,
  quantity_before,
  quantity_after,
  quantity_change,
  performed_by,
  item_name,
  folder_name,
  notes,
  team_id,
  created_at
)
select
  i.id,
  'create',
  0,
  i.quantity,
  i.quantity,
  i.created_by,
  i.name,
  f.name,
  'Item created (backfilled)',
  i.team_id,
  i.created_at
from public.items i
left join public.folders f on f.id = i.folder_id
where not exists (
  select 1
  from public.transactions t
  where t.item_id = i.id
    and t.transaction_type = 'create'
);
