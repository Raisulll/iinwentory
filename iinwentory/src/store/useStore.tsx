import {
  createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, type ReactNode,
} from 'react';
import type { InventoryItem, Folder, Tag } from '../types';
import { apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from './useAuthStore';
import { cacheGet, cacheSet } from '../lib/cache';
import { getBootstrap, refetchBootstrap } from '../lib/bootstrap';
import { subscribeTeamChanges } from '../lib/realtime';
import { itemInventoryValue } from '../lib/itemValue';
import { searchItems as searchItemsList, tagNameMap } from '../lib/itemSearch';

interface StoreContextType {
  items: InventoryItem[];
  folders: Folder[];
  tags: Tag[];
  loading: boolean;

  // Folder CRUD
  addFolder: (
    name: string,
    parentId: string | null,
    options?: { color?: string; description?: string; coverImage?: string | null },
  ) => Promise<Folder>;
  updateFolder: (id: string, updates: Partial<Folder>) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  getFolderPath: (folderId: string | null) => Folder[];

  // Item CRUD — returns null if server rejects (e.g. plan limit)
  addItem: (item: Partial<InventoryItem> & { name: string; parentId: string | null }) => Promise<InventoryItem | null>;
  updateItem: (id: string, updates: Partial<InventoryItem>) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;

  // Tag CRUD
  addTag: (name: string, color?: string) => Promise<Tag>;
  updateTag: (id: string, updates: Partial<Tag>) => Promise<void>;
  deleteTag: (id: string) => Promise<void>;

  // Queries (synchronous — reads local in-memory state)
  getItemsInFolder: (folderId: string | null) => InventoryItem[];
  getSubFolders: (parentId: string | null) => Folder[];
  getItemById: (id: string) => InventoryItem | undefined;
  getFolderById: (id: string) => Folder | undefined;
  searchItems: (query: string) => InventoryItem[];
  getLowStockItems: () => InventoryItem[];
  getTotalStats: () => { items: number; folders: number; totalQuantity: number; totalValue: number };
}

const StoreContext = createContext<StoreContextType | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, org } = useAuth();
  const orgId = org?.id ?? null;
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);

  // Hydrate from cache + revalidate from server whenever the user logs in.
  useEffect(() => {
    if (!isLoggedIn) {
      setItems([]);
      setFolders([]);
      setTags([]);
      return;
    }

    // Fast paint from cache (if scoped to this org).
    const cachedItems = cacheGet<InventoryItem[]>(orgId, 'items');
    const cachedFolders = cacheGet<Folder[]>(orgId, 'folders');
    const cachedTags = cacheGet<Tag[]>(orgId, 'tags');
    const haveCache = cachedItems !== null && cachedFolders !== null && cachedTags !== null;
    if (haveCache) {
      setItems(cachedItems);
      setFolders(cachedFolders);
      setTags(cachedTags);
    }

    // Only show the spinner when there is nothing to paint.
    setLoading(!haveCache);
    if (!orgId) { setLoading(false); return; }
    getBootstrap(orgId)
      .then(data => {
        const fetchedItems = data.items as InventoryItem[];
        const fetchedFolders = data.folders as Folder[];
        const fetchedTags = data.tags as Tag[];
        setItems(fetchedItems);
        setFolders(fetchedFolders);
        setTags(fetchedTags);
        cacheSet(orgId, 'items', fetchedItems);
        cacheSet(orgId, 'folders', fetchedFolders);
        cacheSet(orgId, 'tags', fetchedTags);
      })
      .catch(() => { /* keep cached or empty state on error */ })
      .finally(() => setLoading(false));
  }, [isLoggedIn, orgId]);

  // Persist mutations through to the cache so the next paint stays fresh.
  useEffect(() => { if (isLoggedIn && orgId) cacheSet(orgId, 'items', items); }, [items, isLoggedIn, orgId]);
  useEffect(() => { if (isLoggedIn && orgId) cacheSet(orgId, 'folders', folders); }, [folders, isLoggedIn, orgId]);
  useEffect(() => { if (isLoggedIn && orgId) cacheSet(orgId, 'tags', tags); }, [tags, isLoggedIn, orgId]);

  // Live mirrors of state for optimistic mutations. These let the CRUD
  // callbacks snapshot "current" state synchronously for rollback WITHOUT
  // depending on items/folders/tags — so the callbacks keep stable identities
  // ([] deps) and the memoized context value below doesn't churn every render.
  const itemsRef = useRef(items);
  const foldersRef = useRef(folders);
  const tagsRef = useRef(tags);
  useEffect(() => { itemsRef.current = items; }, [items]);
  useEffect(() => { foldersRef.current = folders; }, [folders]);
  useEffect(() => { tagsRef.current = tags; }, [tags]);

  // Realtime sync — Supabase WebSocket streams postgres_changes for the user's
  // team. Any INSERT/UPDATE/DELETE on items/folders/tags/item_tags triggers a
  // debounced refetch (~250ms) so the web mirrors mobile-app edits within a
  // beat instead of waiting on a poll cycle.
  //
  // Defence in depth: tab `focus` also triggers a refresh, in case the
  // WebSocket dropped silently (mobile networks, sleeping laptops, etc.).
  useEffect(() => {
    if (!isLoggedIn || !orgId) return;

    let aborted = false;
    let unsubscribe: (() => void) | null = null;
    let inFlight = false;

    const refresh = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        const data = await refetchBootstrap();
        if (aborted) return;
        setItems(data.items as InventoryItem[]);
        setFolders(data.folders as Folder[]);
        setTags(data.tags as Tag[]);
        cacheSet(orgId, 'items', data.items as InventoryItem[]);
        cacheSet(orgId, 'folders', data.folders as Folder[]);
        cacheSet(orgId, 'tags', data.tags as Tag[]);
      } catch { /* swallow; next change or focus will retry */ }
      finally { inFlight = false; }
    };

    void subscribeTeamChanges({
      teamId: orgId,
      tables: ['items', 'folders', 'tags', 'item_tags'],
      onChange: () => { void refresh(); },
    }).then(unsub => {
      if (aborted) { unsub(); return; }
      unsubscribe = unsub;
    }).catch(() => {
      // Realtime unreachable — focus listener below is the only sync path.
    });

    const onFocus = () => { void refresh(); };
    window.addEventListener('focus', onFocus);

    return () => {
      aborted = true;
      if (unsubscribe) unsubscribe();
      window.removeEventListener('focus', onFocus);
    };
  }, [isLoggedIn, orgId]);

  // ── Folder CRUD ──────────────────────────────────────────────────────────────

  const addFolder = useCallback(async (
    name: string,
    parentId: string | null,
    options?: { color?: string; description?: string; coverImage?: string | null },
  ): Promise<Folder> => {
    const folder = await apiPost<Folder>('/api/folders', {
      name, parentId,
      color: options?.color ?? '#9ca3af',
      description: options?.description ?? '',
      coverImage: options?.coverImage ?? null,
    });
    // Idempotent: the realtime INSERT refetch can race ahead of this append
    // and already include the new folder — dedupe by id to avoid a duplicate.
    setFolders(prev => prev.some(f => f.id === folder.id)
      ? prev.map(f => f.id === folder.id ? folder : f)
      : [...prev, folder]);
    return folder;
  }, []);

  const updateFolder = useCallback(async (id: string, updates: Partial<Folder>): Promise<void> => {
    // Optimistic: apply the edit locally now, reconcile with the server's
    // canonical row when it returns, roll back if the write fails.
    const snapshot = foldersRef.current;
    setFolders(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    try {
      const updated = await apiPut<Folder>(`/api/folders/${id}`, updates);
      setFolders(prev => prev.map(f => f.id === id ? updated : f));
    } catch (err) {
      setFolders(snapshot);
      throw err;
    }
  }, []);

  const deleteFolder = useCallback(async (id: string): Promise<void> => {
    // Collect descendant IDs from current local state for optimistic removal.
    const toDelete = new Set<string>();
    const collect = (parentId: string) => {
      toDelete.add(parentId);
      foldersRef.current.filter(f => f.parentId === parentId).forEach(f => collect(f.id));
    };
    collect(id);

    // Optimistic: remove the folder + its descendants and orphaned items now.
    const folderSnap = foldersRef.current;
    const itemSnap = itemsRef.current;
    setFolders(prev => prev.filter(f => !toDelete.has(f.id)));
    setItems(prev => prev.filter(item => item.parentId === null || !toDelete.has(item.parentId)));
    try {
      await apiDelete(`/api/folders/${id}`);
    } catch (err) {
      setFolders(folderSnap);
      setItems(itemSnap);
      throw err;
    }
  }, []);

  const getFolderPath = useCallback((folderId: string | null): Folder[] => {
    const path: Folder[] = [];
    let currentId = folderId;
    while (currentId) {
      const folder = folders.find(f => f.id === currentId);
      if (folder) { path.unshift(folder); currentId = folder.parentId; }
      else break;
    }
    return path;
  }, [folders]);

  // ── Item CRUD ────────────────────────────────────────────────────────────────

  const addItem = useCallback(async (
    partial: Partial<InventoryItem> & { name: string; parentId: string | null },
  ): Promise<InventoryItem | null> => {
    try {
      const item = await apiPost<InventoryItem>('/api/items', {
        name: partial.name,
        parentId: partial.parentId,
        sku: partial.sku ?? null,
        description: partial.description ?? null,
        weight: partial.weight ?? null,
        location: partial.location ?? null,
        quantity: partial.quantity ?? 1,
        unit: partial.unit ?? 'units',
        minLevel: partial.minLevel ?? null,
        price: partial.price ?? partial.sellPrice ?? 0,
        sellPrice: partial.sellPrice ?? null,
        costPrice: partial.costPrice ?? null,
        notes: partial.notes ?? '',
        status: partial.status ?? 'active',
        tags: partial.tags ?? [],
        photos: partial.photos ?? [],
        customFields: partial.customFields,
      });
      // Idempotent append: the Supabase realtime INSERT for this same row can
      // refetch the full list (already containing `item`) and land before this
      // .then runs. A plain [...prev, item] would then add a second copy with
      // the same id — the duplicate the user sees. Replace-if-present, else add.
      setItems(prev => prev.some(i => i.id === item.id)
        ? prev.map(i => i.id === item.id ? item : i)
        : [...prev, item]);
      return item;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to add item';
      alert(msg);
      return null;
    }
  }, []);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>): Promise<void> => {
    // Optimistic: reflect the edit instantly, then reconcile with the server.
    const snapshot = itemsRef.current;
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
    try {
      const updated = await apiPut<InventoryItem>(`/api/items/${id}`, updates);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } catch (err) {
      setItems(snapshot);
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string): Promise<void> => {
    const snapshot = itemsRef.current;
    setItems(prev => prev.filter(i => i.id !== id));
    try {
      await apiDelete(`/api/items/${id}`);
    } catch (err) {
      setItems(snapshot);
      throw err;
    }
  }, []);

  // ── Tag CRUD ─────────────────────────────────────────────────────────────────

  const addTag = useCallback(async (name: string, color?: string): Promise<Tag> => {
    const tag = await apiPost<Tag>('/api/tags', { name, color: color ?? '#294EA7' });
    // Idempotent: the realtime INSERT refetch can race ahead of this append
    // and already include the new tag — dedupe by id to avoid a duplicate.
    setTags(prev => prev.some(t => t.id === tag.id)
      ? prev.map(t => t.id === tag.id ? tag : t)
      : [...prev, tag]);
    return tag;
  }, []);

  const updateTag = useCallback(async (id: string, updates: Partial<Tag>): Promise<void> => {
    const snapshot = tagsRef.current;
    setTags(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
    try {
      const updated = await apiPut<Tag>(`/api/tags/${id}`, updates);
      setTags(prev => prev.map(t => t.id === id ? updated : t));
    } catch (err) {
      setTags(snapshot);
      throw err;
    }
  }, []);

  const deleteTag = useCallback(async (id: string): Promise<void> => {
    const tagSnap = tagsRef.current;
    const itemSnap = itemsRef.current;
    setTags(prev => prev.filter(t => t.id !== id));
    setItems(prev => prev.map(item => ({ ...item, tags: item.tags.filter(t => t !== id) })));
    try {
      await apiDelete(`/api/tags/${id}`);
    } catch (err) {
      setTags(tagSnap);
      setItems(itemSnap);
      throw err;
    }
  }, []);

  // ── Queries (synchronous reads) ───────────────────────────────────────────────

  const getItemsInFolder = useCallback((folderId: string | null) =>
    items.filter(i => i.parentId === folderId), [items]);

  const getSubFolders = useCallback((parentId: string | null) =>
    folders.filter(f => f.parentId === parentId), [folders]);

  const getItemById = useCallback((id: string) => items.find(i => i.id === id), [items]);
  const getFolderById = useCallback((id: string) => folders.find(f => f.id === id), [folders]);

  const searchItems = useCallback((query: string) => {
    const ctx = { tagsById: tagNameMap(tags) };
    return searchItemsList(items, query, ctx);
  }, [items, tags]);

  // Low stock = quantity at or below the reorder level. When no level is set
  // (min_quantity defaults to 0) this reduces to "out of stock" (quantity <= 0),
  // which matches the mobile app. The count was only ever wrong because the item
  // set included non-active rows; that's now filtered server-side in /api/bootstrap.
  const getLowStockItems = useCallback(() =>
    items.filter(i => i.minLevel !== null && i.quantity <= i.minLevel), [items]);

  const getTotalStats = useCallback(() => ({
    items: items.length,
    folders: folders.length,
    totalQuantity: items.reduce((acc, i) => acc + i.quantity, 0),
    // Total inventory value: Σ itemInventoryValue (sell price preferred,
    // falling back to cost). Items with neither contribute 0. Same rule as
    // the Items list and the item detail page.
    totalValue: items.reduce((acc, i) => acc + itemInventoryValue(i), 0),
  }), [items, folders]);

  // Memoize the context value so consumers don't re-render on every
  // StoreProvider parent re-render. Without this, every component that
  // calls useStore() re-renders on each tick — even when their slice
  // of the state hasn't changed.
  const value = useMemo<StoreContextType>(() => ({
    items, folders, tags, loading,
    addFolder, updateFolder, deleteFolder, getFolderPath,
    addItem, updateItem, deleteItem,
    addTag, updateTag, deleteTag,
    getItemsInFolder, getSubFolders, getItemById, getFolderById,
    searchItems, getLowStockItems, getTotalStats,
  }), [
    items, folders, tags, loading,
    addFolder, updateFolder, deleteFolder, getFolderPath,
    addItem, updateItem, deleteItem,
    addTag, updateTag, deleteTag,
    getItemsInFolder, getSubFolders, getItemById, getFolderById,
    searchItems, getLowStockItems, getTotalStats,
  ]);

  return (
    <StoreContext.Provider value={value}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within a StoreProvider');
  return ctx;
}
