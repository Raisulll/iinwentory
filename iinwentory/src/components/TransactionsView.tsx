import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useTeam } from '../store/useTeamStore';
import DateRangeFilter from './DateRangeFilter';
import { DEFAULT_DATE_RANGE, isInDateRange } from '../lib/dateRange';
import type { DateRangeValue } from '../lib/dateRange';
import type { ActivityLogEntry } from '../types';
import {
  Package, RefreshCw, Search as SearchIcon, Loader2, Download,
  Folder, Tag, ClipboardList, ShoppingCart, BarChart2,
  ArrowUpRight, ArrowDownRight, Plus, Trash2, Edit3, FolderInput,
  CheckCircle2, AlertTriangle, RotateCcw, ChevronRight,
} from 'lucide-react';

type TypeFilter = 'all' | 'created' | 'increased' | 'decreased' | 'deleted';

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Format a timestamp as "19 Jun, 2026, 20:01" (24-hour clock). */
function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${MONTHS[d.getMonth()]}, ${d.getFullYear()}, ${hh}:${mm}`;
}

/** The verb portion of a backend action string, e.g. "item.created" → "created". */
function verbOf(action: string): string {
  return action.includes('.') ? (action.split('.').pop() ?? action) : action;
}

interface TxView {
  title: string;       // e.g. "Quantity increased"
  detail: string;      // e.g. "12 → 15"
  reason: string;      // optional context
  change: number;      // signed quantity delta (0 if not a quantity event)
  color: string;
  kind: TypeFilter | 'updated' | 'moved' | 'other';
  linkable: boolean;   // true → row opens the item page
  entityType: string;  // "item", "folder", etc.
  verb: string;        // "created", "deleted", etc.
}

const ENTITY_LABEL: Record<string, string> = {
  item: 'Item', folder: 'Folder', tag: 'Tag', pick_list: 'Pick List',
  purchase_order: 'Purchase Order', stock_count: 'Stock Count',
};

const GREEN = '#047857', RED = '#B91C1C', BLUE = '#1D4ED8', GREY = 'var(--text-medium)';
const PURPLE = '#7C3AED', AMBER = '#D97706', CYAN = '#0891B2', ROSE = '#E11D48';

const ACTION_COLORS: Record<string, string> = {
  created: GREEN, updated: BLUE, deleted: RED, moved: AMBER,
  qty_changed: PURPLE, status_changed: CYAN,
  issue_reported: ROSE, received: GREEN, completed: CYAN,
};

/** Icon components for entity types */
const ENTITY_ICONS: Record<string, typeof Package> = {
  item: Package, folder: Folder, tag: Tag,
  pick_list: ClipboardList, purchase_order: ShoppingCart, stock_count: BarChart2,
};

/** Icon components for action verbs */
const VERB_ICONS: Record<string, typeof Package> = {
  created: Plus, deleted: Trash2, updated: Edit3, moved: FolderInput,
  qty_changed: RotateCcw, status_changed: CheckCircle2,
  issue_reported: AlertTriangle, received: ArrowDownRight, completed: CheckCircle2,
};

/** Human-readable verb labels for action badge */
const VERB_LABELS: Record<string, string> = {
  created: 'Created', updated: 'Updated', deleted: 'Deleted', moved: 'Moved',
  qty_changed: 'Qty Changed', status_changed: 'Status Changed',
  issue_reported: 'Issue', received: 'Received', completed: 'Completed',
};

/** Build a human-readable sentence for any activity entry from its details. */
function describeActivity(entry: ActivityLogEntry): string {
  const d = (entry.details && typeof entry.details === 'object')
    ? entry.details as Record<string, unknown>
    : {};
  const name = entry.entityName || (typeof d.name === 'string' ? d.name : '');
  const q = name ? `"${name}"` : '';
  const str = (v: unknown) => (v === null || v === undefined ? '' : String(v));

  switch (entry.action) {
    case 'item.created':
      return `Created item ${q}${d.quantity !== undefined ? ` · qty ${str(d.quantity)}` : ''}`;
    case 'item.updated':
      return `Updated item ${q}`;
    case 'item.deleted':
      return `Deleted item ${q}`;
    case 'item.moved':
      return `Moved item ${q} to another folder`;
    case 'item.qty_changed': {
      if (d.before !== undefined && d.after !== undefined)
        return `${q} quantity ${str(d.before)} → ${str(d.after)}`;
      const ch = Number(d.change ?? 0);
      const sign = ch > 0 ? `+${ch}` : str(ch);
      return `${q} quantity ${sign}${d.reason ? ` · ${str(d.reason)}` : ''}`;
    }
    case 'folder.created':
      return `Created folder ${q}`;
    case 'folder.updated':
      return `Updated folder ${q}`;
    case 'folder.moved':
      return `Moved folder ${q}`;
    case 'folder.deleted': {
      const extra = Array.isArray(d.cascadeIds) && d.cascadeIds.length > 1
        ? ` and ${d.cascadeIds.length - 1} subfolder${d.cascadeIds.length - 1 > 1 ? 's' : ''}`
        : '';
      return `Deleted folder ${q}${extra}`;
    }
    case 'pick_list.created':
      return `Created pick list ${q}`;
    case 'pick_list.deleted':
      return `Deleted pick list ${q}`;
    case 'pick_list.status_changed':
      return `Pick list ${q} → ${str(d.status)}`;
    case 'pick_list.issue_reported':
      return `Issue reported${d.issueType ? ` (${str(d.issueType)})` : ''}`
        + `${d.qtyAffected !== undefined ? ` · ${str(d.qtyAffected)} affected` : ''}`;
    case 'tag.created':
      return `Created tag ${q}`;
    case 'tag.updated':
      return `Updated tag ${q}`;
    case 'tag.deleted':
      return `Deleted tag ${q}`;
    case 'stock_count.created':
      return `Created stock count ${q}`;
    case 'stock_count.deleted':
      return `Deleted stock count ${q}`;
    case 'stock_count.completed':
      return `Applied stock count ${q}`;
    case 'purchase_order.created':
      return `Created purchase order ${q}${d.supplier ? ` · ${str(d.supplier)}` : ''}`;
    case 'purchase_order.updated':
      return `Updated purchase order ${q}`;
    case 'purchase_order.deleted':
      return `Deleted purchase order ${q}`;
    case 'purchase_order.received':
      return `Received purchase order ${q}${d.supplier ? ` · ${str(d.supplier)}` : ''}`;
    default:
      return name ? `${entry.action} · ${name}` : entry.action;
  }
}

/** Translate any activity-log entry into a rich, human-readable transaction row. */
function describe(entry: ActivityLogEntry): TxView {
  const d = (entry.details && typeof entry.details === 'object')
    ? entry.details as Record<string, unknown>
    : {};
  const num = (v: unknown): number | undefined =>
    v === null || v === undefined || v === '' ? undefined : Number(v);
  const str = (v: unknown): string => (typeof v === 'string' ? v : '');

  const et = entry.action.includes('.')
    ? entry.action.split('.')[0]
    : (entry.entityType || '');
  const verb = verbOf(entry.action);
  const isItem = et === 'item';
  const entityLabel = ENTITY_LABEL[et] ?? (et || 'Record');

  // ── Item quantity change ──
  if (isItem && verb === 'qty_changed') {
    const before = num(d.before);
    const after = num(d.after);
    const change = after !== undefined && before !== undefined
      ? after - before
      : (num(d.change) ?? 0);
    const up = change > 0;
    const detail = before !== undefined && after !== undefined
      ? `${before} → ${after}`
      : `${up ? '+' : ''}${change}`;
    return {
      title: up ? 'Quantity increased' : 'Quantity decreased',
      detail,
      reason: str(d.reason),
      change,
      color: up ? GREEN : RED,
      kind: up ? 'increased' : 'decreased',
      linkable: true,
      entityType: et,
      verb,
    };
  }

  if (isItem && verb === 'created') {
    const qty = num(d.quantity);
    return {
      title: 'Item created',
      detail: qty !== undefined ? `Starting qty ${qty}` : '',
      reason: '', change: qty ?? 0, color: GREEN, kind: 'created', linkable: true,
      entityType: et, verb,
    };
  }
  if (isItem && verb === 'deleted')
    return { title: 'Item deleted', detail: '', reason: '', change: 0, color: RED, kind: 'deleted', linkable: false, entityType: et, verb };
  if (isItem && verb === 'moved')
    return { title: 'Moved to another folder', detail: '', reason: '', change: 0, color: AMBER, kind: 'moved', linkable: true, entityType: et, verb };
  if (isItem && verb === 'updated')
    return { title: 'Item updated', detail: '', reason: '', change: 0, color: BLUE, kind: 'updated', linkable: true, entityType: et, verb };

  // ── Everything else ──
  const VERB_TEXT: Record<string, string> = {
    created: 'created', updated: 'updated', deleted: 'deleted', moved: 'moved',
    status_changed: 'status changed', issue_reported: 'issue reported',
    received: 'received', completed: 'completed',
  };
  const kind: TxView['kind'] =
    verb === 'created' ? 'created'
    : verb === 'deleted' ? 'deleted'
    : 'other';
  const color = ACTION_COLORS[verb] ?? GREY;

  let detail = '';
  if (verb === 'status_changed' && str(d.status)) detail = str(d.status);
  else if (verb === 'received' && str(d.supplier)) detail = str(d.supplier);
  else if (verb === 'issue_reported' && str(d.issueType)) detail = str(d.issueType);

  return {
    title: `${entityLabel} ${VERB_TEXT[verb] ?? verb}`,
    detail,
    reason: '',
    change: 0,
    color,
    kind,
    linkable: false,
    entityType: et,
    verb,
  };
}

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/**
 * Transactions audit view. Driven by the activity log so it shows the full
 * item lifecycle — created, quantity adjusted (↑/↓), updated, moved, deleted —
 * with rich detail. Rendered as a sub-tab inside the Reports page.
 */
export default function TransactionsView({ entries, onRefresh }: {
  /** Activity log, prefetched and owned by the parent (shared with Activity History). */
  entries: ActivityLogEntry[] | null;
  /** Re-fetch the shared activity log; resolves when done. */
  onRefresh?: () => Promise<void> | void;
}) {
  const { members } = useTeam();
  const store = useStore();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const [reloading, setReloading] = useState(false);

  const userName = (id: string | null | undefined): string => {
    if (!id) return 'System';
    const m = members.find(m => m.id === id);
    return m?.name ?? m?.email ?? 'Member';
  };

  // Resolve an item id by name, so rows still link to the item page even when
  // the API omits entityId. Deleted items aren't in the store → no match → no
  // link, which is exactly what we want.
  const itemIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of store.items) if (!m.has(it.name)) m.set(it.name, it.id);
    return m;
  }, [store.items]);

  // Build a map from item id → item name so we can resolve missing entityName.
  // Uses both the live store (for active items) and the activity log itself
  // (for deleted items — their "created"/"updated" entries still carry the name).
  const itemNameById = useMemo(() => {
    const m = new Map<string, string>();
    // Start with the live store
    for (const it of store.items) m.set(it.id, it.name);
    // Supplement with names from the activity log entries themselves.
    // Earlier entries (created/updated) carry the name even after deletion.
    for (const e of (entries ?? [])) {
      if (e.entityId && e.entityName && !m.has(e.entityId)) {
        m.set(e.entityId, e.entityName);
      }
      // Also try details.name / details.itemName
      if (e.entityId && !m.has(e.entityId)) {
        const d = (e.details && typeof e.details === 'object') ? e.details as Record<string, unknown> : {};
        const name = (typeof d.name === 'string' && d.name) ? d.name
          : (typeof d.itemName === 'string' && d.itemName) ? d.itemName
          : null;
        if (name) m.set(e.entityId, name);
      }
    }
    return m;
  }, [store.items, entries]);

  const rows = useMemo(() => {
    return (entries ?? [])
      // Only show item-related entries (filter out pick lists, folders, tags, etc.)
      .filter(e => {
        const et = e.action.includes('.') ? e.action.split('.')[0] : (e.entityType || '');
        return et === 'item';
      })
      .map(e => {
        // Resolve missing entityName from the combined name cache
        if (!e.entityName && e.entityId) {
          const resolved = itemNameById.get(e.entityId);
          if (resolved) e = { ...e, entityName: resolved };
        }
        return { entry: e, view: describe(e) };
      });
  }, [entries, itemNameById]);

  // Rows restricted to the selected date range (by event timestamp). Type-filter
  // counts and the visible list both derive from this so they stay consistent.
  const dateRows = useMemo(
    () => rows.filter(r => isInDateRange(r.entry.timestamp, dateRange)),
    [rows, dateRange]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return dateRows.filter(({ entry, view }) => {
      if (typeFilter !== 'all' && view.kind !== typeFilter) return false;
      if (!q) return true;
      return (entry.entityName ?? '').toLowerCase().includes(q)
        || view.title.toLowerCase().includes(q)
        || view.reason.toLowerCase().includes(q)
        || describeActivity(entry).toLowerCase().includes(q);
    });
  }, [dateRows, query, typeFilter]);

  const refresh = async () => {
    if (!onRefresh) return;
    setReloading(true);
    await onRefresh();
    setReloading(false);
  };

  const handleExport = () => {
    if (!entries) return;
    exportCSV(
      [['When', 'Type', 'Name', 'Event', 'Detail', 'Change', 'By'],
       ...filtered.map(({ entry, view }) => [
         new Date(entry.timestamp).toISOString(),
         ENTITY_LABEL[view.entityType] ?? view.entityType,
         entry.entityName ?? '',
         view.title,
         view.detail || view.reason,
         view.change !== 0 ? (view.change > 0 ? `+${view.change}` : String(view.change)) : '',
         userName(entry.userId),
       ])],
      `transactions-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  };

  const filters: TypeFilter[] = ['all', 'created', 'increased', 'decreased', 'deleted'];
  const filterLabel: Record<TypeFilter, string> = {
    all: 'All', created: 'Created', increased: 'Increased', decreased: 'Decreased', deleted: 'Deleted',
  };
  const filterCount: Record<TypeFilter, number> = {
    all: dateRows.length,
    created: dateRows.filter(r => r.view.kind === 'created').length,
    increased: dateRows.filter(r => r.view.kind === 'increased').length,
    decreased: dateRows.filter(r => r.view.kind === 'decreased').length,
    deleted: dateRows.filter(r => r.view.kind === 'deleted').length,
  };

  return (
    <>
      <div className="page-header" style={{ marginBottom: 18, alignItems: 'flex-start' }}>
        <div style={{ minWidth: 0 }}>
          <span className="page-eyebrow"><RotateCcw size={11} strokeWidth={2.4} /> Audit trail</span>
          <h1>Transactions</h1>
          <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 14, maxWidth: 620 }}>
            Every change across your inventory — items, folders, tags, pick lists, purchase orders and stock counts.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={refresh} disabled={reloading}>
            {reloading ? <Loader2 size={14} className="spin" /> : <RefreshCw size={14} />} Refresh
          </button>
          <button className="btn-outline" onClick={handleExport} disabled={!entries}>
            <Download size={14} /> Export CSV
          </button>
        </div>
      </div>

      <div className="toolbar" style={{ marginBottom: 16 }}>
        <div className="toolbar-left" style={{ flex: 1, minWidth: 220 }}>
          <div className="toolbar-search-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 420 }}>
            <SearchIcon size={15} strokeWidth={2.1} />
            <input
              className="toolbar-search"
              placeholder="Search by item name, event, or description…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
          <DateRangeFilter value={dateRange} onChange={setDateRange} />
        </div>
        <div className="toolbar-right">
          {filters.map(f => (
            <button
              key={f}
              type="button"
              className={`icon-btn${typeFilter === f ? ' active' : ''}`}
              onClick={() => setTypeFilter(f)}
              style={{ width: 'auto', padding: '0 12px', fontSize: '12px', fontWeight: 600, gap: 4 }}
            >
              {filterLabel[f]}
              <span style={{
                fontSize: '10px', fontWeight: 700, opacity: 0.7,
                background: typeFilter === f ? 'rgba(255,255,255,0.2)' : 'var(--hover-bg)',
                padding: '1px 5px', borderRadius: 6, marginLeft: 2,
              }}>
                {filterCount[f]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {entries === null ? (
        <div className="tx-loading">
          <Loader2 size={20} className="spin" />
          <span>Loading transactions…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="tx-empty">
          <Package size={28} strokeWidth={1.5} />
          <h3>No transactions {rows.length === 0 ? 'yet' : 'match'}</h3>
          <p>
            {rows.length === 0
              ? 'Item changes show up here as you create, adjust, or delete items.'
              : 'Try clearing the search or filter.'}
          </p>
        </div>
      ) : (
        <div className="tx-list">
          {filtered.map(({ entry, view }) => {
            const isDeleted = view.kind === 'deleted';
            const et = view.entityType;
            const verb = view.verb;
            const isItem = et === 'item';

            // Resolve navigation target — items link to detail page, deleted items don't
            const resolvedId = entry.entityId || (isItem ? itemIdByName.get(entry.entityName) : undefined);
            const itemHref = isItem && verb !== 'deleted' && resolvedId
              ? `/items/detail/${resolvedId}` : null;

            const EntityIcon = ENTITY_ICONS[et] ?? Package;
            const VerbIcon = VERB_ICONS[verb] ?? Edit3;
            const color = ACTION_COLORS[verb] ?? GREY;
            const entityLabel = ENTITY_LABEL[et] ?? (et || 'Record');
            const verbLabel = VERB_LABELS[verb] ?? verb;

            return (
              <div
                key={entry.id}
                className={`tx-row ${itemHref ? 'tx-row-clickable' : ''}`}
                onClick={() => itemHref && navigate(itemHref, { state: { from: '/reports' } })}
                style={{ cursor: itemHref ? 'pointer' : 'default' }}
                title={itemHref ? 'Click to open item' : isDeleted ? 'Item no longer exists' : ''}
              >
                {/* Icon circle */}
                <div className="tx-icon-wrap" style={{
                  background: `color-mix(in srgb, ${color} 12%, transparent)`,
                }}>
                  <EntityIcon size={16} color={color} strokeWidth={2} />
                </div>

                {/* Main content */}
                <div className="tx-main">
                  <div className="tx-top-line">
                    {/* Entity name */}
                    <span className="tx-item-name">{entry.entityName || '—'}</span>

                    {/* Entity type badge */}
                    <span className="tx-entity-badge" style={{
                      color,
                      background: `color-mix(in srgb, ${color} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${color} 20%, transparent)`,
                    }}>
                      {entityLabel}
                    </span>

                    {/* Action verb badge */}
                    <span className="tx-verb-badge" style={{
                      color: '#fff',
                      background: color,
                    }}>
                      <VerbIcon size={10} strokeWidth={2.5} />
                      {verbLabel}
                    </span>

                    {/* Navigate indicator */}
                    {itemHref && (
                      <ChevronRight size={14} className="tx-chevron" strokeWidth={2} />
                    )}
                  </div>

                  {/* Description line */}
                  <div className="tx-description">
                    {describeActivity(entry)}
                  </div>

                  {/* Reason / extra detail */}
                  {view.reason && <div className="tx-reason">{view.reason}</div>}
                </div>

                {/* Quantity change */}
                <div className="tx-change" style={{ color: view.change > 0 ? GREEN : view.change < 0 ? RED : 'transparent' }}>
                  {view.change !== 0 && (
                    <span className="tx-change-inner" style={{
                      background: view.change > 0
                        ? 'rgba(4,120,87,0.08)'
                        : 'rgba(185,28,28,0.08)',
                    }}>
                      {view.change > 0 ? <ArrowUpRight size={12} strokeWidth={2.5} /> : <ArrowDownRight size={12} strokeWidth={2.5} />}
                      {view.change > 0 ? '+' : ''}{view.change.toLocaleString()}
                    </span>
                  )}
                </div>

                {/* Author */}
                <div className="tx-by">{userName(entry.userId)}</div>

                {/* Timestamp */}
                <div className="tx-when">
                  <div className="tx-when-date">{formatDateTime(entry.timestamp)}</div>
                  <div className="tx-when-time">{timeAgo(entry.timestamp)}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .tx-error {
          padding: 10px 14px;
          background: rgba(220,38,38,0.08);
          color: #B91C1C;
          border-radius: 10px;
          font-size: 13px;
          margin-bottom: 12px;
        }
        .tx-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          padding: 60px 0;
          color: var(--text-muted);
          font-size: 14px;
        }
        .tx-empty {
          text-align: center;
          padding: 60px 24px;
          color: var(--text-muted);
        }
        .tx-empty h3 { margin: 10px 0 6px; font-size: 16px; color: var(--text-medium); font-weight: 700; }
        .tx-empty p { font-size: 13.5px; }

        .tx-list { display: flex; flex-direction: column; gap: 4px; }
        .tx-row {
          display: grid;
          grid-template-columns: 44px 1fr 80px 120px 155px;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          font-size: 13px;
          transition: all .18s var(--ease);
          animation: tx-row-in .25s var(--ease) both;
        }
        .tx-row-clickable:hover {
          border-color: color-mix(in srgb, var(--primary, #3651DC) 35%, var(--border-color));
          transform: translateX(3px);
          box-shadow: 0 2px 12px -4px rgba(0,0,0,0.08);
          background: color-mix(in srgb, var(--primary, #3651DC) 2%, var(--card-bg));
        }
        @keyframes tx-row-in {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .tx-icon-wrap {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: transform .18s var(--ease);
        }
        .tx-row-clickable:hover .tx-icon-wrap {
          transform: scale(1.08);
        }

        .tx-main { min-width: 0; display: flex; flex-direction: column; gap: 3px; }

        .tx-top-line {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
        }

        .tx-item-name {
          font-weight: 700;
          font-size: 13.5px;
          color: var(--text-dark);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 220px;
        }

        .tx-entity-badge {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.04em;
          text-transform: uppercase;
          padding: 2px 7px;
          border-radius: 5px;
          border: 1px solid;
          white-space: nowrap;
          line-height: 1.4;
        }

        .tx-verb-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 2px 8px 2px 5px;
          border-radius: 5px;
          white-space: nowrap;
          display: inline-flex;
          align-items: center;
          gap: 3px;
          line-height: 1.4;
          letter-spacing: 0.01em;
        }

        .tx-chevron {
          color: var(--text-muted);
          opacity: 0;
          transition: opacity .18s var(--ease), transform .18s var(--ease);
          flex-shrink: 0;
        }
        .tx-row-clickable:hover .tx-chevron {
          opacity: 1;
          transform: translateX(2px);
        }

        .tx-description {
          font-size: 12.5px;
          color: var(--text-medium);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.4;
        }

        .tx-reason {
          font-size: 11.5px;
          color: var(--text-faint);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-change {
          font-weight: 800;
          font-variant-numeric: tabular-nums;
          font-size: 13px;
          letter-spacing: -0.01em;
          text-align: right;
        }

        .tx-change-inner {
          display: inline-flex;
          align-items: center;
          gap: 2px;
          padding: 3px 8px;
          border-radius: 6px;
          font-size: 12.5px;
        }

        .tx-by {
          color: var(--text-muted);
          font-size: 12px;
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .tx-when { text-align: right; font-variant-numeric: tabular-nums; }
        .tx-when-date { font-size: 12px; font-weight: 600; color: var(--text-medium); white-space: nowrap; }
        .tx-when-time { font-size: 10.5px; color: var(--text-muted); margin-top: 1px; }

        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 1100px) {
          .tx-row { grid-template-columns: 40px 1fr 70px 130px; }
          .tx-by { display: none; }
        }
        @media (max-width: 760px) {
          .tx-row { grid-template-columns: 36px 1fr auto; gap: 6px 10px; padding: 12px; }
          .tx-by { display: none; }
          .tx-when { grid-column: 2 / -1; text-align: left; }
          .tx-when-time { display: inline; }
          .tx-change { grid-row: 1; }
          .tx-item-name { max-width: 150px; }
          .tx-entity-badge, .tx-verb-badge { font-size: 8.5px; padding: 1px 5px; }
        }
      `}</style>
    </>
  );
}
