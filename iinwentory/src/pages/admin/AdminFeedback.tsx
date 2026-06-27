import { useEffect, useState, useCallback } from 'react';
import {
  Star, MessageSquare, Bug, Lightbulb, Heart, HelpCircle,
  Inbox, Check, Archive, RotateCcw, Loader2,
} from 'lucide-react';
import { apiGet, apiPatch } from '../../lib/api';
import { useDebounce } from '../../lib/useDebounce';

// Mirrors the four values allowed by the feedback.status CHECK constraint.
type FeedbackStatus = 'new' | 'reviewed' | 'resolved' | 'archived';
type StatusTab = FeedbackStatus | 'all';

interface FeedbackRow {
  id: string;
  name: string | null;
  email: string | null;
  category: string;
  rating: number | null;
  message: string;
  page: string | null;
  status: FeedbackStatus;
  teamId: string | null;
  teamName: string | null;
  createdAt: string;
}

interface FeedbackResponse {
  items: FeedbackRow[];
  nextCursor: string | null;
  counts: Record<string, number>;
}

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: 'new', label: 'New' },
  { value: 'reviewed', label: 'Reviewed' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'archived', label: 'Archived' },
  { value: 'all', label: 'All' },
];

const CATEGORIES = ['all', 'general', 'bug', 'feature', 'praise', 'other'] as const;

const categoryMeta: Record<string, { label: string; color: string; icon: typeof Bug }> = {
  general: { label: 'General', color: '#64748b', icon: MessageSquare },
  bug:     { label: 'Bug',     color: '#dc2626', icon: Bug },
  feature: { label: 'Feature', color: '#7c3aed', icon: Lightbulb },
  praise:  { label: 'Praise',  color: '#059669', icon: Heart },
  other:   { label: 'Other',   color: '#0891b2', icon: HelpCircle },
};

const statusColors: Record<FeedbackStatus, string> = {
  new: '#294EA7',
  reviewed: '#d97706',
  resolved: '#059669',
  archived: '#64748b',
};

function CategoryBadge({ category }: { category: string }) {
  const m = categoryMeta[category] ?? categoryMeta.general;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: m.color + '18', color: m.color,
      fontSize: '11px', fontWeight: 700, padding: '3px 9px', borderRadius: '20px',
      border: `1px solid ${m.color}33`,
    }}>
      <m.icon size={11} /> {m.label}
    </span>
  );
}

function Stars({ rating }: { rating: number | null }) {
  if (!rating) return null;
  return (
    <span style={{ display: 'inline-flex', gap: '1px' }} title={`${rating} / 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={13}
          fill={i < rating ? '#f59e0b' : 'none'}
          color={i < rating ? '#f59e0b' : '#cbd5e1'}
        />
      ))}
    </span>
  );
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export default function AdminFeedback() {
  const [items, setItems] = useState<FeedbackRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<StatusTab>('new');
  const [category, setCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const buildQuery = useCallback((cursor?: string) => {
    const params = new URLSearchParams({ status, category });
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }, [status, category, debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet<FeedbackResponse>(`/api/admin/feedback?${buildQuery()}`)
      .then(data => {
        if (cancelled) return;
        setItems(data.items);
        setCounts(data.counts);
        setNextCursor(data.nextCursor);
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load feedback'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildQuery]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await apiGet<FeedbackResponse>(`/api/admin/feedback?${buildQuery(nextCursor)}`);
      setItems(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const changeStatus = async (row: FeedbackRow, next: FeedbackStatus) => {
    if (row.status === next) return;
    setBusyId(row.id);
    const prevStatus = row.status;
    // Optimistic: update the row + counts immediately, roll back on failure.
    setItems(prev => prev.map(r => (r.id === row.id ? { ...r, status: next } : r)));
    setCounts(prev => ({
      ...prev,
      [prevStatus]: Math.max(0, (prev[prevStatus] ?? 0) - 1),
      [next]: (prev[next] ?? 0) + 1,
    }));
    try {
      await apiPatch(`/api/admin/feedback/${row.id}`, { status: next });
      // When viewing a single status tab, the row no longer belongs here.
      if (status !== 'all' && status !== next) {
        setItems(prev => prev.filter(r => r.id !== row.id));
      }
    } catch (e) {
      setItems(prev => prev.map(r => (r.id === row.id ? { ...r, status: prevStatus } : r)));
      setCounts(prev => ({
        ...prev,
        [next]: Math.max(0, (prev[next] ?? 0) - 1),
        [prevStatus]: (prev[prevStatus] ?? 0) + 1,
      }));
      alert(e instanceof Error ? e.message : 'Status update failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      {/* Status tabs */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
        {STATUS_TABS.map(tab => {
          const active = status === tab.value;
          const count = counts[tab.value] ?? 0;
          return (
            <button
              key={tab.value}
              onClick={() => setStatus(tab.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '7px 14px', borderRadius: '999px',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                background: active ? 'var(--primary)' : 'var(--surface-raised)',
                color: active ? '#fff' : 'var(--text-muted)',
                transition: 'background 0.15s, color 0.15s, border-color 0.15s',
              }}
            >
              {tab.label}
              <span style={{
                fontSize: '11px', fontWeight: 700, padding: '1px 7px', borderRadius: '999px',
                background: active ? 'rgba(255,255,255,0.22)' : 'var(--border-color)',
                color: active ? '#fff' : 'var(--text-muted)',
              }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Category + search filters */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <select
          className="input"
          value={category}
          onChange={e => setCategory(e.target.value)}
          style={{ maxWidth: '180px' }}
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>
              {c === 'all' ? 'All categories' : (categoryMeta[c]?.label ?? c)}
            </option>
          ))}
        </select>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search message, name or email…"
          style={{ flex: 1, minWidth: '220px' }}
        />
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px',
          padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={15} className="spin" /> Loading…
        </p>
      ) : items.length === 0 ? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
          padding: '60px 20px', color: 'var(--text-muted)',
        }}>
          <Inbox size={40} strokeWidth={1.4} />
          <p style={{ fontSize: '14px' }}>No feedback here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map(row => {
            const display = row.name || row.email || 'Anonymous';
            const isBusy = busyId === row.id;
            return (
              <div key={row.id} className="card" style={{ padding: '18px 20px', cursor: 'default' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%', flexShrink: 0,
                    background: statusColors[row.status], color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '13px', fontWeight: 700,
                  }}>
                    {initials(display)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, fontSize: '14.5px' }}>{display}</span>
                      <CategoryBadge category={row.category} />
                      <Stars rating={row.rating} />
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '8px' }}>
                      {row.email && <span>{row.email}</span>}
                      {row.teamName && <><span style={{ margin: '0 7px' }}>·</span>{row.teamName}</>}
                      {row.page && <><span style={{ margin: '0 7px' }}>·</span><code>{row.page}</code></>}
                      <span style={{ margin: '0 7px' }}>·</span>
                      {new Date(row.createdAt).toLocaleString()}
                    </div>
                    <p style={{ fontSize: '14px', lineHeight: 1.55, whiteSpace: 'pre-wrap', margin: 0 }}>
                      {row.message}
                    </p>
                  </div>
                </div>

                {/* Status actions */}
                <div style={{
                  display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '14px',
                  paddingTop: '14px', borderTop: '1px solid var(--border-color)',
                }}>
                  <StatusButton icon={Check} label="Reviewed" active={row.status === 'reviewed'}
                    disabled={isBusy} color={statusColors.reviewed}
                    onClick={() => changeStatus(row, 'reviewed')} />
                  <StatusButton icon={Check} label="Resolved" active={row.status === 'resolved'}
                    disabled={isBusy} color={statusColors.resolved}
                    onClick={() => changeStatus(row, 'resolved')} />
                  <StatusButton icon={Archive} label="Archive" active={row.status === 'archived'}
                    disabled={isBusy} color={statusColors.archived}
                    onClick={() => changeStatus(row, 'archived')} />
                  {row.status !== 'new' && (
                    <StatusButton icon={RotateCcw} label="Reopen" active={false}
                      disabled={isBusy} color={statusColors.new}
                      onClick={() => changeStatus(row, 'new')} />
                  )}
                </div>
              </div>
            );
          })}

          {nextCursor && (
            <button
              className="btn-outline"
              onClick={loadMore}
              disabled={loadingMore}
              style={{ alignSelf: 'center', marginTop: '6px' }}
            >
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </>
  );
}

function StatusButton({
  icon: Icon, label, active, disabled, color, onClick,
}: {
  icon: typeof Check; label: string; active: boolean;
  disabled: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || active}
      title={active ? `Already ${label.toLowerCase()}` : label}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '6px',
        padding: '6px 13px', borderRadius: '8px',
        fontSize: '12.5px', fontWeight: 600,
        cursor: disabled || active ? 'default' : 'pointer',
        border: `1px solid ${active ? color : 'var(--border-color)'}`,
        background: active ? color + '14' : 'transparent',
        color: active ? color : 'var(--text-muted)',
        opacity: disabled && !active ? 0.5 : 1,
        transition: 'background 0.15s, border-color 0.15s, color 0.15s',
      }}
    >
      <Icon size={13} /> {label}
    </button>
  );
}
