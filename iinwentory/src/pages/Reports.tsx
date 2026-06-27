import { useState, useEffect, useMemo } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import { useStore } from '../store/useStore';
import { useCurrency } from '../store/useCurrencyStore';
import { useAuth } from '../store/useAuthStore';
import { useTeam } from '../store/useTeamStore';
import { fetchActivityLog } from '../store/activityLog';
import type { ActivityLogEntry } from '../types';
import { useNavigate } from 'react-router-dom';
import {
  History, FileText, ArrowRightLeft, TrendingUp, RefreshCw, Users,
  AlertCircle, Search, Package, Folder, Tag, ClipboardList,
  ShoppingCart, BarChart2, ChevronRight, Download, Loader2,
  PanelLeftClose, PanelLeftOpen, ArrowLeftRight, LayoutGrid,
} from 'lucide-react';
import HelpButton from '../components/HelpButton';
import TransactionsView from '../components/TransactionsView';
import DateRangeFilter from '../components/DateRangeFilter';
import { DEFAULT_DATE_RANGE, isInDateRange } from '../lib/dateRange';
import type { DateRangeValue } from '../lib/dateRange';
import { itemInventoryValue } from '../lib/itemValue';

type ReportType = 'summary' | 'low-stock' | 'by-folder' | 'activity' | 'value' | 'transactions';
type ReportView = 'home' | ReportType;

const reportNav: { id: ReportType; label: string; icon: typeof FileText; desc: string }[] = [
  { id: 'summary', label: 'Inventory Summary', icon: FileText, desc: 'Totals, value, and a full item breakdown.' },
  { id: 'low-stock', label: 'Low Stock Report', icon: AlertCircle, desc: 'Items at or below their minimum level.' },
  { id: 'by-folder', label: 'Items by Folder', icon: Folder, desc: 'Inventory grouped by folder with values.' },
  { id: 'value', label: 'Value Report', icon: TrendingUp, desc: 'Items ranked by total inventory value.' },
  { id: 'activity', label: 'Activity History', icon: History, desc: 'Recent changes across your inventory.' },
  { id: 'transactions', label: 'Transactions', icon: ArrowLeftRight, desc: 'Immutable audit trail of every change.' },
];

const entityIcons: Record<string, typeof Package> = {
  item: Package,
  folder: Folder,
  tag: Tag,
  pick_list: ClipboardList,
  purchase_order: ShoppingCart,
  stock_count: BarChart2,
};

const actionColors: Record<string, string> = {
  created: '#22c55e',
  updated: '#3b82f6',
  deleted: '#ef4444',
  moved: '#f59e0b',
  qty_changed: '#8b5cf6',
  status_changed: '#06b6d4',
  issue_reported: '#f43f5e',
  received: '#10b981',
  completed: '#06b6d4',
};

const entityLabels: Record<string, string> = {
  item: 'Item',
  folder: 'Folder',
  tag: 'Tag',
  pick_list: 'Pick List',
  purchase_order: 'Purchase Order',
  stock_count: 'Stock Count',
};

type ActivityFilter = 'all' | 'created' | 'modified' | 'deleted' | 'picked';

const activityFilters: ActivityFilter[] = ['all', 'created', 'modified', 'deleted', 'picked'];

const activityFilterLabels: Record<ActivityFilter, string> = {
  all: 'All',
  created: 'Created',
  modified: 'Modified',
  deleted: 'Deleted',
  picked: 'Picked',
};

// Verbs that count as a "modification" (anything that changed an existing record).
const MODIFIED_VERBS = ['updated', 'moved', 'qty_changed', 'status_changed', 'received', 'completed'];

/** Does an activity entry belong to the given action-type filter bucket? */
function matchesActivityFilter(entry: ActivityLogEntry, filter: ActivityFilter): boolean {
  if (filter === 'all') return true;
  const entityType = entry.action.includes('.') ? entry.action.split('.')[0] : (entry.entityType || '');
  const verb = activityVerb(entry.action);
  switch (filter) {
    case 'created': return verb === 'created';
    case 'deleted': return verb === 'deleted';
    case 'modified': return MODIFIED_VERBS.includes(verb);
    case 'picked': return entityType === 'pick_list';
  }
}

/** The verb portion of a backend action string, e.g. "item.created" → "created". */
function activityVerb(action: string): string {
  return action.includes('.') ? (action.split('.').pop() ?? action) : action;
}

/** Build a human-readable sentence for any activity entry from its details. */
function describeActivity(entry: ActivityLogEntry): string {
  const d = (entry.details && typeof entry.details === 'object')
    ? entry.details as Record<string, unknown>
    : {};
  const name = entry.entityName || (typeof d.name === 'string' ? d.name : '');
  const q = name ? `“${name}”` : '';
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

function exportCSV(rows: string[][], filename: string) {
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/** Consistent page header for every report subsection (eyebrow + title + actions). */
function SectionHeader({ eyebrow, icon: Icon, title, subtitle, children }: {
  eyebrow: string;
  icon: typeof FileText;
  title: string;
  subtitle?: string;
  children?: ReactNode;
}) {
  return (
    <div className="page-header" style={{ marginBottom: subtitle ? 24 : 20, alignItems: 'flex-start' }}>
      <div style={{ minWidth: 0 }}>
        <span className="page-eyebrow"><Icon size={11} strokeWidth={2.4} /> {eyebrow}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1>{title}</h1>
          <HelpButton topic="reports" size={16} />
        </div>
        {subtitle && (
          <p style={{ marginTop: 6, color: 'var(--text-muted)', fontSize: 14, maxWidth: 560 }}>{subtitle}</p>
        )}
      </div>
      {children && <div className="rep-actions">{children}</div>}
    </div>
  );
}

export default function Reports() {
  const store = useStore();
  const { format } = useCurrency();
  const { user } = useAuth();
  const { members } = useTeam();
  const navigate = useNavigate();
  const myRole = members.find(m => m.id === user?.id)?.role;
  const canSeeAuthor = myRole === 'owner';

  const [activeReport, setActiveReport] = useState<ReportView>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DATE_RANGE);
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>('all');
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[] | null>(null);
  const [railOpen, setRailOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('iinw_reports_rail') !== '0';
  });
  const toggleRail = () => {
    const next = !railOpen;
    setRailOpen(next);
    try { localStorage.setItem('iinw_reports_rail', next ? '1' : '0'); } catch { /* ignore */ }
  };

  // Prefetch the activity log as soon as the Reports page mounts (i.e. on the
  // Overview landing) so both Activity History and Transactions — the two slow
  // reports — are ready by the time the user opens them. Both views share this
  // single fetch (TransactionsView receives it via props) so we never double up.
  const loadActivity = () =>
    fetchActivityLog().then(setActivityLog).catch(() => setActivityLog([]));
  useEffect(() => {
    void loadActivity();
  }, []);

  // Items restricted to the selected date range (by creation date). All
  // item-based reports derive their datasets — and their summary cards — from
  // this list so the date filter applies consistently across every subsection.
  const dateItems = useMemo(
    () => store.items.filter(i => isInDateRange(i.createdAt, dateRange)),
    [store.items, dateRange]
  );

  const stats = useMemo(() => ({
    items: dateItems.length,
    folders: store.folders.length,
    totalQuantity: dateItems.reduce((a, i) => a + i.quantity, 0),
    totalValue: dateItems.reduce((a, i) => a + itemInventoryValue(i), 0),
  }), [dateItems, store.folders]);

  const lowStock = useMemo(
    () => dateItems.filter(i => i.minLevel != null && i.quantity <= i.minLevel),
    [dateItems]
  );

  // Sidebar "Quick stats" stays a stable, unfiltered overview — the date filter
  // is scoped to the report content, not the rail.
  const globalStats = store.getTotalStats();
  const globalLowStock = store.getLowStockItems();

  // Activity History respects the date filter via each entry's timestamp.
  const activityFiltered = useMemo(
    () => (activityLog === null ? null : activityLog.filter(e => isInDateRange(e.timestamp, dateRange))),
    [activityLog, dateRange]
  );

  // Per-bucket counts (over the date-filtered set) shown on the action chips.
  const activityCounts = useMemo(() => {
    const base = activityFiltered ?? [];
    return activityFilters.reduce((acc, f) => {
      acc[f] = base.filter(e => matchesActivityFilter(e, f)).length;
      return acc;
    }, {} as Record<ActivityFilter, number>);
  }, [activityFiltered]);

  // Final list: date filter + selected action-type filter.
  const activityVisible = useMemo(
    () => (activityFiltered === null ? null : activityFiltered.filter(e => matchesActivityFilter(e, activityFilter))),
    [activityFiltered, activityFilter]
  );

  // Resolve an item id by name so activity rows link to the item page even when
  // the API omits entityId. Deleted items aren't in the store → no link.
  const itemIdByName = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of store.items) if (!m.has(it.name)) m.set(it.name, it.id);
    return m;
  }, [store.items]);

  // Resolve item names when the API omits entityName (e.g. quantity adjustments).
  const itemNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const it of store.items) m.set(it.id, it.name);
    for (const e of activityLog ?? []) {
      if (e.entityId && e.entityName && !m.has(e.entityId)) m.set(e.entityId, e.entityName);
      if (e.entityId && !m.has(e.entityId)) {
        const d = (e.details && typeof e.details === 'object') ? e.details as Record<string, unknown> : {};
        const name = (typeof d.name === 'string' && d.name) ? d.name
          : (typeof d.itemName === 'string' && d.itemName) ? d.itemName
          : null;
        if (name) m.set(e.entityId, name);
      }
    }
    return m;
  }, [store.items, activityLog]);

  // Value report: sort date-filtered items by total value descending
  const itemsByValue = [...dateItems].sort((a, b) => (b.price * b.quantity) - (a.price * a.quantity));

  // By-folder report — folders are listed in full, but their items respect the
  // date filter (computed per-folder from dateItems below).
  const allFolders = store.folders;
  const rootItems = dateItems.filter(i => i.parentId === null);

  const filteredItems = dateItems.filter(i =>
    i.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const statCard = (label: string, value: string | number, sub?: string, color?: string) => (
    <div className="rep-stat">
      {color && <span className="rep-stat-bar" style={{ background: color }} />}
      <div className="rep-stat-label">{label}</div>
      <div className="rep-stat-value" style={color ? { color } : undefined}>{value}</div>
      {sub && <div className="rep-stat-sub" title={sub}>{sub}</div>}
    </div>
  );

  return (
    <div className="reports-page">
      <style>{`
        /* Page shell — flex/height live in a class (not inline) so the generic
           mobile [style*="display:flex"] rule in index.css doesn't force
           height:auto and kill scrolling. Mirrors the .items-page pattern. */
        .reports-page {
          display: flex;
          height: 100%;
          position: relative;
        }
        /* On mobile the two-pane layout stacks and the whole page scrolls as
           one (the rail is the report switcher, so it must stay reachable). */
        @media (max-width: 900px) {
          .reports-page {
            flex-direction: column;
            height: 100%;
            overflow-y: auto;
            -webkit-overflow-scrolling: touch;
          }
          .reports-page .rail-toggle { display: none !important; }
          .reports-page > main {
            flex: none !important;
            height: auto !important;
            overflow: visible !important;
            padding: 20px 4px 32px !important;
          }
        }
        .rep-nav {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          color: var(--text-medium);
          letter-spacing: -0.005em;
          text-align: left;
          background: transparent;
          cursor: pointer;
          transition: all 0.16s var(--ease);
        }
        .rep-nav:hover { background: var(--hover-bg); color: var(--text-dark); }
        .rep-nav.active {
          background: var(--primary-light);
          color: var(--primary);
          font-weight: 600;
        }
        .rep-nav.active::before {
          content: '';
          position: absolute;
          left: -8px; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 16px;
          background: var(--primary);
          border-radius: 0 3px 3px 0;
        }

        /* ── Section header actions ── */
        .rep-actions { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }

        /* ── Stat cards (aligned with Dashboard summary cards) ── */
        .rep-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(168px, 1fr));
          gap: 14px;
          margin-bottom: 26px;
        }
        .rep-stat {
          position: relative;
          padding: 18px 20px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xs);
          overflow: hidden;
        }
        .rep-stat-bar { position: absolute; top: 0; left: 0; right: 0; height: 3px; }
        .rep-stat-label {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: -0.005em;
        }
        .rep-stat-value {
          margin-top: 8px;
          font-size: 27px;
          font-weight: 800;
          letter-spacing: -0.026em;
          line-height: 1.05;
          color: var(--text-dark);
          font-variant-numeric: tabular-nums;
        }
        .rep-stat-sub {
          margin-top: 4px;
          font-size: 12px;
          color: var(--text-muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* ── Data tables ── */
        .rep-table {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--card-bg);
          box-shadow: var(--shadow-xs);
        }
        .rep-thead {
          background: var(--surface-raised);
          padding: 11px 18px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: var(--text-faint);
          border-bottom: 1px solid var(--border-color);
        }
        .rep-row {
          padding: 13px 18px;
          border-top: 1px solid var(--border-faint);
          cursor: pointer;
          align-items: center;
          transition: background 0.14s var(--ease);
        }
        .rep-row:hover { background: var(--surface-raised); }
        .rep-empty {
          padding: 28px;
          text-align: center;
          font-size: 13px;
          color: var(--text-muted);
        }

        /* ── Folder groups ── */
        .rep-folder {
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          overflow: hidden;
          background: var(--card-bg);
          box-shadow: var(--shadow-xs);
          margin-bottom: 16px;
        }
        .rep-folder-head {
          display: flex;
          align-items: center;
          gap: 9px;
          padding: 12px 16px;
          background: var(--surface-raised);
          border-bottom: 1px solid var(--border-color);
        }
        .rep-folder-dot { width: 8px; height: 8px; border-radius: 999px; flex-shrink: 0; }
        .rep-folder-name {
          font-weight: 700;
          font-size: 14px;
          letter-spacing: -0.01em;
          color: var(--text-dark);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .rep-folder-count {
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          background: var(--hover-bg);
          padding: 2px 8px;
          border-radius: 999px;
          white-space: nowrap;
        }
        .rep-folder-total {
          margin-left: auto;
          font-size: 13px;
          font-weight: 700;
          color: var(--text-dark);
          font-variant-numeric: tabular-nums;
          white-space: nowrap;
        }

        /* ── Toolbar (search + filters) ── */
        .rep-toolbar {
          display: flex;
          gap: 12px;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }
        .rep-search { position: relative; flex: 1; min-width: 220px; }
        .rep-search svg { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); }
        .rep-search .input { padding-left: 34px; }

        /* ── Filter chips ── */
        .rep-chips { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 18px; }
        .rep-chip {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-medium);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.14s var(--ease);
        }
        .rep-chip:hover { background: var(--hover-bg); color: var(--text-dark); }
        .rep-chip.active {
          background: var(--primary);
          border-color: var(--primary);
          color: #fff;
        }
        .rep-chip-count {
          font-size: 10.5px;
          font-weight: 700;
          padding: 1px 6px;
          border-radius: 999px;
          background: var(--hover-bg);
          color: var(--text-muted);
        }
        .rep-chip.active .rep-chip-count { background: rgba(255,255,255,0.22); color: #fff; }
      `}</style>

      {/* Side Nav */}
      <aside className={`folder-rail ${railOpen ? '' : 'collapsed'}`} style={{
        width: railOpen ? '252px' : '0',
        minWidth: railOpen ? '252px' : '0',
        borderRight: railOpen ? '1px solid var(--border-color)' : 'none',
        background: 'linear-gradient(180deg, var(--card-bg) 0%, color-mix(in srgb, var(--card-bg) 92%, var(--bg-color)) 100%)',
        display: 'flex',
        flexDirection: 'column',
        overflowX: 'hidden',
      }}>
        <div style={{ padding: '24px 18px 14px' }}>
          <span className="page-eyebrow" style={{ marginBottom: 4 }}>
            <FileText size={11} strokeWidth={2.4} /> Reports
          </span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.022em', marginBottom: 14 }}>
            Insights
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} strokeWidth={2.1} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="input" placeholder="Search reports" style={{ paddingLeft: 34, fontSize: '12.5px' }} />
          </div>
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', padding: '0 12px' }}>
          <button
            onClick={() => setActiveReport('home')}
            className={`rep-nav ${activeReport === 'home' ? 'active' : ''}`}
          >
            <LayoutGrid size={15} strokeWidth={1.9} /> Overview
          </button>
          {reportNav.map(r => (
            <button
              key={r.id}
              onClick={() => setActiveReport(r.id)}
              className={`rep-nav ${activeReport === r.id ? 'active' : ''}`}
            >
              <r.icon size={15} strokeWidth={1.9} /> {r.label}
            </button>
          ))}
        </nav>

        {/* Quick Stats — premium card */}
        <div style={{
          margin: '18px 16px 0',
          padding: '18px',
          borderRadius: 'var(--radius-lg)',
          color: '#fff',
          background:
            'radial-gradient(120% 80% at 0% 0%, rgba(255, 255, 255, 0.16) 0%, transparent 55%), linear-gradient(160deg, var(--primary) 0%, var(--primary-hover) 100%)',
          boxShadow:
            'inset 0 1px 0 rgba(255, 255, 255, 0.18), 0 8px 24px -8px var(--primary-glow)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '10.5px', fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(255, 255, 255, 0.78)', marginBottom: 12 }}>
            <TrendingUp size={11} strokeWidth={2.4} /> Quick stats
          </div>
          {[
            { label: 'Total items', value: globalStats.items },
            { label: 'Total value', value: format(globalStats.totalValue) },
            { label: 'Low stock',   value: globalLowStock.length },
          ].map((s, i) => (
            <div
              key={s.label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                fontSize: '12.5px',
                paddingTop: i === 0 ? 0 : 8,
                marginTop: i === 0 ? 0 : 8,
                borderTop: i === 0 ? 'none' : '1px solid rgba(255, 255, 255, 0.12)',
              }}
            >
              <span style={{ opacity: 0.82 }}>{s.label}</span>
              <span style={{ fontWeight: 800, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.012em' }}>{s.value}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Rail toggle */}
      <div className="rail-toggle">
        <button
          type="button"
          className={`rail-toggle-btn ${railOpen ? '' : 'collapsed'}`}
          onClick={toggleRail}
          title={railOpen ? 'Collapse reports nav' : 'Expand reports nav'}
          aria-label={railOpen ? 'Collapse reports nav' : 'Expand reports nav'}
        >
          {railOpen ? <PanelLeftClose size={15} strokeWidth={2.0} /> : <PanelLeftOpen size={15} strokeWidth={2.0} />}
        </button>
      </div>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', minWidth: 0 }}>

        {/* ── Overview / Landing ── */}
        {activeReport === 'home' && (
          <div className="reports-home">
            <SectionHeader
              eyebrow="Overview"
              icon={LayoutGrid}
              title="Reports"
              subtitle="Choose a report to dig into your inventory."
            />

            <div className="reports-bento">
              {reportNav.map(r => {
                const metric =
                  r.id === 'summary' ? `${globalStats.items} items · ${format(globalStats.totalValue)}`
                  : r.id === 'low-stock' ? `${globalLowStock.length} below min`
                  : r.id === 'by-folder' ? `${globalStats.folders} folders`
                  : r.id === 'value' ? `${format(globalStats.totalValue)} total`
                  : r.id === 'activity' ? 'Recent changes'
                  : 'Audit trail';
                const accent = r.id === 'low-stock' && globalLowStock.length > 0 ? '#ef4444' : 'var(--primary)';
                const hero = r.id === 'summary';
                return (
                  <button
                    key={r.id}
                    onClick={() => setActiveReport(r.id)}
                    className={`report-tile ${hero ? 'hero' : ''}`}
                    style={{ '--accent': accent } as CSSProperties}
                  >
                    <div className="report-tile-icon">
                      <r.icon size={hero ? 30 : 24} strokeWidth={1.9} />
                    </div>
                    <div className="report-tile-body">
                      <span className="report-tile-title">{r.label}</span>
                      <p className="report-tile-desc">{r.desc}</p>
                    </div>
                    <div className="report-tile-foot">
                      <span className="report-tile-metric">{metric}</span>
                      <span className="report-tile-go">
                        Open <ChevronRight size={15} className="report-tile-arrow" />
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            <style>{`
              .reports-home {
                display: flex;
                flex-direction: column;
                min-height: 100%;
              }
              .reports-bento {
                display: grid;
                grid-template-columns: repeat(3, 1fr);
                grid-auto-rows: minmax(168px, 1fr);
                grid-auto-flow: dense;
                gap: 16px;
                flex: 1;
              }
              .report-tile {
                position: relative;
                display: flex;
                flex-direction: column;
                text-align: left;
                gap: 14px;
                padding: 22px;
                border-radius: var(--radius-lg);
                border: 1px solid var(--border-color);
                background: var(--card-bg);
                box-shadow: var(--shadow-xs);
                cursor: pointer;
                overflow: hidden;
                transition: transform 0.18s var(--ease), box-shadow 0.18s var(--ease), border-color 0.18s var(--ease);
              }
              .report-tile::before {
                content: '';
                position: absolute;
                left: 0; top: 0; right: 0;
                height: 3px;
                background: var(--accent);
                opacity: 0;
                transition: opacity 0.18s var(--ease);
              }
              .report-tile:hover {
                border-color: var(--border-strong);
                box-shadow: var(--shadow-md);
                transform: translateY(-2px);
              }
              .report-tile:hover::before { opacity: 1; }
              .report-tile.hero {
                grid-column: span 2;
                grid-row: span 2;
              }
              .report-tile-icon {
                width: 52px; height: 52px;
                border-radius: 14px;
                display: flex; align-items: center; justify-content: center;
                flex-shrink: 0;
                color: var(--accent);
                background: color-mix(in srgb, var(--accent) 13%, transparent);
              }
              .report-tile.hero .report-tile-icon { width: 64px; height: 64px; border-radius: 18px; }
              .report-tile-body { flex: 1; min-width: 0; }
              .report-tile-title {
                font-size: 16px;
                font-weight: 700;
                letter-spacing: -0.01em;
                color: var(--text-dark);
              }
              .report-tile.hero .report-tile-title { font-size: 22px; font-weight: 800; }
              .report-tile-desc {
                font-size: 13px;
                color: var(--text-muted);
                margin: 6px 0 0;
                line-height: 1.45;
                max-width: 46ch;
              }
              .report-tile.hero .report-tile-desc { font-size: 14.5px; margin-top: 10px; }
              .report-tile-foot {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;
              }
              .report-tile-metric {
                font-size: 12.5px;
                font-weight: 700;
                color: var(--accent);
                font-variant-numeric: tabular-nums;
              }
              .report-tile.hero .report-tile-metric { font-size: 15px; }
              .report-tile-go {
                display: inline-flex;
                align-items: center;
                gap: 2px;
                font-size: 12.5px;
                font-weight: 600;
                color: var(--text-muted);
              }
              .report-tile-arrow { transition: transform 0.18s var(--ease); }
              .report-tile:hover .report-tile-go { color: var(--accent); }
              .report-tile:hover .report-tile-arrow { transform: translateX(3px); }

              @media (max-width: 1180px) {
                .reports-bento { grid-template-columns: repeat(2, 1fr); }
                .report-tile.hero { grid-column: span 2; grid-row: span 1; }
              }
              @media (max-width: 720px) {
                .reports-bento { grid-template-columns: 1fr; grid-auto-rows: minmax(140px, auto); }
                .report-tile.hero { grid-column: auto; grid-row: auto; }
              }
            `}</style>
          </div>
        )}

        {/* ── Inventory Summary ── */}
        {activeReport === 'summary' && (
          <>
            <SectionHeader
              eyebrow="Summary"
              icon={FileText}
              title="Inventory Summary"
              subtitle="Every item with its quantity, price, and total inventory value."
            >
              <button className="btn-outline" onClick={() => exportCSV(
                [['Name', 'Quantity', 'Unit', 'Price', 'Total Value', 'Min Level', 'Folder', 'Tags'],
                 ...filteredItems.map(i => [i.name, String(i.quantity), i.unit, String(i.price), String(itemInventoryValue(i)), String(i.minLevel ?? ''), store.folders.find(f => f.id === i.parentId)?.name || 'Root', i.tags.map(tid => store.tags.find(t => t.id === tid)?.name || '').join(', ')])],
                'inventory-summary.csv'
              )}>
                <Download size={14} /> Export CSV
              </button>
            </SectionHeader>

            <div className="rep-stats">
              {statCard('Total Items', stats.items)}
              {statCard('Total Folders', stats.folders)}
              {statCard('Total Quantity', stats.totalQuantity)}
              {statCard('Total Value', format(stats.totalValue), undefined, 'var(--primary)')}
            </div>

            <div className="rep-toolbar">
              <div className="rep-search">
                <Search size={15} strokeWidth={2.1} />
                <input className="input" placeholder="Filter items..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>

            <div className="rep-table">
              <div className="rep-thead" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 110px' }}>
                <span>Item Name</span><span>Qty</span><span>Unit</span><span>Price</span><span>Total Value</span>
              </div>
              {filteredItems.length === 0 && <div className="rep-empty">No items found.</div>}
              {filteredItems.map(item => (
                <div key={item.id} className="rep-row" onClick={() => navigate(`/items/detail/${item.id}`)}
                  style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 100px 110px' }}>
                  <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                    <Package size={15} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  </span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.quantity}</span>
                  <span style={{ color: 'var(--text-muted)' }}>{item.unit}</span>
                  <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(item.price)}</span>
                  <span style={{ fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{format(itemInventoryValue(item))}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── Low Stock Report ── */}
        {activeReport === 'low-stock' && (
          <>
            <SectionHeader
              eyebrow="Stock"
              icon={AlertCircle}
              title="Low Stock Report"
              subtitle="Items at or below their minimum level — what to reorder."
            >
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              <button className="btn-outline" onClick={() => exportCSV(
                [['Name', 'SKU', 'Current Qty', 'Min Level', 'Shortage', 'Unit', 'Price'],
                 ...lowStock.map(i => [i.name, i.sku ?? '', String(i.quantity), String(i.minLevel ?? ''), String((i.minLevel ?? 0) - i.quantity), i.unit, String(i.price)])],
                'low-stock.csv'
              )}>
                <Download size={14} /> Export CSV
              </button>
            </SectionHeader>

            <div className="rep-stats">
              {statCard('Items Below Min Level', lowStock.length, undefined, lowStock.length > 0 ? 'var(--danger)' : 'var(--success)')}
              {statCard('Total Items', stats.items)}
              {statCard('% Needing Restock', `${stats.items > 0 ? Math.round(lowStock.length / stats.items * 100) : 0}%`)}
            </div>

            {lowStock.length === 0 ? (
              <div className="empty-state">
                <AlertCircle size={44} color="var(--success)" />
                <p style={{ color: 'var(--success)' }}>All items are well stocked</p>
                <p>No items are at or below minimum level.</p>
              </div>
            ) : (
              <div className="rep-table">
                <div className="rep-thead" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 110px 100px 36px' }}>
                  <span>Item</span><span>SKU</span><span>Current</span><span>Min Level</span><span>Shortage</span><span></span>
                </div>
                {lowStock.map(item => (
                  <div key={item.id} className="rep-row" onClick={() => navigate(`/items/detail/${item.id}`)}
                    style={{ display: 'grid', gridTemplateColumns: '1fr 130px 110px 110px 100px 36px' }}>
                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '9px', minWidth: 0 }}>
                      <AlertCircle size={15} color="var(--danger)" style={{ flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    </span>
                    <span style={{ fontFamily: 'var(--font-mono, monospace)', fontSize: '12px', color: item.sku ? 'var(--text-medium)' : 'var(--text-muted)' }}>
                      {item.sku || '—'}
                    </span>
                    <span style={{ color: 'var(--danger)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{item.quantity} {item.unit}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.minLevel} {item.unit}</span>
                    <span style={{ color: 'var(--danger)', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>-{(item.minLevel ?? 0) - item.quantity}</span>
                    <ChevronRight size={15} color="var(--text-muted)" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── By Folder ── */}
        {activeReport === 'by-folder' && (
          <>
            <SectionHeader
              eyebrow="Organization"
              icon={Folder}
              title="Items by Folder"
              subtitle="Inventory grouped by folder, with item counts and totals."
            >
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </SectionHeader>

            {(() => {
              const groups = [
                { id: null as string | null, name: 'Root (No Folder)', color: 'var(--text-muted)', items: rootItems },
                ...allFolders.map(f => ({ id: f.id, name: f.name, color: f.color, items: dateItems.filter(i => i.parentId === f.id) })),
              ].filter(g => g.id === null ? g.items.length > 0 : true);

              return groups.map(group => (
                <div key={group.id ?? 'root'} className="rep-folder">
                  <div className="rep-folder-head">
                    <span className="rep-folder-dot" style={{ background: group.color }} />
                    <Folder size={15} color={group.color} style={{ flexShrink: 0 }} />
                    <span className="rep-folder-name">{group.name}</span>
                    <span className="rep-folder-count">{group.items.length} item{group.items.length === 1 ? '' : 's'}</span>
                    <span className="rep-folder-total">{format(group.items.reduce((a, i) => a + itemInventoryValue(i), 0))}</span>
                  </div>
                  {group.items.length === 0 ? (
                    <div className="rep-empty" style={{ padding: '16px 18px', textAlign: 'left' }}>Empty folder</div>
                  ) : (
                    group.items.map(item => (
                      <div key={item.id} className="rep-row" onClick={() => navigate(`/items/detail/${item.id}`)}
                        style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                        <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                          {item.quantity} {item.unit} · {format(itemInventoryValue(item))}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ));
            })()}

            {allFolders.length === 0 && rootItems.length === 0 && (
              <div className="empty-state"><Package size={44} /><p>No items yet</p><p>Add some items to see this report.</p></div>
            )}
          </>
        )}

        {/* ── Value Report ── */}
        {activeReport === 'value' && (
          <>
            <SectionHeader
              eyebrow="Valuation"
              icon={TrendingUp}
              title="Value Report"
              subtitle="Items ranked by their share of total inventory value."
            >
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              <button className="btn-outline" onClick={() => exportCSV(
                [['Rank', 'Name', 'Qty', 'Unit Price', 'Total Value', '% of Total'],
                 ...itemsByValue.map((item, i) => [String(i + 1), item.name, String(item.quantity), String(item.price), String(itemInventoryValue(item)), stats.totalValue > 0 ? ((itemInventoryValue(item) / stats.totalValue) * 100).toFixed(1) + '%' : '0%'])],
                'value-report.csv'
              )}>
                <Download size={14} /> Export CSV
              </button>
            </SectionHeader>

            <div className="rep-stats">
              {statCard('Total Inventory Value', format(stats.totalValue), undefined, 'var(--primary)')}
              {statCard('Average Item Value', format(stats.items > 0 ? stats.totalValue / stats.items : 0))}
              {statCard('Highest Value Item', itemsByValue[0] ? format(itemsByValue[0].price * itemsByValue[0].quantity) : '—', itemsByValue[0]?.name)}
            </div>

            <div className="rep-table">
              <div className="rep-thead" style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 100px 120px 96px 36px' }}>
                <span>#</span><span>Item</span><span>Qty</span><span>Unit Price</span><span>Total Value</span><span>% Total</span><span></span>
              </div>
              {itemsByValue.length === 0 && <div className="rep-empty">No items yet.</div>}
              {itemsByValue.map((item, i) => {
                const totalVal = itemInventoryValue(item);
                const pct = stats.totalValue > 0 ? (totalVal / stats.totalValue) * 100 : 0;
                return (
                  <div key={item.id} className="rep-row" onClick={() => navigate(`/items/detail/${item.id}`)}
                    style={{ display: 'grid', gridTemplateColumns: '40px 1fr 90px 100px 120px 96px 36px' }}>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700, fontSize: '13px', fontVariantNumeric: 'tabular-nums' }}>{i + 1}</span>
                    <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{item.quantity} {item.unit}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>{format(item.price)}</span>
                    <span style={{ fontWeight: 700, color: 'var(--primary)', fontVariantNumeric: 'tabular-nums' }}>{format(totalVal)}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{ flex: 1, height: '5px', background: 'var(--hover-bg)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ width: `${pct}%`, height: '100%', background: 'var(--primary)', borderRadius: '999px' }} />
                      </div>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', width: '30px', fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(0)}%</span>
                    </div>
                    <ChevronRight size={15} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* ── Activity History ── */}
        {activeReport === 'activity' && (
          <>
            <SectionHeader
              eyebrow="Audit"
              icon={History}
              title="Activity History"
              subtitle="Recent changes across your inventory, newest first."
            >
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              {activityVisible !== null && (
                <span style={{ fontSize: '13px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{activityVisible.length} actions</span>
              )}
            </SectionHeader>

            {activityFiltered !== null && activityFiltered.length > 0 && (
              <div className="rep-chips">
                {activityFilters.map(f => (
                  <button
                    key={f}
                    type="button"
                    className={`rep-chip${activityFilter === f ? ' active' : ''}`}
                    onClick={() => setActivityFilter(f)}
                  >
                    {activityFilterLabels[f]}
                    <span className="rep-chip-count">{activityCounts[f]}</span>
                  </button>
                ))}
              </div>
            )}

            {activityVisible === null ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, padding: '60px 0', color: 'var(--text-muted)', fontSize: 14 }}>
                <Loader2 size={20} style={{ animation: 'spin 0.7s linear infinite' }} />
                <span>Loading activity…</span>
              </div>
            ) : activityFiltered!.length === 0 ? (
              <div className="empty-state">
                <History size={44} />
                <p>{activityLog && activityLog.length > 0 ? 'No activity in this period' : 'No activity yet'}</p>
                <p>{activityLog && activityLog.length > 0 ? 'Try a different date range.' : 'Changes to your inventory appear here.'}</p>
              </div>
            ) : activityVisible.length === 0 ? (
              <div className="empty-state">
                <History size={44} />
                <p>No {activityFilterLabels[activityFilter].toLowerCase()} activity</p>
                <p>No entries match this filter for the selected period.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {activityVisible.map(entry => {
                  // Derive entity type from the action ("item.created" → "item")
                  // rather than trusting entry.entityType, which older API builds
                  // may omit.
                  const entityType = entry.action.includes('.')
                    ? entry.action.split('.')[0]
                    : (entry.entityType || '');
                  const Icon = entityIcons[entityType] || Package;
                  const verb = activityVerb(entry.action);
                  const color = actionColors[verb] || 'var(--text-muted)';
                  const author = entry.userId ? (members.find(m => m.id === entry.userId)?.name ?? 'Member') : 'System';
                  const entityLabel = entityLabels[entityType];
                  const entityName = entry.entityName
                    || (entry.entityId ? itemNameById.get(entry.entityId) : undefined)
                    || '';
                  const displayEntry = entityName && !entry.entityName
                    ? { ...entry, entityName }
                    : entry;
                  // Link to the item page — but not for deleted items (they no longer exist).
                  const resolvedId = entry.entityId || itemIdByName.get(entityName);
                  const itemHref = entityType === 'item' && verb !== 'deleted' && resolvedId
                    ? `/items/detail/${resolvedId}` : null;
                  return (
                    <div key={entry.id}
                      onClick={() => itemHref && navigate(itemHref)}
                      title={itemHref ? 'Open item' : verb === 'deleted' ? 'Item no longer exists' : ''}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 16px', borderRadius: '10px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', cursor: itemHref ? 'pointer' : 'default' }}>
                      <div style={{ width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0, background: `color-mix(in srgb, ${color} 14%, transparent)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={16} color={color} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: 'var(--text-dark)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          {entityLabel && (
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color, background: `color-mix(in srgb, ${color} 12%, transparent)`, padding: '2px 6px', borderRadius: '5px', whiteSpace: 'nowrap' }}>
                              {entityLabel}
                            </span>
                          )}
                          {entityType === 'item' && entityName && (
                            <span style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-dark)' }}>
                              {entityName}
                            </span>
                          )}
                          <span>{describeActivity(displayEntry)}</span>
                          {canSeeAuthor && (
                            <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                              · by <b style={{ color: 'var(--text-medium)' }}>{author}</b>
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(entry.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </>
        )}

        {/* ── Transactions (audit trail) ── */}
        {/* Always mounted (hidden when inactive) so it renders from the shared,
            prefetched activity log — instant when the user switches to it. */}
        <div hidden={activeReport !== 'transactions'}>
          <TransactionsView entries={activityLog} onRefresh={loadActivity} />
        </div>

        {/* unused report types icons kept for reference */}
        <div style={{ display: 'none' }}>
          <ArrowRightLeft /><RefreshCw /><Users />
        </div>
      </main>
    </div>
  );
}
