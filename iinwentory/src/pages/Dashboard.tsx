import { useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import { useSettings } from '../store/useSettingsStore';
import { useCurrency } from '../store/useCurrencyStore';
import { useWorkflows } from '../store/useWorkflowStore';
import {
  FileText, DollarSign, Sparkles, ArrowUpRight,
  AlertTriangle, ArrowRight, TrendingUp, Boxes,
  ClipboardList, Trophy, CalendarDays,
  Euro, PoundSterling, JapaneseYen, IndianRupee, Banknote,
} from 'lucide-react';

// Map the selected currency symbol to a matching lucide icon for the
// Total Value card. Dollar-family currencies share the $ glyph; KRW has no
// dedicated icon so it falls back to a generic banknote.
const CURRENCY_ICON: Record<string, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  '$': DollarSign, 'C$': DollarSign, 'A$': DollarSign,
  '€': Euro, '£': PoundSterling, '¥': JapaneseYen, '₹': IndianRupee, '₩': Banknote,
};
import { useNavigate } from 'react-router-dom';
import HelpButton from '../components/HelpButton';
import ItemActionMenu from '../components/ItemActionMenu';

const TOP_SELLERS_PREVIEW_COUNT = 6;
type RangeKey = '7' | '14' | '30' | 'custom';

interface SummaryCardConfig {
  label: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  tint: string;
  ring: string;
  iconColor: string;
}

const summaryProfiles: SummaryCardConfig[] = [
  { label: 'Total items',  icon: Boxes,         tint: 'rgba(54, 81, 220, 0.10)',  ring: 'rgba(54, 81, 220, 0.20)',  iconColor: '#3651DC' },
  { label: 'Total value',  icon: DollarSign,    tint: 'rgba(16, 185, 129, 0.12)', ring: 'rgba(16, 185, 129, 0.24)', iconColor: '#059669' },
  { label: 'Low stock',    icon: AlertTriangle, tint: 'rgba(244, 63, 94, 0.10)',  ring: 'rgba(244, 63, 94, 0.22)',  iconColor: '#E11D48' },
  { label: 'Active picks', icon: ClipboardList, tint: 'rgba(245, 158, 11, 0.12)', ring: 'rgba(245, 158, 11, 0.26)', iconColor: '#B45309' },
];

export default function Dashboard() {
  const { getTotalStats, getLowStockItems, getItemById } = useStore();
  const { settings } = useSettings();
  const { format } = useCurrency();
  const totalValueIcon = CURRENCY_ICON[settings.currency] ?? DollarSign;
  const { pickLists } = useWorkflows();
  const stats = getTotalStats();
  const lowStock = getLowStockItems();
  const navigate = useNavigate();

  const [range, setRange] = useState<RangeKey>('7');
  const today = new Date().toISOString().slice(0, 10);
  const sevenAgo = new Date(Date.now() - 7 * 86400_000).toISOString().slice(0, 10);
  const [customFrom, setCustomFrom] = useState<string>(sevenAgo);
  const [customTo,   setCustomTo]   = useState<string>(today);
  const [expanded, setExpanded] = useState(false);

  // An "active pick" is a list that has been released and is being picked
  // (`ready`). Drafts are still being assembled and aren't active yet — counting
  // them made the web show picks the mobile app doesn't.
  const activePicks = useMemo(
    () => pickLists.filter(pl => pl.status === 'ready').length,
    [pickLists],
  );

  const summaryData = [
    { value: stats.items,             ...summaryProfiles[0], onClick: () => navigate('/items') },
    { value: format(stats.totalValue, 0),...summaryProfiles[1], icon: totalValueIcon, onClick: () => navigate('/reports') },
    { value: lowStock.length,         ...summaryProfiles[2], onClick: () => navigate('/notifications') },
    { value: activePicks,             ...summaryProfiles[3], onClick: () => navigate('/workflows') },
  ];

  const { fromMs, toMs, label: rangeLabel } = useMemo(() => {
    const endOfToday = new Date(); endOfToday.setHours(23, 59, 59, 999);
    if (range === 'custom') {
      const f = new Date(customFrom); f.setHours(0, 0, 0, 0);
      const t = new Date(customTo);   t.setHours(23, 59, 59, 999);
      return { fromMs: f.getTime(), toMs: t.getTime(), label: `${customFrom} → ${customTo}` };
    }
    const days = parseInt(range, 10);
    const f = new Date(); f.setHours(0, 0, 0, 0); f.setDate(f.getDate() - (days - 1));
    return { fromMs: f.getTime(), toMs: endOfToday.getTime(), label: `Last ${days} days` };
  }, [range, customFrom, customTo]);

  const topSellers = useMemo(() => {
    const acc = new Map<string, { qty: number; revenue: number; orders: Set<string> }>();
    for (const pl of pickLists) {
      for (const row of pl.items) {
        if (!row.pickedAt || row.pickedQty <= 0) continue;
        const ts = new Date(row.pickedAt).getTime();
        if (ts < fromMs || ts > toMs) continue;
        const item = getItemById(row.itemId);
        const price = row.unitPrice ?? item?.price ?? 0;
        const cur = acc.get(row.itemId) ?? { qty: 0, revenue: 0, orders: new Set<string>() };
        cur.qty += row.pickedQty;
        cur.revenue += row.pickedQty * price;
        cur.orders.add(pl.id);
        acc.set(row.itemId, cur);
      }
    }
    return [...acc.entries()]
      .map(([itemId, v]) => {
        const item = getItemById(itemId);
        return {
          itemId,
          name: item?.name ?? 'Deleted item',
          unit: item?.unit ?? 'units',
          qty: v.qty,
          revenue: v.revenue,
          orders: v.orders.size,
        };
      })
      .sort((a, b) => b.qty - a.qty);
  }, [pickLists, getItemById, fromMs, toMs]);

  const peakQty = topSellers[0]?.qty ?? 0;
  ;
  const visibleSellers = expanded ? topSellers : topSellers.slice(0, TOP_SELLERS_PREVIEW_COUNT);
  const hiddenCount = topSellers.length - TOP_SELLERS_PREVIEW_COUNT;

  return (
    <div style={{ padding: '36px 40px', flex: 1, overflowY: 'auto' }}>
      <style>{`
        @media (max-width: 768px) {
          .dash-root { padding: 22px 16px !important; }
        }
        .summary-card {
          position: relative;
          padding: 22px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          transition: all 0.32s var(--ease);
          overflow: hidden;
          cursor: default;
        }
        .summary-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 3px;
          background: var(--card-accent, transparent);
          opacity: 0;
          transition: opacity 0.3s var(--ease);
        }
        .summary-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--card-accent-strong, var(--border-strong));
        }
        .summary-card:hover::before { opacity: 1; }
        .summary-card-icon {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          transition: transform 0.3s var(--ease-spring);
        }
        .summary-card:hover .summary-card-icon { transform: scale(1.06) rotate(-3deg); }
        .summary-card-value {
          font-size: 30px;
          font-weight: 800;
          color: var(--text-dark);
          letter-spacing: -0.030em;
          line-height: 1.05;
          font-variant-numeric: tabular-nums;
        }
        .summary-card-label {
          margin-top: 6px;
          font-size: 12.5px;
          color: var(--text-muted);
          font-weight: 600;
          letter-spacing: -0.005em;
        }
        .restock-card {
          padding: 26px 28px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-sm);
        }
        .filter-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 6px 14px;
          background: var(--card-bg);
          border: 1px solid var(--border-strong);
          border-radius: 999px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-medium);
          letter-spacing: -0.005em;
          box-shadow: var(--shadow-xs);
        }
        .filter-pill-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: var(--success);
          box-shadow: 0 0 6px rgba(16, 185, 129, 0.6);
        }

        /* ===== Range control (Top sellers) ===== */
        .range-control {
          display: inline-flex;
          padding: 4px;
          background: var(--bg-subtle, rgba(15, 23, 42, 0.04));
          border: 1px solid var(--border-color);
          border-radius: 999px;
          gap: 2px;
        }
        [data-theme="dark"] .range-control { background: rgba(255,255,255,0.04); }
        .range-pill {
          display: inline-flex;
          align-items: center;
          gap: 5px;
          padding: 6px 14px;
          border: 0;
          background: transparent;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: -0.005em;
          color: var(--text-muted);
          border-radius: 999px;
          cursor: pointer;
          transition: color .18s var(--ease), background .18s var(--ease), box-shadow .18s var(--ease);
          font-variant-numeric: tabular-nums;
        }
        .range-pill:hover { color: var(--text-dark); }
        .range-pill.is-active {
          background: var(--card-bg);
          color: var(--text-dark);
          box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08), 0 4px 10px -6px rgba(15, 23, 42, 0.12);
        }
        [data-theme="dark"] .range-pill.is-active {
          background: rgba(255,255,255,0.08);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }

        /* ===== Custom date row ===== */
        .range-custom {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          padding: 12px 14px;
          margin-bottom: 14px;
          border: 1px dashed var(--border-color);
          border-radius: 12px;
          background: rgba(245, 158, 11, 0.04);
        }
        [data-theme="dark"] .range-custom { background: rgba(245, 158, 11, 0.06); }
        .range-custom label {
          display: flex; flex-direction: column; gap: 4px;
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .range-custom input[type="date"] {
          font-family: inherit;
          font-size: 13px;
          font-weight: 600;
          color: var(--text-dark);
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 8px;
          padding: 7px 10px;
          font-variant-numeric: tabular-nums;
          letter-spacing: -0.005em;
          transition: border-color .18s var(--ease), box-shadow .18s var(--ease);
        }
        .range-custom input[type="date"]:focus {
          outline: none;
          border-color: rgba(245, 158, 11, 0.55);
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
        }
        .range-custom-arrow {
          font-size: 14px;
          color: var(--text-faint);
          padding-bottom: 8px;
        }

        /* ===== Top seller row ===== */
        .top-row {
          position: relative;
          display: grid;
          grid-template-columns: 36px 1fr auto auto;
          align-items: center;
          gap: 14px;
          padding: 12px 12px 12px 18px;
          border-radius: var(--radius);
          border: 1px solid transparent;
          cursor: pointer;
          transition: background .2s var(--ease), border-color .2s var(--ease), transform .2s var(--ease);
        }
        .top-row:hover {
          background: var(--card-bg);
          border-color: var(--border-color);
          transform: translateX(2px);
        }
        .top-row-actions {
          display: inline-flex;
          opacity: 0.55;
          transition: opacity .18s var(--ease);
        }
        .top-row:hover .top-row-actions { opacity: 1; }
        .top-row-actions:has(.iam-trigger[aria-expanded="true"]) { opacity: 1; }
        .top-row:has(.iam-dropdown) { z-index: 30; }
        .top-row-rank {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 30px; height: 30px;
          border-radius: 9px;
          font-variant-numeric: tabular-nums;
          font-weight: 800;
          font-size: 11.5px;
          letter-spacing: 0.04em;
          color: var(--text-faint);
          background: rgba(15, 23, 42, 0.04);
          border: 1px solid transparent;
        }
        [data-theme="dark"] .top-row-rank { background: rgba(255,255,255,0.05); }
        .top-row--leader .top-row-rank {
          color: #B45309;
          background: rgba(245, 158, 11, 0.14);
          border-color: rgba(245, 158, 11, 0.30);
          box-shadow: 0 0 0 4px rgba(245, 158, 11, 0.06);
        }
        [data-theme="dark"] .top-row--leader .top-row-rank {
          color: #FCD34D;
          background: rgba(245, 158, 11, 0.22);
          border-color: rgba(245, 158, 11, 0.42);
        }
        .top-row-body { min-width: 0; display: flex; flex-direction: column; gap: 7px; }
        .top-row-head {
          display: flex; align-items: baseline; justify-content: space-between; gap: 12px;
          min-width: 0;
        }
        .top-row-name {
          font-weight: 600;
          font-size: 13.5px;
          letter-spacing: -0.005em;
          color: var(--text-dark);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          flex: 1;
          min-width: 0;
        }
        .top-row--leader .top-row-name { font-weight: 700; }
        .top-row-meta {
          font-size: 11.5px;
          color: var(--text-faint);
          font-weight: 500;
          letter-spacing: 0.005em;
          white-space: nowrap;
        }
        .top-row-meter {
          position: relative;
          height: 4px;
          width: 100%;
          background: rgba(15, 23, 42, 0.05);
          border-radius: 999px;
          overflow: hidden;
        }
        [data-theme="dark"] .top-row-meter { background: rgba(255,255,255,0.06); }
        .top-row-meter-fill {
          position: absolute; inset: 0 auto 0 0;
          background: linear-gradient(90deg, #F59E0B 0%, #D97706 100%);
          border-radius: inherit;
          transition: width .4s var(--ease-spring);
        }
        .top-row--leader .top-row-meter-fill {
          background: linear-gradient(90deg, #FBBF24 0%, #B45309 100%);
        }
        .top-row-stats {
          display: flex; flex-direction: column; align-items: flex-end; gap: 2px;
          flex-shrink: 0;
          min-width: 84px;
          text-align: right;
        }
        .top-row-qty {
          font-variant-numeric: tabular-nums;
          font-weight: 800;
          font-size: 15px;
          letter-spacing: -0.018em;
          color: var(--text-dark);
        }
        .top-row-unit {
          font-weight: 500;
          font-size: 11px;
          letter-spacing: 0.02em;
          color: var(--text-muted);
          text-transform: lowercase;
        }
        .top-row-revenue {
          font-variant-numeric: tabular-nums;
          font-size: 12px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: -0.005em;
        }
      `}</style>

      <div className="dash-root">
        {/* Page header */}
        <div className="page-header" style={{ marginBottom: '8px' }}>
          <div>
            <span className="page-eyebrow">
              <Sparkles size={12} strokeWidth={2.4} /> Overview
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>Dashboard</h1>
              <HelpButton topic="dashboard" size={16} />
            </div>
            <p style={{ marginTop: '6px', color: 'var(--text-muted)', fontSize: '14px', maxWidth: '560px' }}>
              At-a-glance inventory health, low‑stock signals, and quick access to your items.
            </p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/items')}>
            View items <ArrowUpRight size={15} strokeWidth={2.2} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '32px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--text-faint)' }}>
            Showing
          </span>
          <span className="filter-pill">
            <span className="filter-pill-dot" />
            All folders
          </span>
        </div>

        {/* Summary grid */}
        <section style={{ marginBottom: '36px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {summaryData.map((d, i) => (
              <div
                key={d.label}
                className="summary-card animate-fade-up"
                onClick={d.onClick}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter') d.onClick(); }}
                style={{
                  animationDelay: `${i * 60}ms`,
                  cursor: 'pointer',
                  ['--card-accent' as string]: d.iconColor,
                  ['--card-accent-strong' as string]: d.ring,
                } as React.CSSProperties}
              >
                <span
                  className="summary-card-icon"
                  style={{ background: d.tint, color: d.iconColor, boxShadow: `inset 0 0 0 1px ${d.ring}` }}
                >
                  <d.icon size={18} strokeWidth={2.1} />
                </span>
                <div className="summary-card-value">{d.value}</div>
                <div className="summary-card-label">{d.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Top sellers */}
        <section className="restock-card" style={{ minHeight: '280px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span
                style={{
                  width: '34px', height: '34px',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.12)',
                  color: '#B45309',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 0 0 1px rgba(245, 158, 11, 0.26)',
                }}
              >
                <TrendingUp size={17} strokeWidth={2.1} />
              </span>
              <div>
                <h2 style={{ fontSize: '17px', fontWeight: 700, color: 'var(--text-dark)', letterSpacing: '-0.018em', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Top sellers
                  {topSellers.length > 0 && (
                    <span className="chip chip-warning">{topSellers.length}</span>
                  )}
                </h2>
                <p style={{ marginTop: '2px', fontSize: '12.5px', color: 'var(--text-muted)' }}>
                  Most-picked items by quantity • {rangeLabel}
                </p>
              </div>
            </div>

            <div className="range-control" role="group" aria-label="Time range">
              {([
                { key: '7',      label: '7d' },
                { key: '14',     label: '14d' },
                { key: '30',     label: '1m' },
                { key: 'custom', label: 'Custom' },
              ] as { key: RangeKey; label: string }[]).map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  className={`range-pill ${range === opt.key ? 'is-active' : ''}`}
                  onClick={() => setRange(opt.key)}
                >
                  {opt.key === 'custom' && <CalendarDays size={12} strokeWidth={2.4} />}
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {range === 'custom' && (
            <div className="range-custom">
              <label>
                <span>From</span>
                <input
                  type="date"
                  value={customFrom}
                  max={customTo}
                  onChange={e => setCustomFrom(e.target.value)}
                />
              </label>
              <span className="range-custom-arrow">→</span>
              <label>
                <span>To</span>
                <input
                  type="date"
                  value={customTo}
                  min={customFrom}
                  max={today}
                  onChange={e => setCustomTo(e.target.value)}
                />
              </label>
            </div>
          )}

          {topSellers.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px' }}>
              <FileText size={42} />
              <p>No picks in this range</p>
              <p>Complete some pick-list items to populate top sellers.</p>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {visibleSellers.map((s, idx) => {
                  const ratio = peakQty > 0 ? s.qty / peakQty : 0;
                  return (
                    <div
                      key={s.itemId}
                      className={`top-row ${idx === 0 ? 'top-row--leader' : ''}`}
                      onClick={() => navigate(`/items/detail/${s.itemId}`)}
                    >
                      <span className="top-row-rank">
                        {idx === 0
                          ? <Trophy size={14} strokeWidth={2.4} />
                          : String(idx + 1).padStart(2, '0')}
                      </span>
                      <div className="top-row-body">
                        <div className="top-row-head">
                          <span className="top-row-name">{s.name}</span>
                          <span className="top-row-meta">
                            {s.orders} {s.orders === 1 ? 'order' : 'orders'}
                          </span>
                        </div>
                        <div className="top-row-meter" aria-hidden="true">
                          <div
                            className="top-row-meter-fill"
                            style={{ width: `${Math.max(3, ratio * 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="top-row-stats">
                        <span className="top-row-qty">
                          {s.qty.toLocaleString()}
                          <span className="top-row-unit"> {s.unit}</span>
                        </span>
                        <span className="top-row-revenue">{format(s.revenue)}</span>
                      </div>
                      <div className="top-row-actions" onClick={e => e.stopPropagation()}>
                        <ItemActionMenu itemId={s.itemId} align="right" size={15} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', gap: '12px', flexWrap: 'wrap' }}>
                {hiddenCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setExpanded(e => !e)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px',
                      fontSize: '12.5px', fontWeight: 600,
                      color: 'var(--primary)', background: 'transparent',
                      padding: '6px 0',
                    }}
                  >
                    {expanded ? 'Show fewer' : `Show ${hiddenCount} more`}
                  </button>
                ) : <span />}
                <button
                  type="button"
                  onClick={() => navigate('/reports')}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: '6px',
                    fontSize: '12.5px', fontWeight: 600,
                    color: 'var(--text-medium)', background: 'transparent',
                    padding: '6px 0',
                  }}
                >
                  View full report <ArrowRight size={14} />
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
