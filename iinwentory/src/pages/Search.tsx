import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useCurrency } from '../store/useCurrencyStore';
import {
  Search as SearchIcon, Folder, SlidersHorizontal, Package,
  QrCode, Filter, ChevronDown, ChevronUp, BarChart3, X, Sparkles, ArrowRight,
  PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import HelpButton from '../components/HelpButton';
import { itemInventoryValue } from '../lib/itemValue';
import { matchItem, tagNameMap } from '../lib/itemSearch';

export default function Search() {
  const store = useStore();
  const { format } = useCurrency();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [selectedFolders, setSelectedFolders] = useState<string[]>([]);
  const [minQty, setMinQty] = useState('');
  const [maxQty, setMaxQty] = useState('');
  const [minLevelFilter, setMinLevelFilter] = useState<'all' | 'below' | 'above'>('all');
  const [showFolders, setShowFolders] = useState(true);
  const [showName, setShowName] = useState(true);
  const [showQty, setShowQty] = useState(true);
  const [showMinLevel, setShowMinLevel] = useState(true);
  const [hasSearched, setHasSearched] = useState(false);
  const [railOpen, setRailOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('iinw_search_rail') !== '0';
  });
  const toggleRail = () => {
    const next = !railOpen;
    setRailOpen(next);
    try { localStorage.setItem('iinw_search_rail', next ? '1' : '0'); } catch { /* ignore */ }
  };

  const results = useMemo(() => {
    if (!hasSearched) return [];
    let filtered = [...store.items];

    if (query.trim()) {
      const ctx = { tagsById: tagNameMap(store.tags) };
      filtered = filtered.filter(i => matchItem(i, query, ctx));
    }

    if (selectedFolders.length > 0) {
      filtered = filtered.filter(i => i.parentId && selectedFolders.includes(i.parentId));
    }

    if (minQty) filtered = filtered.filter(i => i.quantity >= parseInt(minQty));
    if (maxQty) filtered = filtered.filter(i => i.quantity <= parseInt(maxQty));

    if (minLevelFilter === 'below') filtered = filtered.filter(i => i.minLevel !== null && i.quantity <= i.minLevel);
    if (minLevelFilter === 'above') filtered = filtered.filter(i => i.minLevel !== null && i.quantity > i.minLevel);

    return filtered;
  }, [query, selectedFolders, minQty, maxQty, minLevelFilter, hasSearched, store.items, store.tags]);

  const toggleFolder = (id: string) => {
    setSelectedFolders(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleApply = () => setHasSearched(true);
  const handleClear = () => {
    setQuery('');
    setSelectedFolders([]);
    setMinQty('');
    setMaxQty('');
    setMinLevelFilter('all');
    setHasSearched(false);
  };

  const activeFilterCount =
    (query.trim() ? 1 : 0) +
    selectedFolders.length +
    (minQty || maxQty ? 1 : 0) +
    (minLevelFilter !== 'all' ? 1 : 0);

  // Clicking a preset card opens the filter rail, primes the relevant
  // filter, and runs the search so results show immediately. Without this
  // the cards looked clickable (pointer cursor, hover lift, arrow) but did
  // nothing — the "search doesn't do anything when I click" bug.
  const applyPreset = (key: string) => {
    setRailOpen(true);
    try { localStorage.setItem('iinw_search_rail', '1'); } catch { /* ignore */ }
    switch (key) {
      case 'folders':
        setShowFolders(true);
        break;
      case 'quantity':
        setShowQty(true);
        break;
      case 'minlevel':
        setShowMinLevel(true);
        setMinLevelFilter('below');
        break;
      case 'barcode':
        setShowName(true);
        break;
      case 'custom':
        setShowName(true);
        break;
      default:
        break;
    }
    setHasSearched(true);
  };

  const presetCards = [
    { key: 'folders',   icon: Folder,            label: 'Filter by folders',     desc: 'Narrow down to one or more folders.',          tint: 'rgba(245, 158, 11, 0.12)', ring: 'rgba(245, 158, 11, 0.24)', color: '#B45309' },
    { key: 'quantity',  icon: SlidersHorizontal, label: 'Filter by quantity',    desc: 'Find items in a specific quantity range.',     tint: 'rgba(41, 78, 167, 0.10)',  ring: 'rgba(41, 78, 167, 0.22)',  color: '#294EA7' },
    { key: 'minlevel',  icon: BarChart3,         label: 'Filter by min level',   desc: 'Surface anything below or above min level.',   tint: 'rgba(124, 58, 237, 0.10)', ring: 'rgba(124, 58, 237, 0.22)', color: '#7C3AED' },
    { key: 'barcode',   icon: QrCode,            label: 'Barcode / QR',          desc: 'Match by SKU, barcode or QR code.',            tint: 'rgba(14, 165, 233, 0.10)', ring: 'rgba(14, 165, 233, 0.22)', color: '#0369A1' },
    { key: 'custom',    icon: Filter,            label: 'Custom fields',         desc: 'Filter on any custom field in your inventory.', tint: 'rgba(16, 185, 129, 0.10)', ring: 'rgba(16, 185, 129, 0.24)', color: '#047857' },
    { key: 'summaries', icon: Package,           label: 'Summaries',             desc: 'Group items by ID for at-a-glance totals.',    tint: 'rgba(244, 63, 94, 0.10)',  ring: 'rgba(244, 63, 94, 0.22)',  color: '#BE123C' },
  ];

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <style>{`
        .filter-section {
          padding: 0 20px;
          margin-bottom: 14px;
        }
        .filter-section + .filter-section { padding-top: 14px; border-top: 1px solid var(--border-color); }
        .filter-section-toggle {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          font-weight: 700;
          font-size: 11.5px;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-faint);
          margin-bottom: 12px;
          padding: 0;
          background: transparent;
          transition: color 0.16s var(--ease);
        }
        .filter-section-toggle:hover { color: var(--text-medium); }
        .filter-checkrow {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 7px 8px;
          border-radius: 8px;
          font-size: 13px;
          color: var(--text-medium);
          cursor: pointer;
          transition: all 0.14s var(--ease);
        }
        .filter-checkrow:hover { background: var(--hover-bg); color: var(--text-dark); }
        .filter-checkrow input { accent-color: var(--primary); width: 14px; height: 14px; cursor: pointer; }

        .preset-card {
          position: relative;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: var(--radius-lg);
          padding: 22px;
          cursor: pointer;
          transition: all 0.32s var(--ease);
          text-align: left;
          overflow: hidden;
        }
        .preset-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0;
          width: 60px; height: 60px;
          background: radial-gradient(circle, var(--preset-tint) 0%, transparent 70%);
          opacity: 0;
          transition: opacity 0.4s var(--ease);
        }
        .preset-card:hover {
          transform: translateY(-3px);
          box-shadow: var(--shadow-md);
          border-color: var(--preset-ring);
        }
        .preset-card:hover::before { opacity: 1; }
        .preset-card-arrow {
          position: absolute;
          top: 22px; right: 22px;
          width: 28px; height: 28px;
          border-radius: 9px;
          background: transparent;
          color: var(--text-faint);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          transition: all 0.24s var(--ease);
        }
        .preset-card:hover .preset-card-arrow {
          background: var(--preset-tint);
          color: var(--preset-color);
          transform: translate(2px, -2px);
        }
        .preset-card-icon {
          width: 40px;
          height: 40px;
          border-radius: 11px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 18px;
          background: var(--preset-tint);
          color: var(--preset-color);
          box-shadow: inset 0 0 0 1px var(--preset-ring);
          position: relative;
          z-index: 1;
        }
        .preset-card-title {
          font-size: 14.5px;
          font-weight: 700;
          color: var(--text-dark);
          letter-spacing: -0.012em;
          margin-bottom: 5px;
          position: relative;
          z-index: 1;
        }
        .preset-card-desc {
          font-size: 12.5px;
          color: var(--text-muted);
          line-height: 1.45;
          position: relative;
          z-index: 1;
        }
      `}</style>

      {/* Filters Sidebar */}
      <aside className={`search-side folder-rail ${railOpen ? '' : 'collapsed'}`} style={{
        width: railOpen ? '288px' : '0',
        minWidth: railOpen ? '288px' : '0',
        borderRight: railOpen ? '1px solid var(--border-color)' : 'none',
        background: 'linear-gradient(180deg, var(--card-bg) 0%, color-mix(in srgb, var(--card-bg) 92%, var(--bg-color)) 100%)',
        overflowY: 'auto',
        overflowX: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ padding: '24px 20px 20px' }}>
          <span className="page-eyebrow" style={{ marginBottom: 4 }}>
            <Sparkles size={11} strokeWidth={2.4} /> Refine
          </span>
          <h2 style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.022em' }}>Filters</h2>
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={handleClear}
              style={{
                marginTop: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                background: 'var(--surface-tint)',
                color: 'var(--text-medium)',
                fontSize: '11.5px',
                fontWeight: 600,
                borderRadius: '999px',
                cursor: 'pointer',
              }}
            >
              <X size={11} strokeWidth={2.5} />
              {activeFilterCount} filter{activeFilterCount === 1 ? '' : 's'} · clear
            </button>
          )}
        </div>

        {/* Folders filter */}
        <div className="filter-section">
          <button onClick={() => setShowFolders(!showFolders)} className="filter-section-toggle">
            <span>Folders {selectedFolders.length > 0 && <span style={{ color: 'var(--primary)' }}>· {selectedFolders.length}</span>}</span>
            {showFolders ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showFolders && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {store.folders.map(f => (
                <label key={f.id} className="filter-checkrow">
                  <input type="checkbox" checked={selectedFolders.includes(f.id)} onChange={() => toggleFolder(f.id)} />
                  <Folder size={14} strokeWidth={1.9} color={f.color} fill={f.color + '22'} />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
                </label>
              ))}
              {store.folders.length === 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-faint)', padding: '4px 8px' }}>No folders yet</span>
              )}
            </div>
          )}
        </div>

        {/* Name/SKU/Location filter */}
        <div className="filter-section">
          <button onClick={() => setShowName(!showName)} className="filter-section-toggle">
            Search text {showName ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showName && (
            <div style={{ position: 'relative' }}>
              <SearchIcon size={14} strokeWidth={2.1} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="input"
                placeholder="Name, SKU, location, ID…"
                value={query}
                onChange={e => setQuery(e.target.value)}
                style={{ fontSize: '12.5px', paddingLeft: 34 }}
              />
            </div>
          )}
        </div>

        {/* Quantity filter */}
        <div className="filter-section">
          <button onClick={() => setShowQty(!showQty)} className="filter-section-toggle">
            Quantity {showQty ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showQty && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input className="input" type="number" placeholder="Min" value={minQty} onChange={e => setMinQty(e.target.value)} style={{ fontSize: '12.5px' }} />
              <span style={{ color: 'var(--text-faint)', fontWeight: 600 }}>–</span>
              <input className="input" type="number" placeholder="Max" value={maxQty} onChange={e => setMaxQty(e.target.value)} style={{ fontSize: '12.5px' }} />
            </div>
          )}
        </div>

        {/* Min Level filter */}
        <div className="filter-section">
          <button onClick={() => setShowMinLevel(!showMinLevel)} className="filter-section-toggle">
            Min level {showMinLevel ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showMinLevel && (
            <select
              className="input"
              value={minLevelFilter}
              onChange={e => setMinLevelFilter(e.target.value as 'all' | 'below' | 'above')}
              style={{ fontSize: '12.5px' }}
            >
              <option value="all">All items</option>
              <option value="below">At or below min level</option>
              <option value="above">Above min level</option>
            </select>
          )}
        </div>

        <div style={{ padding: '16px 20px 24px', marginTop: 'auto' }}>
          <button
            className="btn-primary"
            style={{ width: '100%' }}
            onClick={handleApply}
          >
            <SearchIcon size={14} strokeWidth={2.2} /> Apply filters
          </button>
        </div>
      </aside>

      {/* Rail toggle */}
      <div className="rail-toggle">
        <button
          type="button"
          className={`rail-toggle-btn ${railOpen ? '' : 'collapsed'}`}
          onClick={toggleRail}
          title={railOpen ? 'Collapse filters' : 'Expand filters'}
          aria-label={railOpen ? 'Collapse filters' : 'Expand filters'}
        >
          {railOpen ? <PanelLeftClose size={15} strokeWidth={2.0} /> : <PanelLeftOpen size={15} strokeWidth={2.0} />}
        </button>
      </div>

      {/* Results */}
      <main style={{ flex: 1, padding: '32px 36px', overflowY: 'auto', minWidth: 0 }}>
        <div className="page-hero">
          <div className="page-hero-text">
            <span className="page-eyebrow">
              <SearchIcon size={12} strokeWidth={2.4} /> Search
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>Advanced search</h1>
              <HelpButton topic="search" size={16} />
            </div>
            <p className="page-hero-sub">
              Build queries across folders, quantity, and min-level — and save them as reusable lists.
            </p>
          </div>
        </div>

        {!hasSearched ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
            {presetCards.map(c => (
              <div
                key={c.label}
                role="button"
                tabIndex={0}
                onClick={() => applyPreset(c.key)}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    applyPreset(c.key);
                  }
                }}
                className="preset-card animate-fade-up"
                style={{
                  ['--preset-tint' as string]: c.tint,
                  ['--preset-ring' as string]: c.ring,
                  ['--preset-color' as string]: c.color,
                } as React.CSSProperties}
              >
                <span className="preset-card-arrow">
                  <ArrowRight size={14} strokeWidth={2.2} />
                </span>
                <span className="preset-card-icon">
                  <c.icon size={20} strokeWidth={2.0} />
                </span>
                <div className="preset-card-title">{c.label}</div>
                <p className="preset-card-desc">{c.desc}</p>
              </div>
            ))}
          </div>
        ) : (
          <>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 18,
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                <span style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-dark)', letterSpacing: '-0.022em', fontVariantNumeric: 'tabular-nums' }}>
                  {results.length}
                </span>
                <span style={{ fontSize: '13.5px', color: 'var(--text-muted)' }}>
                  result{results.length !== 1 ? 's' : ''}
                </span>
              </div>
              <button
                type="button"
                onClick={handleClear}
                className="btn-ghost"
                style={{ fontSize: '12.5px' }}
              >
                <X size={13} strokeWidth={2.4} /> Clear all
              </button>
            </div>

            {results.length === 0 ? (
              <div className="empty-premium animate-fade-up">
                <div className="empty-premium-ring">
                  <SearchIcon size={28} strokeWidth={1.9} />
                </div>
                <div className="empty-premium-title">No items match your filters</div>
                <div className="empty-premium-body">
                  Try removing a filter or broadening your search to see more results.
                </div>
                <button className="btn-outline" onClick={handleClear}>
                  <X size={14} strokeWidth={2.2} /> Reset filters
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {results.map(item => {
                  const stockState =
                    item.quantity === 0 ? 'out'
                    : (item.minLevel !== null && item.quantity <= item.minLevel) ? 'low'
                    : 'in';
                  const chipClass = stockState === 'out' ? 'chip-danger' : stockState === 'low' ? 'chip-warning' : 'chip-success';
                  const stockLabel = stockState === 'out' ? 'Out' : stockState === 'low' ? 'Low' : 'In';
                  return (
                    <div
                      key={item.id}
                      className="premium-item-row animate-fade"
                      onClick={() => navigate(`/items/detail/${item.id}`)}
                    >
                      <div className="premium-item-row-thumb">
                        {item.photos.length > 0 ? (
                          <img src={item.photos[0]} alt={item.name} />
                        ) : (
                          <Package size={20} strokeWidth={1.7} />
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-dark)', letterSpacing: '-0.010em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-faint)', display: 'flex', gap: '10px', marginTop: 2, flexWrap: 'wrap' }}>
                          {item.sku && <span style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.02em' }}>{item.sku}</span>}
                          {item.location && <span>· {item.location}</span>}
                        </div>
                      </div>
                      <span className={`chip ${chipClass}`}>{stockLabel}</span>
                      <span style={{ fontSize: '13px', color: 'var(--text-dark)', fontWeight: 700, fontVariantNumeric: 'tabular-nums', width: '72px', textAlign: 'right' }}>
                        {item.quantity}{' '}
                        <span style={{ fontSize: '11px', color: 'var(--text-faint)', fontWeight: 500 }}>{item.unit}</span>
                      </span>
                      <span style={{ fontSize: '12.5px', color: 'var(--text-medium)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', width: '88px', textAlign: 'right' }}>
                        {format(item.price * item.quantity)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
