import { useMemo, useState, useEffect, useCallback } from 'react';
import { useWorkflows } from '../store/useWorkflowStore';
import { useStore } from '../store/useStore';
import { useTeam } from '../store/useTeamStore';
import { useAuth } from '../store/useAuthStore';
import { useSettings } from '../store/useSettingsStore';
import { useCurrency } from '../store/useCurrencyStore';
import type {
  PickList, PickListStatus, PickListComment, PickListIssue, PickIssueType,
  PurchaseOrder, PurchaseOrderStatus,
  StockCount, StockCountStatus,
  TeamMember,
} from '../types';
import {
  FileText, ShoppingCart, ListOrdered, Plus, X, Trash2,
  Check, Package, Minus, AlertCircle, Copy, Hash, Lock, Play,
  Send, AlertTriangle, User, CheckCircle2, MapPin, Search as SearchIcon,
} from 'lucide-react';
import HelpButton from '../components/HelpButton';

type WorkflowTab = 'pick-lists' | 'purchase-orders' | 'stock-counts';
type PickListFilterTab = 'active' | 'draft' | 'ready' | 'history';

const PL_STATUS: Record<PickListStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: '#64748b' },
  ready:     { label: 'Ready',     color: '#3b82f6' },
  completed: { label: 'Completed', color: '#22c55e' },
};
const PO_STATUS: Record<PurchaseOrderStatus, { label: string; color: string }> = {
  draft:     { label: 'Draft',     color: '#64748b' },
  ordered:   { label: 'Ordered',   color: '#3b82f6' },
  received:  { label: 'Received',  color: '#22c55e' },
  cancelled: { label: 'Cancelled', color: '#ef4444' },
};
const SC_STATUS: Record<StockCountStatus, { label: string; color: string }> = {
  draft:       { label: 'Draft',       color: '#64748b' },
  in_progress: { label: 'In Progress', color: '#f59e0b' },
  completed:   { label: 'Completed',   color: '#22c55e' },
};

const ISSUE_LABELS: Record<PickIssueType, string> = {
  damaged_stock: 'Damaged stock',
  missing_unit: 'Missing unit',
  wrong_stock_at_location: 'Wrong stock at location',
  barcode_mismatch: 'Barcode mismatch',
  other: 'Other',
};

function StatusBadge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{ background: color + '18', color, fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px', border: `1px solid ${color}33` }}>
      {label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
function formatDateTime(iso: string | null) {
  return iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
}

// ── Pick Lists Overview ────────────────────────────────────────────────────────
interface PickListOverviewProps {
  pickLists: PickList[];
  members: TeamMember[];
  isClient: boolean;
  onCreate: () => void;
}

function PickListOverview({ pickLists, members, isClient, onCreate }: PickListOverviewProps) {
  const total = pickLists.length;
  const draftCount = pickLists.filter(p => p.status === 'draft').length;
  const readyCount = pickLists.filter(p => p.status === 'ready').length;
  const completedCount = pickLists.filter(p => p.status === 'completed').length;

  const requestedTotal = pickLists.reduce((acc, p) => acc + p.items.reduce((s, it) => s + it.requestedQty, 0), 0);
  const pickedTotal = pickLists.reduce((acc, p) => acc + p.items.reduce((s, it) => s + it.pickedQty, 0), 0);
  const pickRate = requestedTotal > 0 ? Math.round((pickedTotal / requestedTotal) * 100) : 0;
  const itemsRemaining = Math.max(0, requestedTotal - pickedTotal);

  const assigneeWorkload = (() => {
    const map = new Map<string, { name: string; open: number; total: number }>();
    pickLists.forEach(pl => {
      if (!pl.assignedTo) return;
      const member = members.find(m => m.id === pl.assignedTo);
      const name = member?.name ?? 'Unknown';
      const entry = map.get(pl.assignedTo) ?? { name, open: 0, total: 0 };
      entry.total += 1;
      if (pl.status !== 'completed') entry.open += 1;
      map.set(pl.assignedTo, entry);
    });
    return Array.from(map.values()).sort((a, b) => b.open - a.open);
  })();

  const unassignedOpen = pickLists.filter(p => !p.assignedTo && p.status !== 'completed').length;
  const readyNoPicks = pickLists.filter(p => p.status === 'ready' && p.items.every(it => it.pickedQty === 0)).length;
  const stuckDrafts = pickLists.filter(p => {
    if (p.status !== 'draft') return false;
    const days = (Date.now() - new Date(p.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
    return days > 7;
  }).length;
  const attentionItems: { icon: React.ReactNode; text: string; tone: 'warn' | 'info' }[] = [];
  if (unassignedOpen > 0) attentionItems.push({ icon: <User size={14} />, text: `${unassignedOpen} list${unassignedOpen === 1 ? '' : 's'} not assigned to anyone`, tone: 'warn' });
  if (readyNoPicks > 0) attentionItems.push({ icon: <Play size={14} />, text: `${readyNoPicks} ready list${readyNoPicks === 1 ? '' : 's'} with no picks started yet`, tone: 'info' });
  if (stuckDrafts > 0) attentionItems.push({ icon: <AlertCircle size={14} />, text: `${stuckDrafts} draft${stuckDrafts === 1 ? '' : 's'} untouched for over a week`, tone: 'info' });

  const statusBars: { key: PickListStatus; label: string; count: number; color: string }[] = [
    { key: 'draft', label: 'Draft', count: draftCount, color: PL_STATUS.draft.color },
    { key: 'ready', label: 'Ready', count: readyCount, color: PL_STATUS.ready.color },
    { key: 'completed', label: 'Completed', count: completedCount, color: PL_STATUS.completed.color },
  ];
  const maxStatus = Math.max(1, draftCount, readyCount, completedCount);

  // Empty state — no pick lists at all
  if (total === 0) {
    return (
      <div style={{ maxWidth: '720px', margin: '40px auto 0', textAlign: 'center' }}>
        <div style={{ width: '64px', height: '64px', borderRadius: '16px', background: 'var(--primary)18', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
          <FileText size={28} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 8px' }}>No pick lists yet</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 auto 22px', maxWidth: '460px', lineHeight: 1.55 }}>
          Pick lists let your team pull stock for orders, transfers, or jobs. Create a list, add items with quantities, mark it ready, and your team can pick from the mobile app.
        </p>
        {!isClient && (
          <button className="btn-primary" style={{ padding: '11px 20px', fontSize: '14px' }} onClick={onCreate}>
            <Plus size={15} /> Create your first pick list
          </button>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', maxWidth: '1080px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Pick Lists</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
            {isClient ? 'View-only — choose a list on the left to inspect.' : `Tracking ${total} list${total === 1 ? '' : 's'} across your team.`}
          </p>
        </div>
        {!isClient && (
          <button className="btn-primary" style={{ padding: '9px 16px', fontSize: '13px' }} onClick={onCreate}>
            <Plus size={14} /> New Pick List
          </button>
        )}
      </div>

      {/* Hero — pick rate */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary)10, var(--card-bg) 60%)',
        border: '1px solid var(--border-color)',
        borderRadius: '14px',
        padding: '24px 26px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Pick Rate</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
              <span style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1, color: pickRate === 100 ? '#22c55e' : 'var(--primary)' }}>{pickRate}%</span>
              <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>across all lists</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Requested</div>
              <div style={{ fontSize: '22px', fontWeight: 700 }}>{requestedTotal}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Picked</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: '#22c55e' }}>{pickedTotal}</div>
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '4px' }}>Remaining</div>
              <div style={{ fontSize: '22px', fontWeight: 700, color: itemsRemaining > 0 ? '#f59e0b' : 'var(--text-muted)' }}>{itemsRemaining}</div>
            </div>
          </div>
        </div>
        <div style={{ height: '10px', background: 'var(--surface-raised, #00000012)', borderRadius: '999px', overflow: 'hidden' }}>
          <div style={{ width: `${pickRate}%`, height: '100%', background: 'linear-gradient(90deg, #3b82f6, #22c55e)', transition: 'width 0.4s ease', borderRadius: '999px' }} />
        </div>
      </div>

      {/* Status breakdown + Workload */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '16px' }}>
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px 22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px' }}>Status breakdown</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {statusBars.map(s => (
              <div key={s.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '13px', marginBottom: '5px' }}>
                  <span style={{ fontWeight: 500, color: 'var(--text-medium, inherit)' }}>{s.label}</span>
                  <span style={{ fontWeight: 700, color: s.color }}>{s.count}</span>
                </div>
                <div style={{ height: '6px', background: 'var(--surface-raised, #00000010)', borderRadius: '999px', overflow: 'hidden' }}>
                  <div style={{ width: `${(s.count / maxStatus) * 100}%`, height: '100%', background: s.color, transition: 'width 0.3s' }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px 22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 16px' }}>Workload</h3>
          {assigneeWorkload.length === 0 ? (
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
              No lists are assigned yet — assign one from a list's detail panel.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '11px' }}>
              {assigneeWorkload.slice(0, 5).map(a => (
                <div key={a.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)20', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                      {a.name.charAt(0).toUpperCase()}
                    </span>
                    <span style={{ fontWeight: 500 }}>{a.name}</span>
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    <b style={{ color: a.open > 0 ? 'var(--text-dark, inherit)' : 'var(--text-muted)' }}>{a.open}</b> open
                    <span style={{ opacity: 0.5 }}> · </span>
                    {a.total} total
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Needs attention — only when there's something actionable */}
      {!isClient && attentionItems.length > 0 && (
        <div style={{ background: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '18px 22px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 700, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={15} color="#f59e0b" /> Needs attention
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {attentionItems.map((a, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: 'var(--text-medium, inherit)' }}>
                <span style={{ width: '26px', height: '26px', borderRadius: '7px', background: a.tone === 'warn' ? '#f59e0b18' : 'var(--primary)15', color: a.tone === 'warn' ? '#f59e0b' : 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {a.icon}
                </span>
                <span>{a.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pick Lists ────────────────────────────────────────────────────────────────
function PickLists() {
  const wf = useWorkflows();
  const store = useStore();
  const { members } = useTeam();
  const { user } = useAuth();

  const [filter, setFilter] = useState<PickListFilterTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState<'any' | 'assigned' | 'unassigned' | string>('any');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'progress_high' | 'progress_low' | 'name'>('newest');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [addingItem, setAddingItem] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');
  const [addQty, setAddQty] = useState('1');
  const [addErr, setAddErr] = useState<string | null>(null);

  const [comments, setComments] = useState<PickListComment[]>([]);
  const [issues, setIssues] = useState<PickListIssue[]>([]);
  const [newComment, setNewComment] = useState('');
  const [detailTab, setDetailTab] = useState<'items' | 'comments'>('items');

  const selected = selectedId ? wf.getPickListById(selectedId) : null;
  const isClient = members.find(m => m.id === user?.id)?.role === 'client';

  const loadCommentsIssues = useCallback(async () => {
    if (!selectedId) { setComments([]); setIssues([]); return; }
    try {
      const [c, i] = await Promise.all([wf.fetchComments(selectedId), wf.fetchIssues(selectedId)]);
      setComments(c);
      setIssues(i);
    } catch { /* ignore */ }
  }, [selectedId, wf]);

  useEffect(() => { void loadCommentsIssues(); }, [loadCommentsIssues]);

  const filteredLists = useMemo(() => {
    let list = wf.pickLists.slice();

    // Status tab
    if (filter === 'active') list = list.filter(p => p.status !== 'completed');
    else if (filter === 'history') list = list.filter(p => p.status === 'completed');
    else list = list.filter(p => p.status === filter);

    // Assignee
    if (assigneeFilter === 'unassigned') {
      list = list.filter(p => !p.assignedTo);
    } else if (assigneeFilter === 'assigned') {
      list = list.filter(p => !!p.assignedTo);
    } else if (assigneeFilter !== 'any') {
      list = list.filter(p => p.assignedTo === assigneeFilter);
    }

    // Text search across name + code
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.code.toLowerCase().includes(q),
      );
    }

    // Sort
    const progressOf = (p: PickList) => {
      const req = p.items.reduce((s, i) => s + i.requestedQty, 0);
      if (req === 0) return 0;
      const got = p.items.reduce((s, i) => s + i.pickedQty, 0);
      return got / req;
    };
    list.sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return a.createdAt.localeCompare(b.createdAt);
        case 'name': return a.name.localeCompare(b.name);
        case 'progress_high': return progressOf(b) - progressOf(a);
        case 'progress_low': return progressOf(a) - progressOf(b);
        case 'newest':
        default:
          // History tab uses completion date (more meaningful for completed lists)
          if (filter === 'history') {
            return (b.completedAt ?? b.updatedAt).localeCompare(a.completedAt ?? a.updatedAt);
          }
          return b.createdAt.localeCompare(a.createdAt);
      }
    });

    return list;
  }, [wf.pickLists, filter, assigneeFilter, searchQuery, sortBy]);

  const filtersActive =
    searchQuery.trim() !== '' ||
    assigneeFilter !== 'any' ||
    sortBy !== 'newest';

  const resetFilters = () => {
    setSearchQuery('');
    setAssigneeFilter('any');
    setSortBy('newest');
  };

  const assigneeName = selected?.assignedTo ? (members.find(m => m.id === selected.assignedTo)?.name ?? null) : null;
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    if (!newName.trim() || creating) return;
    setCreating(true);
    try {
      const pl = await wf.createPickList(newName.trim(), newNotes, newAssignee || null);
      setNewName(''); setNewNotes(''); setNewAssignee(''); setCreateError(null);
      setShowCreate(false);
      setSelectedId(pl.id);
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Create failed');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = (pl: PickList) => {
    if (!confirm(`Delete pick list "${pl.name}"?`)) return;
    wf.deletePickList(pl.id).catch(e => alert(e.message));
    if (selectedId === pl.id) setSelectedId(null);
  };

  const [addingPickItem, setAddingPickItem] = useState(false);
  const handleAddItem = async (itemId: string) => {
    if (!selected || addingPickItem) return;
    const qty = parseInt(addQty) || 1;
    const avail = availableFor(itemId);
    if (qty > avail) {
      setAddErr(`Only ${avail} available — cannot request ${qty}`);
      return;
    }
    setAddingPickItem(true);
    try {
      await wf.addPickListItem(selected.id, { itemId, requestedQty: qty });
      setAddingItem(false); setAddItemSearch(''); setAddQty('1'); setAddErr(null);
    } catch (e) {
      setAddErr(e instanceof Error ? e.message : 'Add failed');
    } finally {
      setAddingPickItem(false);
    }
  };

  const handleAddComment = async () => {
    if (!selected || !newComment.trim()) return;
    try {
      await wf.addComment(selected.id, newComment.trim());
      setNewComment('');
      await loadCommentsIssues();
    } catch (e) { alert(e instanceof Error ? e.message : 'Comment failed'); }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!selected) return;
    if (!confirm('Delete comment?')) return;
    try {
      await wf.deleteComment(selected.id, commentId);
      await loadCommentsIssues();
    } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const handleDeleteIssue = async (issueId: string) => {
    if (!selected) return;
    if (!confirm('Delete issue?')) return;
    try {
      await wf.deleteIssue(selected.id, issueId);
      await loadCommentsIssues();
    } catch (e) { alert(e instanceof Error ? e.message : 'Delete failed'); }
  };

  const copyCode = (code: string) => { void navigator.clipboard?.writeText(code); };

  const availableFor = (itemId: string) => {
    const item = store.getItemById(itemId);
    if (!item) return 0;
    const reserved = wf.reservations[itemId] ?? 0;
    return item.quantity - reserved;
  };

  return (
    <div className="wf-shell">
      <div className="wf-side" style={{ width: '340px', minWidth: '340px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontWeight: 600 }}>Pick Lists ({wf.pickLists.length})</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              {!isClient && (
                <button className="btn-primary" style={{ padding: '7px 12px', fontSize: '12px' }} onClick={() => setShowCreate(true)}>
                  <Plus size={13} /> New
                </button>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {(['active', 'draft', 'ready', 'history'] as const).map(tab => (
              <button key={tab} onClick={() => setFilter(tab)}
                style={{
                  padding: '4px 10px', fontSize: '12px', fontWeight: 600,
                  background: filter === tab ? 'var(--primary)' : 'transparent',
                  color: filter === tab ? '#fff' : 'var(--text-muted)',
                  borderRadius: '20px', border: filter === tab ? 'none' : '1px solid var(--border-color)',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Search + filters */}
          <div style={{ marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ position: 'relative' }}>
              <SearchIcon
                size={13}
                color="var(--text-muted)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                className="input"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search by name or code…"
                style={{ width: '100%', fontSize: '12px', padding: '6px 10px 6px 28px' }}
              />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
              <select
                className="input"
                value={assigneeFilter}
                onChange={e => setAssigneeFilter(e.target.value)}
                style={{ fontSize: '12px', padding: '5px 8px' }}
                title="Filter by assignee"
              >
                <option value="any">All assignees</option>
                <option value="assigned">All assigned</option>
                <option value="unassigned">Unassigned</option>
                {user && members.find(m => m.id === user.id) && (
                  <option value={user.id}>Me</option>
                )}
                <optgroup label="Team">
                  {members.filter(m => m.id !== user?.id).map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </optgroup>
              </select>
              <select
                className="input"
                value={sortBy}
                onChange={e => setSortBy(e.target.value as typeof sortBy)}
                style={{ fontSize: '12px', padding: '5px 8px' }}
                title="Sort"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="progress_high">Most picked %</option>
                <option value="progress_low">Least picked %</option>
                <option value="name">Name A → Z</option>
              </select>
            </div>
            {filtersActive && (
              <button
                onClick={resetFilters}
                style={{
                  background: 'transparent', border: 'none',
                  color: 'var(--text-muted)', fontSize: '11px', fontWeight: 600,
                  cursor: 'pointer', padding: '2px 0', textAlign: 'left',
                  textDecoration: 'underline',
                }}
              >
                Clear filters
              </button>
            )}
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {filteredLists.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <FileText size={32} />
              <p style={{ fontSize: '14px' }}>No pick lists</p>
              <p>Create one to start.</p>
            </div>
          ) : filteredLists.map(pl => (
            <div key={pl.id} onClick={() => setSelectedId(pl.id)}
              style={{
                padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px',
                background: selectedId === pl.id ? 'var(--primary-light)' : 'var(--card-bg)',
                border: `1px solid ${selectedId === pl.id ? 'var(--primary)' : 'var(--border-color)'}`,
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{pl.name}</span>
                <StatusBadge {...PL_STATUS[pl.status]} />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Hash size={10} /> {pl.code}
                <span style={{ color: '#e2e8f0' }}>·</span>
                {pl.items.length} item{pl.items.length === 1 ? '' : 's'}
                <span style={{ color: '#e2e8f0' }}>·</span>
                {formatDate(pl.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {!selected ? (
          <PickListOverview
            pickLists={wf.pickLists}
            members={members}
            isClient={isClient}
            onCreate={() => setShowCreate(true)}
          />
        ) : (() => {
          const requestedTotal = selected.items.reduce((acc, pi) => acc + pi.requestedQty, 0);
          const pickedTotal = selected.items.reduce((acc, pi) => acc + pi.pickedQty, 0);
          const pct = requestedTotal > 0 ? Math.min(100, (pickedTotal / requestedTotal) * 100) : 0;
          const completedBy = selected.status === 'completed'
            ? (() => {
                const lastPick = [...selected.items]
                  .filter(pi => pi.pickedAt && pi.pickedBy)
                  .sort((a, b) => (b.pickedAt ?? '').localeCompare(a.pickedAt ?? ''))[0];
                if (!lastPick?.pickedBy) return null;
                return members.find(m => m.id === lastPick.pickedBy)?.name ?? 'Member';
              })()
            : null;
          const hasPicks = pickedTotal > 0;
          return (
          <>
            {/* Header bar — title + actions */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h2 style={{ fontSize: '22px', fontWeight: 700 }}>{selected.name}</h2>
                <StatusBadge {...PL_STATUS[selected.status]} />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected.status === 'draft' && !isClient && (
                  <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px', background: '#3b82f6' }}
                    onClick={() => wf.markReady(selected.id).catch(e => alert(e.message))}
                    disabled={selected.items.length === 0}
                    title={selected.items.length === 0 ? 'Add at least one item first' : 'Mark ready to pick'}>
                    <Play size={13} /> Mark Ready
                  </button>
                )}
                {selected.status === 'ready' && !isClient && (
                  <>
                    {selected.items.every(it => it.pickedQty === 0) && (
                      <button className="btn-outline" style={{ fontSize: '12px', padding: '7px 12px' }}
                        onClick={() => {
                          if (!confirm('Move this pick list back to draft? You\'ll be able to edit items again.')) return;
                          wf.unmarkReady(selected.id).catch(e => alert(e.message));
                        }}
                        title="Revert to draft (only available before any picks have happened)">
                        <FileText size={13} /> Back to Draft
                      </button>
                    )}
                    <button className="btn-primary" style={{
                      fontSize: '12px', padding: '7px 14px',
                      background: hasPicks ? '#22c55e' : '#f59e0b',
                      boxShadow: hasPicks ? undefined : '0 0 0 3px rgba(245, 158, 11, 0.20)',
                    }}
                      onClick={() => {
                        if (!hasPicks) {
                          const proceed = confirm(
                            `⚠ No items have been picked yet on "${selected.name}".\n\n` +
                            `Marking it complete now will lock it with 0 / ${requestedTotal} units picked. ` +
                            `This cannot be undone.\n\nAre you sure you want to complete an empty pick list?`
                          );
                          if (!proceed) return;
                        } else if (!confirm('Mark this pick list as completed? This cannot be undone — the list will become read-only.')) {
                          return;
                        }
                        wf.completePickList(selected.id).catch(e => alert(e.message));
                      }}
                      title={hasPicks
                        ? 'Lock this pick list as completed (irreversible)'
                        : 'Warning: no items picked yet'}>
                      {hasPicks
                        ? <><CheckCircle2 size={13} /> Mark Complete</>
                        : <><AlertTriangle size={13} /> Mark Complete (empty)</>}
                    </button>
                  </>
                )}
                {!isClient && selected.status !== 'completed' && (
                  <button style={{ color: 'var(--danger)', padding: '7px' }} onClick={() => handleDelete(selected)} title="Delete pick list">
                    <Trash2 size={16} />
                  </button>
                )}
                {selected.status === 'completed' && (
                  <span title="Completed pick lists are locked"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-muted)', padding: '7px 10px', borderRadius: '6px', background: 'var(--surface-raised)' }}>
                    <Lock size={12} /> Locked
                  </span>
                )}
              </div>
            </div>

            {/* Header summary card — code, dates, assignee, completed by, progress bar */}
            <div className="card" style={{ padding: '20px 22px', marginBottom: '16px', cursor: 'default' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '14px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                  <span title="Unique pick list code" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontWeight: 600, color: 'var(--primary)' }}>
                    <Hash size={13} /> {selected.code}
                    <button onClick={() => copyCode(selected.code)} title="Copy code" style={{ color: 'var(--text-muted)', padding: '0 2px' }}>
                      <Copy size={12} />
                    </button>
                  </span>
                  {selected.status !== 'completed' && !isClient ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <User size={12} /> Assigned to:
                      <select
                        value={selected.assignedTo ?? ''}
                        onChange={e => {
                          const val = e.target.value || null;
                          wf.updatePickList(selected.id, { assignedTo: val }).catch(err => alert(err.message));
                        }}
                        style={{
                          fontSize: '13px', fontWeight: 600, color: 'var(--text-dark)',
                          background: 'var(--surface-raised)', border: '1px solid var(--border-color)',
                          borderRadius: '6px', padding: '3px 8px', cursor: 'pointer',
                        }}
                      >
                        <option value="">Everyone</option>
                        {members.map(m => (
                          <option key={m.id} value={m.id}>{m.name}{m.role === 'client' ? ' (client)' : ''}</option>
                        ))}
                      </select>
                    </span>
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                      <User size={12} /> Assigned to: <b style={{ color: 'var(--text-dark)' }}>{assigneeName ?? 'Everyone'}</b>
                    </span>
                  )}
                  {completedBy && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#22c55e', fontWeight: 600 }}>
                      <CheckCircle2 size={12} /> Completed by: {completedBy}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: 'var(--text-muted)', alignItems: 'flex-end' }}>
                  <span>Created {formatDateTime(selected.createdAt)}</span>
                  {selected.completedAt && <span>Completed {formatDateTime(selected.completedAt)}</span>}
                </div>
              </div>

              {selected.items.length > 0 && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
                      <b style={{ color: 'var(--text-dark)' }}>{pickedTotal}</b> / {requestedTotal} items picked
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color: pct >= 100 ? '#22c55e' : 'var(--primary)' }}>
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                  <div style={{ height: '8px', background: 'var(--surface-raised)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${pct}%`,
                      background: pct >= 100 ? '#22c55e' : 'var(--primary)',
                      transition: 'width 0.4s ease',
                      borderRadius: '4px',
                    }} />
                  </div>
                </>
              )}
            </div>

            {selected.status === 'draft' && selected.items.length === 0 && !isClient && (
              <div style={{
                background: 'linear-gradient(180deg, #fffbeb 0%, #fef3c7 100%)',
                border: '1px solid #fbbf24',
                borderLeft: '4px solid #f59e0b',
                borderRadius: '10px',
                padding: '14px 18px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
              }}>
                <AlertTriangle size={20} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#92400e', marginBottom: '3px' }}>
                    This pick list is empty
                  </div>
                  <div style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.45' }}>
                    Add at least one item below before you can mark it as ready to pick.
                    The <b>Mark Ready</b> button stays disabled until at least one item is added.
                  </div>
                </div>
              </div>
            )}

            {selected.notes && (
              <div style={{ background: 'var(--surface-raised)', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-medium)' }}>
                {selected.notes}
              </div>
            )}

            {/* Items / Comments tab toggle */}
            <div style={{ display: 'flex', gap: '6px', background: 'var(--surface-raised)', padding: '4px', borderRadius: '10px', marginBottom: '16px', maxWidth: '420px' }}>
              {(['items', 'comments'] as const).map(t => {
                const count = t === 'items' ? selected.items.length : comments.length;
                const active = detailTab === t;
                return (
                  <button key={t} onClick={() => setDetailTab(t)}
                    style={{
                      flex: 1, padding: '9px 14px', fontSize: '13px', fontWeight: 600,
                      borderRadius: '7px',
                      background: active ? 'var(--primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-muted)',
                      transition: 'all 0.15s',
                    }}>
                    {t === 'items' ? 'Items' : 'Comments'} ({count})
                  </button>
                );
              })}
            </div>

            {detailTab === 'items' && (
              <>
                {/* Inventory Deduction Summary — visible when any qty has been picked */}
                {hasPicks && (
                  <div className="card" style={{ padding: '16px 18px', marginBottom: '14px', cursor: 'default' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: 700 }}>
                      <CheckCircle2 size={16} color="#22c55e" /> Inventory Deduction Summary
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '8px 16px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--text-muted)', paddingBottom: '8px', borderBottom: '1px solid var(--border-color)' }}>
                      <span>Item Name</span>
                      <span style={{ textAlign: 'right' }}>Picked</span>
                      <span style={{ textAlign: 'right' }}>Remaining</span>
                    </div>
                    {selected.items.filter(pi => pi.pickedQty > 0).map(pi => {
                      const item = store.getItemById(pi.itemId);
                      return (
                        <div key={pi.itemId} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 100px', gap: '8px 16px', fontSize: '13px', padding: '10px 0', borderBottom: '1px solid var(--border-color)' }}>
                          <span style={{ color: 'var(--text-dark)' }}>{item?.name ?? '(deleted)'}</span>
                          <span style={{ textAlign: 'right', fontWeight: 600 }}>{pi.pickedQty}</span>
                          <span style={{ textAlign: 'right', fontWeight: 600, color: 'var(--primary)' }}>{(item?.quantity ?? 0)}</span>
                        </div>
                      );
                    })}
                    <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      * Quantities deducted automatically from main inventory on pick.
                    </div>
                  </div>
                )}

                {/* Item rows — 2-col grid on wide screens to fill space */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(440px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                  {selected.items.length === 0 && (
                    <div className="empty-state" style={{ padding: '28px 16px', background: 'var(--surface-raised)', borderRadius: '10px', gridColumn: '1 / -1' }}>
                      <Package size={36} /><p>No items added</p><p>Add items below to include them in this pick list.</p>
                    </div>
                  )}
                  {selected.items.map(pi => {
                    const item = store.getItemById(pi.itemId);
                    const done = pi.pickedQty >= pi.requestedQty;
                    const remaining = pi.requestedQty - pi.pickedQty;
                    const stock = item?.quantity ?? 0;
                    const reservedInOthers = Math.max(0, (wf.reservations[pi.itemId] ?? 0) - remaining);
                    const lineIssues = issues.filter(i => i.pickListItemId === pi.id);
                    const thumb = item?.photos?.[0];
                    return (
                      <div key={pi.itemId} className={done ? 'wf-item-row done' : 'wf-item-row'} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '14px 16px', borderRadius: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {/* Thumbnail */}
                          <div style={{ width: '52px', height: '52px', borderRadius: '8px', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-raised)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-color)' }}>
                            {thumb ? (
                              <img src={thumb} alt={item?.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                              <Package size={22} color={done ? '#22c55e' : 'var(--text-muted)'} />
                            )}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: 600, fontSize: '14px' }}>{item?.name ?? '(deleted)'}</span>
                              {item?.sku && (
                                <span style={{ fontSize: '11px', color: 'var(--primary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <MapPin size={11} /> {item.sku}
                                </span>
                              )}
                              {item?.location && (
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@ {item.location}</span>
                              )}
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                              Requested <b style={{ color: 'var(--text-dark)' }}>{pi.requestedQty}</b>
                              <span style={{ color: '#e2e8f0', margin: '0 8px' }}>·</span>
                              Picked <b style={{ color: done ? '#22c55e' : 'var(--text-dark)' }}>{pi.pickedQty}</b>
                              <span style={{ color: '#e2e8f0', margin: '0 8px' }}>·</span>
                              <span style={{ color: 'var(--primary)', fontWeight: 600 }}>Stock: {stock}</span> {item?.unit}
                              {reservedInOthers > 0 && (
                                <> <span style={{ color: '#e2e8f0', margin: '0 6px' }}>·</span> <span style={{ color: '#f59e0b' }}>Reserved elsewhere: {reservedInOthers}</span></>
                              )}
                            </div>
                            {pi.pickedAt && pi.pickedBy && (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                                Last pick {formatDateTime(pi.pickedAt)} by {members.find(m => m.id === pi.pickedBy)?.name ?? 'member'}
                              </div>
                            )}
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px', flexShrink: 0 }}>
                            {selected.status === 'draft' && !isClient && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <button style={{ background: 'var(--surface-raised)', borderRadius: '6px', padding: '4px 8px' }}
                                  onClick={() => wf.updatePickListItem(selected.id, pi.itemId, { requestedQty: Math.max(1, pi.requestedQty - 1) })}>
                                  <Minus size={13} />
                                </button>
                                <span style={{ fontWeight: 700, width: '32px', textAlign: 'center' }}>{pi.requestedQty}</span>
                                <button style={{ background: 'var(--surface-raised)', borderRadius: '6px', padding: '4px 8px', opacity: pi.requestedQty >= stock ? 0.4 : 1, cursor: pi.requestedQty >= stock ? 'not-allowed' : 'pointer' }}
                                  disabled={pi.requestedQty >= stock}
                                  title={pi.requestedQty >= stock ? `Only ${stock} in stock` : 'Increase quantity'}
                                  onClick={() => {
                                    if (pi.requestedQty >= stock) { alert(`Only ${stock} in stock`); return; }
                                    wf.updatePickListItem(selected.id, pi.itemId, { requestedQty: pi.requestedQty + 1 }).catch(e => alert(e.message));
                                  }}>
                                  <Plus size={13} />
                                </button>
                                <button style={{ color: 'var(--text-muted)', padding: '4px' }} onClick={() => wf.removePickListItem(selected.id, pi.itemId)}>
                                  <X size={14} />
                                </button>
                              </div>
                            )}
                            {selected.status !== 'draft' && (
                              <span style={{ fontSize: '15px', fontWeight: 700, color: done ? '#22c55e' : 'var(--text-dark)' }}>
                                {pi.pickedQty} / {pi.requestedQty}
                              </span>
                            )}
                            {selected.status === 'ready' && remaining > 0 && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                                Pick on mobile
                              </span>
                            )}
                            {selected.status === 'ready' && done && <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>✓ Done</span>}
                            {selected.status === 'completed' && <span style={{ fontSize: '11px', color: '#22c55e', fontWeight: 700 }}>picked</span>}
                          </div>
                        </div>
                        {lineIssues.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '66px' }}>
                            {lineIssues.map(iss => (
                              <div key={iss.id} style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span>
                                  <AlertTriangle size={11} style={{ display: 'inline', marginRight: '4px', color: '#d97706' }} />
                                  <b>{ISSUE_LABELS[iss.issueType]}</b>
                                  {iss.quantityAffected > 0 && <> — {iss.quantityAffected} affected</>}
                                  {iss.notes && <> — {iss.notes}</>}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--text-muted)' }}>{formatDateTime(iss.createdAt)}</span>
                                  {iss.reportedBy === user?.id && (
                                    <button style={{ color: 'var(--danger)' }} onClick={() => handleDeleteIssue(iss.id)} title="Delete issue">
                                      <X size={11} />
                                    </button>
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add item */}
                {selected.status === 'draft' && !isClient && (!addingItem ? (
                  <button className="btn-outline" style={{ fontSize: '13px' }} onClick={() => setAddingItem(true)}>
                    <Plus size={14} /> Add Item
                  </button>
                ) : (
                  <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'var(--surface-raised)' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                      <input className="input" placeholder="Search by name, SKU, location..."
                        value={addItemSearch} onChange={e => setAddItemSearch(e.target.value)} autoFocus style={{ flex: 1 }} />
                      <input className="input" type="number" min={1} placeholder="Qty" value={addQty}
                        onChange={e => setAddQty(e.target.value)} style={{ width: '80px' }} />
                    </div>
                    {addErr && <div style={{ color: 'var(--danger)', fontSize: '12px', marginBottom: '8px' }}>{addErr}</div>}
                    <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {store.items
                        .filter(i => {
                          const q = addItemSearch.toLowerCase();
                          const matches = !q
                            || i.name.toLowerCase().includes(q)
                            || (i.sku ?? '').toLowerCase().includes(q)
                            || (i.location ?? '').toLowerCase().includes(q)
                            || i.id.toLowerCase().includes(q);
                          return matches && !selected.items.some(pi => pi.itemId === i.id);
                        })
                        .slice(0, 25)
                        .map(it => {
                          const avail = availableFor(it.id);
                          const disabled = avail <= 0;
                          return (
                            <div key={it.id} style={{
                              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                              padding: '8px 12px', borderRadius: '8px', background: 'var(--card-bg)',
                              border: '1px solid var(--border-color)',
                              cursor: disabled ? 'not-allowed' : 'pointer',
                              opacity: disabled ? 0.5 : 1,
                            }} onClick={() => !disabled && handleAddItem(it.id)}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 500 }}>{it.name}</div>
                                <div style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                                  {it.sku && <span>SKU {it.sku}</span>}
                                  {it.location && <span>@ {it.location}</span>}
                                </div>
                              </div>
                              <span style={{ fontSize: '12px', color: disabled ? 'var(--danger)' : 'var(--text-muted)', fontWeight: 600 }}>
                                {avail} available{disabled ? ' (reserved)' : ''} · {it.quantity} total
                              </span>
                            </div>
                          );
                        })}
                    </div>
                    <button className="btn-outline" style={{ marginTop: '10px', fontSize: '12px' }} onClick={() => { setAddingItem(false); setAddItemSearch(''); setAddQty('1'); setAddErr(null); }}>Cancel</button>
                  </div>
                ))}

                {selected.status === 'ready' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', padding: '12px', background: 'var(--surface-raised)', borderRadius: '8px', marginTop: '12px' }}>
                    <Lock size={14} /> Picking is performed in the mobile app. The web dashboard is for creating and reviewing pick lists.
                  </div>
                )}
              </>
            )}

            {detailTab === 'comments' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                  {comments.length === 0 && <div style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '24px' }}>No comments yet.</div>}
                  {comments.map(c => (
                    <div key={c.id} style={{ background: c.userId === user?.id ? 'var(--primary-light)' : 'var(--surface-raised)', borderRadius: '8px', padding: '10px 14px', border: '1px solid var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)' }}>{c.userName ?? (c.userId === user?.id ? 'You' : 'Member')}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatDateTime(c.createdAt)}</span>
                          {c.userId === user?.id && (
                            <button style={{ color: 'var(--danger)', padding: '2px' }} onClick={() => handleDeleteComment(c.id)} title="Delete">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </span>
                      </div>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', whiteSpace: 'pre-wrap' }}>{c.content}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input className="input" placeholder="Add a comment..." value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleAddComment(); } }}
                    style={{ flex: 1 }} />
                  <button className="btn-primary" onClick={handleAddComment} disabled={!newComment.trim()} style={{ padding: '0 14px' }}>
                    <Send size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
          );
        })()}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>New Pick List</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} color="var(--text-muted)" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Name * <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>(must be unique)</span></label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Morning Pick Run" autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Assign To</label>
                <select className="input" value={newAssignee} onChange={e => setNewAssignee(e.target.value)}>
                  <option value="">Unassigned (any team member can pick)</option>
                  {members.filter(m => m.role !== 'client').map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Notes</label>
                <textarea className="input" rows={3} value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Optional notes..." style={{ resize: 'vertical' }} />
              </div>
              {createError && <div style={{ color: 'var(--danger)', fontSize: '13px' }}>{createError}</div>}
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '6px' }}>
                A unique code (e.g. <code>PL-A3K9FX</code>) will be auto-generated when you save.
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newName.trim() || creating}>{creating ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Issue modal ──────────────────────────────────────────────────────────────
// ── Purchase Orders (server-backed) ──────────────────────────────────────────
function PurchaseOrders() {
  const wf = useWorkflows();
  const store = useStore();
  const { settings } = useSettings();
  const { format } = useCurrency();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newSupplier, setNewSupplier] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');

  const selected = selectedId ? wf.getPOById(selectedId) : null;
  const filteredItems = store.items.filter(i =>
    i.name.toLowerCase().includes(addItemSearch.toLowerCase()) &&
    !selected?.items.some(pi => pi.itemId === i.id)
  );

  const handleCreate = async () => {
    if (!newSupplier.trim()) return;
    try {
      const po = await wf.createPurchaseOrder(newSupplier.trim(), newNotes);
      setNewSupplier(''); setNewNotes('');
      setShowCreate(false);
      setSelectedId(po.id);
    } catch (e) { alert(e instanceof Error ? e.message : 'Create failed'); }
  };

  const handleReceive = async (po: PurchaseOrder) => {
    if (!confirm('Mark as received? Ordered quantities will be added to inventory.')) return;
    try { await wf.receivePO(po.id); }
    catch (e) { alert(e instanceof Error ? e.message : 'Receive failed'); }
  };

  const poTotal = (po: PurchaseOrder) => po.items.reduce((acc, i) => acc + i.orderedQty * i.unitPrice, 0);

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div className="wf-side" style={{ width: '340px', minWidth: '340px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Purchase Orders ({wf.purchaseOrders.length})</span>
          <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={() => setShowCreate(true)}>
            <Plus size={13} /> New
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {wf.purchaseOrders.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <ShoppingCart size={32} />
              <p style={{ fontSize: '14px' }}>No purchase orders</p>
              <p>Create one to track procurement.</p>
            </div>
          ) : wf.purchaseOrders.map(po => (
            <div key={po.id} onClick={() => setSelectedId(po.id)}
              style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', background: selectedId === po.id ? 'var(--primary-light)' : '#fff', border: `1px solid ${selectedId === po.id ? 'var(--primary)' : 'var(--border-color)'}`, transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px', fontFamily: 'monospace' }}>{po.poNumber}</span>
                <StatusBadge {...PO_STATUS[po.status]} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {po.supplier || 'No supplier'} · {po.items.length} items · {format(poTotal(po))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {!selected ? (
          <div className="empty-state" style={{ paddingTop: '80px' }}>
            <ShoppingCart size={44} />
            <p>Select a purchase order</p><p>Or create a new one.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px', fontFamily: 'monospace' }}>{selected.poNumber}</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <StatusBadge {...PO_STATUS[selected.status]} />
                  {selected.supplier && <span>Supplier: <b>{selected.supplier}</b></span>}
                  <span>{formatDate(selected.createdAt)}</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected.status === 'draft' && (
                  <button className="btn-outline" style={{ fontSize: '12px', padding: '7px 14px' }} onClick={() => wf.updatePurchaseOrder(selected.id, { status: 'ordered' })}>Mark Ordered</button>
                )}
                {selected.status === 'ordered' && (
                  <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px', background: '#22c55e' }} onClick={() => handleReceive(selected)}><Check size={13} /> Receive Order</button>
                )}
                {selected.status !== 'received' && selected.status !== 'cancelled' && (
                  <button className="btn-outline" style={{ fontSize: '12px', padding: '7px 14px', color: 'var(--danger)', borderColor: 'var(--danger)' }} onClick={() => wf.updatePurchaseOrder(selected.id, { status: 'cancelled' })}>Cancel</button>
                )}
                <button style={{ color: 'var(--danger)', padding: '7px' }} onClick={() => { if (confirm('Delete this PO?')) { void wf.deletePurchaseOrder(selected.id); setSelectedId(null); } }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '20px' }}>
              {[
                { label: 'Items', value: selected.items.length },
                { label: 'Total Units', value: selected.items.reduce((a, i) => a + i.orderedQty, 0) },
                { label: 'Total Cost', value: format(poTotal(selected)) },
              ].map(s => (
                <div key={s.label} className="card" style={{ padding: '14px 16px', cursor: 'default' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 500 }}>{s.label}</div>
                  <div style={{ fontSize: '20px', fontWeight: 800 }}>{s.value}</div>
                </div>
              ))}
            </div>

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 36px', background: 'var(--surface-raised)', padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Item</span><span>Qty</span><span>Unit Price</span><span>Subtotal</span><span></span>
              </div>
              {selected.items.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>No items added yet.</div>}
              {selected.items.map(pi => {
                const item = store.getItemById(pi.itemId);
                const locked = selected.status === 'received' || selected.status === 'cancelled';
                return (
                  <div key={pi.id} style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 90px 36px', padding: '12px 16px', borderTop: '1px solid var(--border-color)', alignItems: 'center' }}>
                    <span style={{ fontWeight: 500 }}>{item?.name ?? '(deleted)'}</span>
                    {locked
                      ? <span>{pi.orderedQty}</span>
                      : <input type="number" className="input" value={pi.orderedQty} min={1}
                          onChange={e => wf.updatePOItem(selected.id, pi.id, { orderedQty: parseInt(e.target.value) || 1 })}
                          style={{ padding: '4px 8px', fontSize: '13px', width: '70px' }} />}
                    {locked
                      ? <span>{format(pi.unitPrice)}</span>
                      : <input type="number" className="input" value={pi.unitPrice} min={0} step={0.01}
                          onChange={e => wf.updatePOItem(selected.id, pi.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                          style={{ padding: '4px 8px', fontSize: '13px', width: '75px' }} />}
                    <span style={{ fontWeight: 600 }}>{format(pi.orderedQty * pi.unitPrice)}</span>
                    {!locked && (
                      <button style={{ color: 'var(--text-muted)' }} onClick={() => wf.removePOItem(selected.id, pi.id)}><X size={14} /></button>
                    )}
                  </div>
                );
              })}
            </div>

            {selected.status !== 'received' && selected.status !== 'cancelled' && (!addingItem ? (
              <button className="btn-outline" style={{ fontSize: '13px' }} onClick={() => setAddingItem(true)}><Plus size={14} /> Add Item</button>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'var(--surface-raised)' }}>
                <input className="input" placeholder="Search inventory items..." value={addItemSearch} onChange={e => setAddItemSearch(e.target.value)} autoFocus style={{ marginBottom: '10px' }} />
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredItems.slice(0, 20).map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                      onClick={() => {
                        void wf.addPOItem(selected.id, { itemId: item.id, orderedQty: 1, unitPrice: item.price });
                        setAddItemSearch('');
                      }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{format(item.price)}/unit</span>
                    </div>
                  ))}
                  {filteredItems.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No matching items</p>}
                </div>
                <button className="btn-outline" style={{ marginTop: '10px', fontSize: '12px' }} onClick={() => { setAddingItem(false); setAddItemSearch(''); }}>Cancel</button>
              </div>
            ))}
          </>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>New Purchase Order</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} color="var(--text-muted)" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Supplier *</label>
                <input className="input" value={newSupplier} onChange={e => setNewSupplier(e.target.value)} placeholder="Supplier name" autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Notes</label>
                <textarea className="input" rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', background: 'var(--surface-raised)', padding: '10px 12px', borderRadius: '6px' }}>
                A unique PO number will be auto-generated (e.g. <code>PO-2026-XYZABC</code>).
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newSupplier.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Stock Counts (server-backed) ─────────────────────────────────────────────
function StockCounts() {
  const wf = useWorkflows();
  const store = useStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [addingItem, setAddingItem] = useState(false);
  const [addItemSearch, setAddItemSearch] = useState('');

  const selected = selectedId ? wf.getStockCountById(selectedId) : null;
  const filteredItems = store.items.filter(i =>
    i.name.toLowerCase().includes(addItemSearch.toLowerCase()) &&
    !selected?.items.some(si => si.itemId === i.id)
  );

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      const sc = await wf.createStockCount(newName.trim(), newNotes);
      setNewName(''); setNewNotes('');
      setShowCreate(false);
      setSelectedId(sc.id);
    } catch (e) { alert(e instanceof Error ? e.message : 'Create failed'); }
  };

  const handleApply = async (sc: StockCount) => {
    const counted = sc.items.filter(i => i.countedQuantity !== null);
    if (counted.length === 0) { alert('Enter actual quantities before applying.'); return; }
    if (!confirm(`Apply count to inventory? ${counted.length} item(s) will be reconciled.`)) return;
    try { await wf.applyStockCount(sc.id); }
    catch (e) { alert(e instanceof Error ? e.message : 'Apply failed'); }
  };

  const addAllItems = async (sc: StockCount) => {
    for (const it of store.items) {
      if (sc.items.some(si => si.itemId === it.id)) continue;
      try { await wf.addStockCountItem(sc.id, { itemId: it.id, expectedQuantity: it.quantity }); }
      catch { /* ignore */ }
    }
  };

  const discrepancies = (sc: StockCount) =>
    sc.items.filter(i => i.countedQuantity !== null && (i.difference ?? 0) !== 0).length;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <div className="wf-side" style={{ width: '340px', minWidth: '340px', borderRight: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 600 }}>Stock Counts ({wf.stockCounts.length})</span>
          <button className="btn-primary" style={{ padding: '7px 14px', fontSize: '12px' }} onClick={() => setShowCreate(true)}><Plus size={13} /> New</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '8px' }}>
          {wf.stockCounts.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px' }}>
              <ListOrdered size={32} /><p style={{ fontSize: '14px' }}>No stock counts</p><p>Create one to verify quantities.</p>
            </div>
          ) : wf.stockCounts.map(sc => (
            <div key={sc.id} onClick={() => setSelectedId(sc.id)}
              style={{ padding: '12px 14px', borderRadius: '10px', cursor: 'pointer', marginBottom: '4px', background: selectedId === sc.id ? 'var(--primary-light)' : '#fff', border: `1px solid ${selectedId === sc.id ? 'var(--primary)' : 'var(--border-color)'}`, transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <span style={{ fontWeight: 600, fontSize: '14px' }}>{sc.name}</span>
                <StatusBadge {...SC_STATUS[sc.status]} />
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {sc.items.length} items · {discrepancies(sc)} discrepancies · {formatDate(sc.createdAt)}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {!selected ? (
          <div className="empty-state" style={{ paddingTop: '80px' }}>
            <ListOrdered size={44} />
            <p>Select a stock count</p><p>Or create a new one.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>{selected.name}</h2>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>
                  <StatusBadge {...SC_STATUS[selected.status]} />
                  <span>{formatDate(selected.createdAt)}</span>
                  {discrepancies(selected) > 0 && (
                    <span style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertCircle size={13} /> {discrepancies(selected)} discrepancies
                    </span>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected.status === 'draft' && (
                  <button className="btn-outline" style={{ fontSize: '12px', padding: '7px 14px' }} onClick={() => wf.updateStockCount(selected.id, { status: 'in_progress' })}>Start Count</button>
                )}
                {selected.status === 'in_progress' && (
                  <button className="btn-primary" style={{ fontSize: '12px', padding: '7px 14px', background: '#22c55e' }} onClick={() => handleApply(selected)}><Check size={13} /> Apply to Inventory</button>
                )}
                <button style={{ color: 'var(--danger)', padding: '7px' }} onClick={() => { if (confirm('Delete this stock count?')) { void wf.deleteStockCount(selected.id); setSelectedId(null); } }}>
                  <Trash2 size={16} />
                </button>
              </div>
            </div>

            {selected.status !== 'completed' && selected.items.length < store.items.length && (
              <button className="btn-outline" style={{ fontSize: '12px', marginBottom: '16px' }} onClick={() => addAllItems(selected)}><Plus size={13} /> Add All Inventory Items</button>
            )}

            <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 36px', background: 'var(--surface-raised)', padding: '10px 16px', fontSize: '12px', fontWeight: 600, color: 'var(--text-muted)' }}>
                <span>Item</span><span>Expected</span><span>Actual Count</span><span>Diff</span><span></span>
              </div>
              {selected.items.length === 0 && <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)' }}>No items added yet.</div>}
              {selected.items.map(si => {
                const item = store.getItemById(si.itemId);
                const diff = si.difference;
                const hasDiscrepancy = diff !== null && diff !== 0;
                return (
                  <div key={si.id} style={{ display: 'grid', gridTemplateColumns: '1fr 100px 120px 80px 36px', padding: '12px 16px', borderTop: '1px solid var(--border-color)', alignItems: 'center', background: hasDiscrepancy ? 'rgba(245, 158, 11, 0.10)' : 'var(--card-bg)' }}>
                    <span style={{ fontWeight: 500 }}>{item?.name ?? '(deleted)'}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{si.expectedQuantity} {item?.unit}</span>
                    {selected.status === 'completed'
                      ? <span style={{ fontWeight: 600 }}>{si.countedQuantity ?? '—'}</span>
                      : <input type="number" className="input" value={si.countedQuantity ?? ''} min={0} placeholder="Enter count"
                          onChange={e => wf.updateStockCountItem(selected.id, si.id, { countedQuantity: e.target.value === '' ? null : parseInt(e.target.value) })}
                          style={{ padding: '4px 8px', fontSize: '13px', width: '110px' }} />}
                    <span style={{ fontWeight: 700, color: diff === null ? 'var(--text-muted)' : diff > 0 ? '#22c55e' : diff < 0 ? '#ef4444' : 'var(--text-muted)' }}>
                      {diff === null ? '—' : diff > 0 ? `+${diff}` : diff}
                    </span>
                    {selected.status !== 'completed' && (
                      <button style={{ color: 'var(--text-muted)' }} onClick={() => wf.removeStockCountItem(selected.id, si.id)}><X size={14} /></button>
                    )}
                  </div>
                );
              })}
            </div>

            {selected.status !== 'completed' && (!addingItem ? (
              <button className="btn-outline" style={{ fontSize: '13px' }} onClick={() => setAddingItem(true)}><Plus size={14} /> Add Item</button>
            ) : (
              <div style={{ border: '1px solid var(--border-color)', borderRadius: '10px', padding: '16px', background: 'var(--surface-raised)' }}>
                <input className="input" placeholder="Search inventory items..." value={addItemSearch} onChange={e => setAddItemSearch(e.target.value)} autoFocus style={{ marginBottom: '10px' }} />
                <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {filteredItems.slice(0, 20).map(item => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: '8px', background: 'var(--card-bg)', border: '1px solid var(--border-color)', cursor: 'pointer' }}
                      onClick={() => {
                        void wf.addStockCountItem(selected.id, { itemId: item.id, expectedQuantity: item.quantity });
                        setAddItemSearch('');
                      }}>
                      <span style={{ fontWeight: 500 }}>{item.name}</span>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.quantity} {item.unit}</span>
                    </div>
                  ))}
                  {filteredItems.length === 0 && <p style={{ fontSize: '13px', color: 'var(--text-muted)', textAlign: 'center', padding: '12px' }}>No matching items</p>}
                </div>
                <button className="btn-outline" style={{ marginTop: '10px', fontSize: '12px' }} onClick={() => { setAddingItem(false); setAddItemSearch(''); }}>Cancel</button>
              </div>
            ))}
          </>
        )}
      </div>

      {showCreate && (
        <div className="modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0 }}>New Stock Count</h2>
              <button onClick={() => setShowCreate(false)}><X size={20} color="var(--text-muted)" /></button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Name *</label>
                <input className="input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Q2 Full Count" autoFocus />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-medium)' }}>Notes</label>
                <textarea className="input" rows={2} value={newNotes} onChange={e => setNewNotes(e.target.value)} style={{ resize: 'vertical' }} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setShowCreate(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate} disabled={!newName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Workflows page ──────────────────────────────────────────────────────
const TABS: { id: WorkflowTab; label: string; icon: typeof FileText; comingSoon?: boolean }[] = [
  { id: 'pick-lists', label: 'Pick Lists', icon: FileText },
  { id: 'purchase-orders', label: 'Purchase Orders', icon: ShoppingCart, comingSoon: true },
  { id: 'stock-counts', label: 'Stock Counts', icon: ListOrdered, comingSoon: true },
];

function ComingSoon({ title, icon: Icon }: { title: string; icon: typeof FileText }) {
  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <div className="card" style={{ padding: '48px 56px', textAlign: 'center', maxWidth: '480px', cursor: 'default' }}>
        <div style={{ width: '72px', height: '72px', borderRadius: '50%', background: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', color: 'var(--primary)' }}>
          <Icon size={32} />
        </div>
        <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-dark)' }}>{title}</h2>
        <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: 'var(--primary)', background: 'var(--primary-light)', padding: '4px 12px', borderRadius: '20px', marginBottom: '14px' }}>
          Coming Soon
        </span>
        <p style={{ fontSize: '14px', color: 'var(--text-medium)', lineHeight: 1.6 }}>
          We're polishing this workflow. Check back soon — for now, use Pick Lists to coordinate fulfillment.
        </p>
      </div>
    </div>
  );
}

export default function Workflows() {
  const [tab, setTab] = useState<WorkflowTab>('pick-lists');

  return (
    <div className="wf-page">
      <style>{`
        /* Page shell — flex/height live in CSS (not inline) so the generic
           mobile [style*="display:flex"] rules don't force height:auto and
           break the internal scroll. */
        .wf-page { display: flex; flex-direction: column; height: 100%; }
        .wf-body { flex: 1; overflow: hidden; display: flex; }
        .wf-shell { display: flex; height: 100%; position: relative; flex: 1; min-width: 0; }

        /* Narrow screens: stack the rail above the detail pane and let the
           body wrapper scroll the whole thing as one column. */
        @media (max-width: 900px) {
          .wf-head { padding-left: 16px !important; padding-right: 16px !important; }
          .wf-body { display: block; overflow-y: auto; }
          .wf-shell { flex-direction: column; height: auto; }
          .wf-shell > .wf-side {
            width: 100% !important;
            min-width: 0 !important;
            border-right: none;
            border-bottom: 1px solid var(--border-color);
          }
        }

        .wf-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          background: transparent;
          border: none;
          font-size: 13.5px;
          font-weight: 500;
          color: var(--text-muted);
          letter-spacing: -0.005em;
          white-space: nowrap;
          cursor: pointer;
          transition: color 0.20s var(--ease);
        }
        .wf-tab::after {
          content: '';
          position: absolute;
          left: 16px; right: 16px;
          bottom: -1px;
          height: 2px;
          background: linear-gradient(90deg, var(--primary), var(--primary-soft));
          transform: scaleX(0);
          transform-origin: 50%;
          transition: transform 0.28s var(--ease-spring);
          border-radius: 2px 2px 0 0;
        }
        .wf-tab:hover { color: var(--text-dark); }
        .wf-tab.active { color: var(--primary); font-weight: 600; }
        .wf-tab.active::after { transform: scaleX(1); }
        .wf-soon-pill {
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: #B45309;
          background: rgba(245, 158, 11, 0.14);
          padding: 2px 7px;
          border-radius: 999px;
          box-shadow: inset 0 0 0 1px rgba(245, 158, 11, 0.28);
        }
      `}</style>
      <div className="wf-head" style={{
        borderBottom: '1px solid var(--border-color)',
        background: 'linear-gradient(180deg, var(--card-bg) 0%, color-mix(in srgb, var(--card-bg) 96%, var(--bg-color)) 100%)',
        padding: '20px 36px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap', marginBottom: 4 }}>
          <div>
            <span className="page-eyebrow">
              <FileText size={12} strokeWidth={2.4} /> Functions
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: 800, letterSpacing: '-0.025em' }}>Workflows</h1>
              <HelpButton topic="workflows" size={16} />
            </div>
            <p style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: '13px', maxWidth: 520 }}>
              Pick lists, purchase orders, and stock counts — coordinate everything from one place.
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0', alignItems: 'flex-end', marginTop: 16 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`wf-tab ${tab === t.id ? 'active' : ''}`}>
              <t.icon size={15} strokeWidth={2.0} /> {t.label}
              {t.comingSoon && <span className="wf-soon-pill">Soon</span>}
              {tab === t.id && !t.comingSoon && <HelpButton topic={t.id} size={12} />}
            </button>
          ))}
        </div>
      </div>

      <div className="wf-body">
        {tab === 'pick-lists' && <PickLists />}
        {tab === 'purchase-orders' && <ComingSoon title="Purchase Orders" icon={ShoppingCart} />}
        {tab === 'stock-counts' && <ComingSoon title="Stock Counts" icon={ListOrdered} />}
      </div>
    </div>
  );
}
