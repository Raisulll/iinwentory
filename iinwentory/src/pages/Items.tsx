import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuthStore';
import { useSettings } from '../store/useSettingsStore';
import { useCurrency } from '../store/useCurrencyStore';
import { useDebounce } from '../lib/useDebounce';
import HelpButton from '../components/HelpButton';
import ItemActionMenu from '../components/ItemActionMenu';
import ItemQtyControl from '../components/items/ItemQtyControl';
import AddItemModal from '../components/items/AddItemModal';
import AdjustStockModal from '../components/item-detail/AdjustStockModal';
import AddFolderModal from '../components/items/AddFolderModal';
import EditFolderModal from '../components/items/EditFolderModal';
import MoveModal from '../components/items/MoveModal';
import { itemInventoryValue } from '../lib/itemValue';
import {
  Search as SearchIcon, Folder, FolderOpen,
  LayoutGrid, List, Plus, Package, ChevronRight, Trash2,
  MoreVertical, FolderInput, Edit2, Lock,
  SlidersHorizontal, ArrowUp, ArrowDown,
  Box, PanelLeftClose, PanelLeftOpen,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function Items() {
  const { folderId } = useParams<{ folderId: string }>();
  const currentFolderId = folderId || null;
  const navigate = useNavigate();
  const store = useStore();
  const { settings } = useSettings();
  const { format } = useCurrency();

  const [searchQuery, setSearchQuery] = useState('');
  // Debounce search input — without this, every keystroke re-runs the
  // filter+sort useMemo and re-renders 200+ item cards. 200ms feels instant.
  const debouncedQuery = useDebounce(searchQuery, 200);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [folderSearch, setFolderSearch] = useState('');
  const debouncedFolderSearch = useDebounce(folderSearch, 200);
  const [railOpen, setRailOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('iinw_items_rail') !== '0';
  });
  const toggleRail = () => {
    const next = !railOpen;
    setRailOpen(next);
    try { localStorage.setItem('iinw_items_rail', next ? '1' : '0'); } catch { /* ignore */ }
  };

  // Modal toggles. The modals themselves manage their own form state +
  // upload handlers — see components/items/*Modal.tsx.
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [showAddItem, setShowAddItem] = useState(false);
  const [editFolderId, setEditFolderId] = useState<string | null>(null);

  // Sort + filter state
  const [sortBy, setSortBy] = useState<'name' | 'qty' | 'price' | 'updated' | 'created'>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low' | 'out'>('all');
  const [showFilters, setShowFilters] = useState(false);

  // Action Modals
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; isFolder: boolean; name: string } | null>(null);

  const [actionItemRef, setActionItemRef] = useState<{ id: string; type: 'item' | 'folder' } | null>(null);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Quantity is no longer edited inline — hovering an item reveals an "Adjust"
  // button that opens the Adjust Stock popup for that item.
  const [adjustItemId, setAdjustItemId] = useState<string | null>(null);
  const adjustItem = adjustItemId ? store.getItemById(adjustItemId) : null;

  const { plan } = useAuth();
  const atItemLimit = plan.maxItems !== Infinity && store.items.length >= plan.maxItems;

  const subFolders = store.getSubFolders(currentFolderId);
  const itemsInFolder = store.getItemsInFolder(currentFolderId);
  const breadcrumbs = store.getFolderPath(currentFolderId);
  const rootFolders = store.getSubFolders(null);

  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    const matchesQuery = (i: { name: string; sku: string | null; location: string | null; notes: string; id: string }) => {
      if (!q) return true;
      return i.name.toLowerCase().includes(q)
        || (i.sku ?? '').toLowerCase().includes(q)
        || (i.location ?? '').toLowerCase().includes(q)
        || i.notes.toLowerCase().includes(q)
        || i.id.toLowerCase().includes(q);
    };
    const minP = minPrice ? parseFloat(minPrice) : null;
    const maxP = maxPrice ? parseFloat(maxPrice) : null;
    let fItems = itemsInFolder.filter(i => {
      if (!matchesQuery(i)) return false;
      if (minP !== null && i.price < minP) return false;
      if (maxP !== null && i.price > maxP) return false;
      if (stockFilter === 'out' && i.quantity !== 0) return false;
      if (stockFilter === 'in_stock' && i.quantity <= 0) return false;
      if (stockFilter === 'low' && !(i.minLevel !== null && i.quantity <= i.minLevel)) return false;
      return true;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    fItems = [...fItems].sort((a, b) => {
      switch (sortBy) {
        case 'qty': return (a.quantity - b.quantity) * dir;
        case 'price': return (a.price - b.price) * dir;
        case 'updated': return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
        case 'created': return (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) * dir;
        case 'name':
        default: return a.name.localeCompare(b.name) * dir;
      }
    });
    const fFolders = (q ? subFolders.filter(f => f.name.toLowerCase().includes(q) || f.description.toLowerCase().includes(q)) : subFolders)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
    return { items: fItems, folders: fFolders };
  }, [debouncedQuery, subFolders, itemsInFolder, sortBy, sortDir, minPrice, maxPrice, stockFilter]);

  // Scanner → "Add new" deep link: ?addWithSku=XYZ opens the Add Item modal
  // with the SKU pre-filled, then strips the param so reload doesn't re-trigger.
  const [searchParams, setSearchParams] = useSearchParams();
  const [pendingSku, setPendingSku] = useState<string | null>(null);
  useEffect(() => {
    const sku = searchParams.get('addWithSku');
    if (!sku) return;
    setPendingSku(sku);
    setShowAddItem(true);
    const next = new URLSearchParams(searchParams);
    next.delete('addWithSku');
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  const closeAddItem = () => {
    setShowAddItem(false);
    setPendingSku(null);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.isFolder) store.deleteFolder(deleteTarget.id);
    else store.deleteItem(deleteTarget.id);
    setDeleteTarget(null);
  };

  const toggleSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setSelectedIds(newSet);
  };

  const openMoveAction = (id: string, type: 'item' | 'folder') => {
    setActionItemRef({ id, type });
    setShowMoveModal(true);
  };

  // Memoize sidebar folder list + per-folder item counts so we don't
  // call store.getItemsInFolder() inside the render loop on every keystroke.
  const filteredSidebarFolders = useMemo(() => {
    if (!debouncedFolderSearch) return rootFolders;
    const q = debouncedFolderSearch.toLowerCase();
    return rootFolders.filter(f => f.name.toLowerCase().includes(q));
  }, [debouncedFolderSearch, rootFolders]);

  // Pre-compute every folder's item count + total value ONCE per render
  // pass instead of inside every card. Cuts O(folders²) work in the loop.
  const folderStats = useMemo(() => {
    const out = new Map<string, { itemCount: number; subCount: number; totalValue: number }>();
    for (const f of subFolders) {
      const itemsIn = store.getItemsInFolder(f.id);
      out.set(f.id, {
        itemCount: itemsIn.length,
        subCount: store.getSubFolders(f.id).length,
        totalValue: itemsIn.reduce((s, i) => s + itemInventoryValue(i), 0),
      });
    }
    return out;
  }, [subFolders, store]);

  // Roll up quantity + value for the whole current-folder subtree (direct items
  // plus everything nested in descendant folders). getItemsInFolder only returns
  // direct children, so without this the stats strip read 0 whenever items live
  // inside subfolders rather than at the current level.
  const subtreeTotals = useMemo(() => {
    let itemCount = 0;
    let totalQty = 0;
    let totalValue = 0;
    const visit = (folderId: string | null) => {
      for (const i of store.getItemsInFolder(folderId)) {
        itemCount += 1;
        totalQty += i.quantity;
        totalValue += itemInventoryValue(i);
      }
      for (const sf of store.getSubFolders(folderId)) visit(sf.id);
    };
    visit(currentFolderId);
    return { itemCount, totalQty, totalValue };
  }, [currentFolderId, store]);

  // Pre-compute sidebar root-folder item counts the same way.
  const sidebarFolderCounts = useMemo(() => {
    const out = new Map<string, number>();
    for (const f of filteredSidebarFolders) {
      out.set(f.id, store.getItemsInFolder(f.id).length);
    }
    return out;
  }, [filteredSidebarFolders, store]);

  return (
    <div className="items-page">
      {/* Folder rail (premium) */}
      <aside className={`folder-rail ${railOpen ? '' : 'collapsed'}`}>
        <div className="folder-rail-search">
          <SearchIcon size={15} />
          <input
            placeholder="Search folders"
            value={folderSearch}
            onChange={e => setFolderSearch(e.target.value)}
          />
        </div>
        <div className="folder-rail-list">
          <div className="folder-rail-eyebrow">Library</div>
          <div className={`folder-rail-item ${!currentFolderId ? 'active' : ''}`} onClick={() => navigate('/items')}>
            <FolderOpen size={15} strokeWidth={1.9} /> All Items
            <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
              {store.items.length}
            </span>
          </div>
          {filteredSidebarFolders.length > 0 && (
            <div className="folder-rail-eyebrow" style={{ marginTop: 8 }}>Folders</div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {filteredSidebarFolders.map(f => {
              const active = currentFolderId === f.id;
              const count = sidebarFolderCounts.get(f.id) ?? 0;
              return (
                <div
                  key={f.id}
                  className={`folder-rail-item ${active ? 'active' : ''}`}
                  onClick={() => navigate(`/items/folder/${f.id}`)}
                >
                  <Folder
                    size={15}
                    strokeWidth={1.9}
                    color={active ? 'var(--primary)' : f.color}
                    fill={active ? 'var(--primary-light)' : f.color + '22'}
                  />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {f.name}
                  </span>
                  <span style={{ fontSize: '11px', color: active ? 'var(--primary)' : 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </aside>

      {/* Rail toggle */}
      <div className="rail-toggle">
        <button
          type="button"
          className={`rail-toggle-btn ${railOpen ? '' : 'collapsed'}`}
          onClick={toggleRail}
          title={railOpen ? 'Collapse folder list' : 'Expand folder list'}
          aria-label={railOpen ? 'Collapse folder list' : 'Expand folder list'}
        >
          {railOpen ? <PanelLeftClose size={15} strokeWidth={2.0} /> : <PanelLeftOpen size={15} strokeWidth={2.0} />}
        </button>
      </div>

      {/* Main Content
          NOTE: top padding lives on the breadcrumb (first child), NOT main.
          Reason: <main> is the scroll container and .items-sticky uses
          position:sticky / top:0. If main had padding-top, the sticky bar
          would pin 28px BELOW main's visible top, leaving a gap where
          scrolling items bleed through above the toolbar. */}
      <main
        style={{ flex: 1, padding: '0 36px 32px', overflowY: 'auto', minWidth: 0 }}
      >
        {/* Breadcrumb */}
        <nav className="breadcrumb" aria-label="Breadcrumb" style={{ marginTop: 28 }}>
          <span
            className={`breadcrumb-link ${!currentFolderId ? 'current' : ''}`}
            onClick={() => navigate('/items')}
          >
            <FolderOpen size={13} strokeWidth={1.9} /> All Items
          </span>
          {breadcrumbs.map(bc => (
            <span key={bc.id} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ChevronRight size={13} color="var(--text-faint)" />
              <span
                className={`breadcrumb-link ${bc.id === currentFolderId ? 'current' : ''}`}
                onClick={() => navigate(`/items/folder/${bc.id}`)}
              >
                {bc.name}
              </span>
            </span>
          ))}
        </nav>

        {/* Page hero */}
        <div className="page-hero">
          <div className="page-hero-text">
            <span className="page-eyebrow">
              <FolderOpen size={12} strokeWidth={2.4} /> {currentFolderId ? 'Folder' : 'Inventory'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1>{currentFolderId ? (store.getFolderById(currentFolderId)?.name || 'Folder') : 'All Items'}</h1>
              <HelpButton topic={currentFolderId ? 'folders' : 'items'} size={16} />
            </div>
            <p className="page-hero-sub">
              {currentFolderId
                ? 'Browse and organize the items inside this folder.'
                : 'Every item across every folder. Search, filter, and organize.'}
            </p>
          </div>
          <div className="page-hero-actions">
            <button
              className="btn-outline"
              onClick={() => setShowAddFolder(true)}
            >
              <Plus size={15} strokeWidth={2.2} /> New folder
            </button>
            <button
              className="btn-primary"
              onClick={() => { if (!atItemLimit) setShowAddItem(true); }}
              title={atItemLimit ? `Item limit reached (${plan.maxItems} on ${plan.name} plan)` : undefined}
              style={atItemLimit ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
            >
              {atItemLimit ? <Lock size={15} strokeWidth={2.2} /> : <Plus size={15} strokeWidth={2.2} />}
              {atItemLimit ? 'Limit reached' : 'Add item'}
            </button>
          </div>
        </div>

        {/* Plan limit banner */}
        {plan.maxItems !== Infinity && store.items.length >= plan.maxItems * 0.9 && (
          <div className={atItemLimit ? 'plan-banner danger' : 'plan-banner warn'} style={{
            margin: '0 0 16px 0',
            padding: '10px 16px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '13px',
          }}>
            <Lock size={14} className="plan-banner-icon" />
            <span className="plan-banner-text" style={{ flex: 1 }}>
              {atItemLimit
                ? `You've reached the ${plan.maxItems}-item limit on the ${plan.name} plan.`
                : `${store.items.length} of ${plan.maxItems} items used on the ${plan.name} plan.`}
            </span>
            <button
              onClick={() => navigate('/settings?upgrade=1')}
              style={{
                background: atItemLimit ? '#dc2626' : '#d97706',
                color: '#fff', border: 'none', borderRadius: '6px',
                padding: '4px 12px', fontSize: '12px', fontWeight: 700,
                cursor: 'pointer', whiteSpace: 'nowrap',
              }}
            >
              Upgrade Plan
            </button>
          </div>
        )}

        <div className="items-sticky">
          <div className="toolbar">
            <div className="toolbar-left" style={{ flex: 1, minWidth: 220 }}>
              <div className="toolbar-search-wrap" style={{ flex: 1, minWidth: 220, maxWidth: 380 }}>
                <SearchIcon size={15} strokeWidth={2.1} />
                <input
                  className="toolbar-search"
                  placeholder="Search name, SKU, location, notes…"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            <div className="toolbar-right">
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                <SelectTrigger className="h-9 w-[150px] min-w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Sort · Name</SelectItem>
                  <SelectItem value="qty">Sort · Quantity</SelectItem>
                  <SelectItem value="price">Sort · Price</SelectItem>
                  <SelectItem value="updated">Sort · Updated</SelectItem>
                  <SelectItem value="created">Sort · Created</SelectItem>
                </SelectContent>
              </Select>
              <button
                type="button"
                className="icon-btn"
                onClick={() => setSortDir(d => d === 'asc' ? 'desc' : 'asc')}
                title={sortDir === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDir === 'asc' ? <ArrowUp size={15} strokeWidth={2.1} /> : <ArrowDown size={15} strokeWidth={2.1} />}
              </button>
              <button
                type="button"
                className={`icon-btn ${showFilters ? 'active' : ''}`}
                onClick={() => setShowFilters(v => !v)}
                style={{ width: 'auto', padding: '0 12px', gap: '6px', fontSize: '12.5px', fontWeight: 600 }}
              >
                <SlidersHorizontal size={14} strokeWidth={2.1} /> Filters
              </button>
              <div className="view-toggle">
                <button type="button" className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid view">
                  <LayoutGrid size={15} strokeWidth={2.1} />
                </button>
                <button type="button" className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="List view">
                  <List size={15} strokeWidth={2.1} />
                </button>
              </div>
            </div>
          </div>

          {showFilters && (
            <div style={{
              display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap',
              padding: '12px 16px', marginBottom: '20px',
              background: 'var(--surface-raised)', border: '1px solid var(--border-color)', borderRadius: '10px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Stock</span>
                <Select value={stockFilter} onValueChange={(v) => setStockFilter(v as typeof stockFilter)}>
                  <SelectTrigger className="h-8 w-[130px] text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="in_stock">In stock</SelectItem>
                    <SelectItem value="low">Low stock</SelectItem>
                    <SelectItem value="out">Out of stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 600 }}>Price</span>
                <input className="input" type="number" placeholder="Min" value={minPrice} onChange={e => setMinPrice(e.target.value)}
                  style={{ width: '80px', padding: '6px 8px', fontSize: '12px' }} />
                <span style={{ color: 'var(--text-muted)' }}>–</span>
                <input className="input" type="number" placeholder="Max" value={maxPrice} onChange={e => setMaxPrice(e.target.value)}
                  style={{ width: '80px', padding: '6px 8px', fontSize: '12px' }} />
              </div>
              {(minPrice || maxPrice || stockFilter !== 'all') && (
                <button
                  onClick={() => { setMinPrice(''); setMaxPrice(''); setStockFilter('all'); }}
                  style={{ fontSize: '12px', color: 'var(--danger)', padding: '4px 8px' }}>
                  Clear
                </button>
              )}
              <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
                Showing {filtered.items.length} item{filtered.items.length === 1 ? '' : 's'}
              </span>
            </div>
          )}
        </div>{/* /items-sticky */}

        {/* Inventory stats strip (Sortly-style) */}
        {(filtered.folders.length > 0 || filtered.items.length > 0) && (() => {
          // Totals roll up the whole subtree (incl. nested folders); counts above
          // stay at the current level. When a search is active, fall back to the
          // visible filtered items so the numbers match what's on screen.
          const isFiltering = Boolean(debouncedQuery) || minPrice !== '' || maxPrice !== '' || stockFilter !== 'all';
          const itemCount = isFiltering ? filtered.items.length : subtreeTotals.itemCount;
          const totalQty = isFiltering
            ? filtered.items.reduce((s, i) => s + i.quantity, 0)
            : subtreeTotals.totalQty;
          const totalValue = isFiltering
            ? filtered.items.reduce((s, i) => s + itemInventoryValue(i), 0)
            : subtreeTotals.totalValue;
          return (
            <div className="inv-stats">
              <div className="inv-stats-cell">
                <span className="inv-stats-label">Folders:</span>
                <span className="inv-stats-value">{filtered.folders.length}</span>
              </div>
              <div className="inv-stats-cell">
                <span className="inv-stats-label">Items:</span>
                <span className="inv-stats-value">{itemCount.toLocaleString()}</span>
              </div>
              <div className="inv-stats-cell">
                <span className="inv-stats-label">Total Quantity:</span>
                <span className="inv-stats-value">{totalQty.toLocaleString()}</span>
              </div>
              <div className="inv-stats-cell">
                <span className="inv-stats-label">Total Value:</span>
                <span className="inv-stats-value">{format(totalValue)}</span>
              </div>
            </div>
          );
        })()}

        {viewMode === 'grid' ? (
          <>
            {filtered.folders.length > 0 && (
              <div className="section-head">
                <div className="section-head-title">
                  <Folder size={12} strokeWidth={2.4} /> Folders
                  <span className="section-head-count">{filtered.folders.length}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(204px, 1fr))', gap: '16px', marginBottom: filtered.folders.length > 0 && filtered.items.length > 0 ? '30px' : '0' }}>
              {filtered.folders.map(f => {
                const stats = folderStats.get(f.id) ?? { itemCount: 0, subCount: 0, totalValue: 0 };
                const { itemCount, subCount, totalValue: folderTotalValue } = stats;
                return (
                  <div key={f.id} className="folder-card animate-fade-up" onClick={() => navigate(`/items/folder/${f.id}`)}>
                    <div className="folder-card-cover-wrap">
                      {f.coverImage ? (
                        <img className="folder-card-cover" src={f.coverImage} alt={f.name} loading="lazy" decoding="async" />
                      ) : (
                        <div className="folder-card-cover-empty">
                          <Folder size={56} strokeWidth={1.5} fill="rgba(255, 255, 255, 0.96)" />
                        </div>
                      )}
                      <div onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="folder-card-menu" title="Folder actions" aria-label="Folder actions">
                              <MoreVertical size={15} strokeWidth={2.1} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="min-w-[168px]">
                            <DropdownMenuItem onSelect={() => setEditFolderId(f.id)}>
                              <Edit2 size={14} /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => openMoveAction(f.id, 'folder')}>
                              <FolderInput size={14} /> Move
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setDeleteTarget({ id: f.id, isFolder: true, name: f.name })}
                            >
                              <Trash2 size={14} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                    <div className="folder-card-body">
                      <h3 className="folder-card-title">{f.name}</h3>
                      <div className="folder-card-meta">
                        <span className="folder-card-meta-pill">
                          <Box size={12} strokeWidth={1.9} /> {itemCount}
                        </span>
                        <span className="folder-card-divider" />
                        <span className="folder-card-meta-pill">
                          {format(folderTotalValue)}
                        </span>
                        {subCount > 0 && (
                          <>
                            <span className="folder-card-divider" />
                            <span className="folder-card-meta-pill">
                              <Folder size={11} strokeWidth={1.9} /> {subCount}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.items.length > 0 && (
              <div className="section-head">
                <div className="section-head-title">
                  <Package size={12} strokeWidth={2.4} /> Items
                  <span className="section-head-count">{filtered.items.length}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(208px, 1fr))', gap: '18px' }}>
              {filtered.items.map(item => {
                const stockState =
                  item.quantity === 0 ? 'out'
                    : (item.minLevel !== null && item.quantity <= item.minLevel) ? 'low'
                      : 'in';
                const stockLabel = stockState === 'out' ? 'Out' : stockState === 'low' ? 'Low' : 'In stock';
                return (
                  <div key={item.id} className="premium-item-card animate-fade-up" onClick={() => navigate(`/items/detail/${item.id}`)}>
                    <div className="premium-item-thumb">
                      {item.photos.length > 0 ? (
                        <img className="premium-item-img" src={item.photos[0]} alt={item.name} loading="lazy" decoding="async" />
                      ) : (
                        <div className="premium-item-img-empty">
                          <Package size={40} strokeWidth={1.5} />
                        </div>
                      )}
                      <span className={`premium-item-stockchip ${stockState}`}>
                        <span className="premium-item-stockchip-dot" /> {stockLabel}
                      </span>
                      <div className="premium-item-menu" onClick={e => e.stopPropagation()}>
                        <ItemActionMenu itemId={item.id} variant="overlay" align="right" size={15} />
                      </div>
                    </div>
                    <div className="premium-item-body">
                      <h3 className="premium-item-name">{item.name}</h3>
                      {item.sku && (
                        <div className="premium-item-sku">{item.sku}</div>
                      )}
                      <div className="premium-item-meta">
                        <div onClick={e => e.stopPropagation()}>
                          <ItemQtyControl item={item} onAdjust={() => setAdjustItemId(item.id)} />
                        </div>
                        <span className="premium-item-price">{format(itemInventoryValue(item))}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {filtered.folders.length > 0 && (
              <div className="section-head">
                <div className="section-head-title">
                  <Folder size={12} strokeWidth={2.4} /> Folders
                  <span className="section-head-count">{filtered.folders.length}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: filtered.folders.length > 0 && filtered.items.length > 0 ? '24px' : '0' }}>
              {filtered.folders.map(f => {
                const itemCount = folderStats.get(f.id)?.itemCount ?? 0;
                return (
                  <div key={f.id} className="premium-item-row is-folder animate-fade" onClick={() => navigate(`/items/folder/${f.id}`)}>
                    <div className="premium-item-row-thumb" style={{ background: f.color + '14', color: f.color, opacity: 1 }}>
                      {f.coverImage ? (
                        <img src={f.coverImage} alt={f.name} loading="lazy" decoding="async" />
                      ) : (
                        <Folder size={20} strokeWidth={1.7} fill={f.color + '40'} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-dark)', letterSpacing: '-0.010em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {f.name}
                      </div>
                      <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <Folder size={10} strokeWidth={2.2} /> Folder
                      </div>
                    </div>
                    <span className="chip chip-info" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {itemCount} item{itemCount === 1 ? '' : 's'}
                    </span>
                    <div onClick={(e) => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="icon-btn" aria-label="Folder actions" style={{ width: 32, height: 32 }}>
                            <MoreVertical size={16} strokeWidth={2.1} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[168px]">
                          <DropdownMenuItem onSelect={() => setEditFolderId(f.id)}>
                            <Edit2 size={14} /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => openMoveAction(f.id, 'folder')}>
                            <FolderInput size={14} /> Move
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            variant="destructive"
                            onSelect={() => setDeleteTarget({ id: f.id, isFolder: true, name: f.name })}
                          >
                            <Trash2 size={14} /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })}
            </div>
            {filtered.items.length > 0 && (
              <div className="section-head">
                <div className="section-head-title">
                  <Package size={12} strokeWidth={2.4} /> Items
                  <span className="section-head-count">{filtered.items.length}</span>
                </div>
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {filtered.items.map(item => {
                const stockState =
                  item.quantity === 0 ? 'out'
                    : (item.minLevel !== null && item.quantity <= item.minLevel) ? 'low'
                      : 'in';
                const chipClass = stockState === 'out' ? 'chip-danger' : stockState === 'low' ? 'chip-warning' : 'chip-success';
                const stockLabel = stockState === 'out' ? 'Out' : stockState === 'low' ? 'Low' : 'In';
                return (
                  <div key={item.id} className="premium-item-row is-item animate-fade" onClick={() => navigate(`/items/detail/${item.id}`)}>
                    <div className="premium-item-row-thumb">
                      {item.photos.length > 0 ? (
                        <img src={item.photos[0]} alt={item.name} loading="lazy" decoding="async" />
                      ) : (
                        <Package size={20} strokeWidth={1.7} />
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '13.5px', color: 'var(--text-dark)', letterSpacing: '-0.010em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </div>
                      {item.sku && (
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '10.5px', color: 'var(--text-faint)', letterSpacing: '0.02em', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.sku}
                        </div>
                      )}
                    </div>
                    <span className={`chip ${chipClass}`} style={{ justifySelf: 'start' }}>{stockLabel}</span>
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                      <ItemQtyControl item={item} onAdjust={() => setAdjustItemId(item.id)} />
                    </div>
                    <span style={{ fontSize: '12.5px', color: 'var(--text-medium)', fontWeight: 600, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
                      {format(itemInventoryValue(item))}
                    </span>
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center' }}>
                      <ItemActionMenu itemId={item.id} variant="inline" align="right" size={16} />
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>

      {/* Modals — each owns its own form state; see components/items/*Modal.tsx */}
      <MoveModal
        open={showMoveModal}
        onClose={() => { setShowMoveModal(false); setActionItemRef(null); }}
        target={actionItemRef}
      />
      <AddFolderModal
        open={showAddFolder}
        onClose={() => setShowAddFolder(false)}
        parentFolderId={currentFolderId}
      />
      <EditFolderModal
        folderId={editFolderId}
        onClose={() => setEditFolderId(null)}
      />
      <AddItemModal
        open={showAddItem}
        onClose={closeAddItem}
        currentFolderId={currentFolderId}
        initialSku={pendingSku ?? undefined}
      />

      {adjustItem && (
        <AdjustStockModal
          open={true}
          onClose={() => setAdjustItemId(null)}
          item={adjustItem}
        />
      )}

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleteTarget?.isFolder ? `folder "${deleteTarget.name}"` : `"${deleteTarget?.name ?? 'item'}"`}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.isFolder
                ? 'This will permanently delete the folder and everything inside it. This cannot be undone.'
                : 'This cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
