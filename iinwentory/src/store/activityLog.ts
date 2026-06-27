import type { ActivityLogEntry, ActivityEntityType } from '../types';
import { apiGet } from '../lib/api';

interface ActivityPage {
  items: ActivityLogEntry[];
  nextCursor: string | null;
}

// Each /api/activity call is a ~1s round-trip to the remote Supabase pooler
// (the query itself runs in <1ms), so the page count — not page size — dominates
// load time. We fetch in 2000-row pages (the server's hard cap) to cover typical
// teams in a single round-trip instead of several sequential ones.
const PAGE_SIZE = 2000;
const MAX_PAGES = 10; // 20k entries hard cap to protect the UI thread

/**
 * Map from backend underscore-format action strings to the dot-notation format
 * the UI components expect.  Covers every known backend action.
 */
const ACTION_MAP: Record<string, { action: string; entityType: ActivityEntityType }> = {
  item_created:           { action: 'item.created',               entityType: 'item' },
  item_updated:           { action: 'item.updated',               entityType: 'item' },
  item_deleted:           { action: 'item.deleted',               entityType: 'item' },
  item_moved:             { action: 'item.moved',                 entityType: 'item' },
  quantity_adjusted:      { action: 'item.qty_changed',           entityType: 'item' },
  folder_created:         { action: 'folder.created',             entityType: 'folder' },
  folder_updated:         { action: 'folder.updated',             entityType: 'folder' },
  folder_deleted:         { action: 'folder.deleted',             entityType: 'folder' },
  folder_moved:           { action: 'folder.moved',               entityType: 'folder' },
  tag_created:            { action: 'tag.created',                entityType: 'tag' },
  tag_updated:            { action: 'tag.updated',                entityType: 'tag' },
  tag_deleted:            { action: 'tag.deleted',                entityType: 'tag' },
  pick_list_created:      { action: 'pick_list.created',          entityType: 'pick_list' },
  pick_list_deleted:      { action: 'pick_list.deleted',          entityType: 'pick_list' },
  pick_list_updated:      { action: 'pick_list.status_changed',   entityType: 'pick_list' },
  pick_list_completed:    { action: 'pick_list.status_changed',   entityType: 'pick_list' },
  pick_list_issue:        { action: 'pick_list.issue_reported',   entityType: 'pick_list' },
  stock_count_created:    { action: 'stock_count.created',        entityType: 'stock_count' },
  stock_count_completed:  { action: 'stock_count.completed',      entityType: 'stock_count' },
  stock_count_deleted:    { action: 'stock_count.deleted',        entityType: 'stock_count' },
  purchase_order_created: { action: 'purchase_order.created',     entityType: 'purchase_order' },
  purchase_order_updated: { action: 'purchase_order.updated',     entityType: 'purchase_order' },
  purchase_order_deleted: { action: 'purchase_order.deleted',     entityType: 'purchase_order' },
  purchase_order_received:{ action: 'purchase_order.received',    entityType: 'purchase_order' },
};

/**
 * Normalize a raw activity log entry from the backend so every downstream
 * consumer gets dot-notation actions (e.g. "item.created") and populated
 * entityName / detail fields regardless of how the backend serialises them.
 */
function normalizeEntry(raw: ActivityLogEntry): ActivityLogEntry {
  // Already in dot-notation → pass through as-is.
  if (raw.action.includes('.')) return raw;

  const mapped = ACTION_MAP[raw.action];
  const action    = mapped?.action    ?? raw.action;
  const entityType = mapped?.entityType ?? raw.entityType;

  // Parse string-encoded details if needed.
  let details = raw.details;
  if (typeof details === 'string') {
    try { details = JSON.parse(details); } catch { details = {}; }
  }
  const d = (details && typeof details === 'object') ? details as Record<string, unknown> : {};

  // Recover missing entityName from common detail fields.
  let entityName = raw.entityName;
  if (!entityName) {
    if (typeof d.name === 'string' && d.name)         entityName = d.name;
    else if (typeof d.itemName === 'string' && d.itemName) entityName = d.itemName;
  }

  // For quantity_adjusted → item.qty_changed, ensure before/after are surfaced.
  if (raw.action === 'quantity_adjusted') {
    if (d.previousQuantity !== undefined && d.before === undefined) d.before = d.previousQuantity;
    if (d.newQuantity !== undefined      && d.after  === undefined) d.after  = d.newQuantity;
  }

  // Inject expected status for pick-list lifecycle events.
  if (raw.action === 'pick_list_completed' && d.status === undefined) d.status = 'completed';
  if (raw.action === 'pick_list_updated'   && d.status === undefined) {
    d.status = typeof d.newStatus === 'string' ? d.newStatus : 'ready';
  }

  return { ...raw, action, entityType, entityName, details: d };
}

/**
 * Fetch a single page of activity log entries.
 */
export async function fetchActivityLogPage(opts: {
  itemId?: string;
  cursor?: string | null;
  limit?: number;
} = {}): Promise<ActivityPage> {
  const params = new URLSearchParams();
  if (opts.itemId) params.set('itemId', opts.itemId);
  if (opts.cursor) params.set('cursor', opts.cursor);
  params.set('limit', String(opts.limit ?? PAGE_SIZE));
  // Normalize so callers always get a well-formed page. Guards against a
  // backend that returns a bare array or omits `items` — otherwise
  // `[...res.items]` throws "res.items is not iterable".
  const res = await apiGet<ActivityPage | ActivityLogEntry[]>(`/api/activity?${params.toString()}`);
  if (Array.isArray(res)) return { items: res.map(normalizeEntry), nextCursor: null };
  return { items: (res?.items ?? []).map(normalizeEntry), nextCursor: res?.nextCursor ?? null };
}

/**
 * Fetch the activity log from the server. Cursor-paginates under the hood
 * so callers see every entry (up to MAX_PAGES * PAGE_SIZE = 10k as a safety
 * cap). Previously hard-capped at 500 server-side.
 */
export async function fetchActivityLog(itemId?: string): Promise<ActivityLogEntry[]> {
  const all: ActivityLogEntry[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_PAGES; page++) {
    const res: ActivityPage = await fetchActivityLogPage({ itemId, cursor });
    all.push(...res.items);
    if (!res.nextCursor) break;
    cursor = res.nextCursor;
  }
  return all;
}

/**
 * @deprecated Server logs activities automatically on every CRUD operation.
 * Kept as a no-op so workflow store callers don't break.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function logActivity(_entry: unknown): void { /* no-op */ }

/** @deprecated Not supported server-side. */
export function clearActivityLog(): void { /* no-op */ }

/** @deprecated Use fetchActivityLog() (async). */
export function getActivityLog(): ActivityLogEntry[] { return []; }
