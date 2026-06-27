import {
  createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode,
} from 'react';
import type {
  PickList, PickHistoryEntry, PickListComment, PickListIssue, PickIssueType,
  PurchaseOrder, PurchaseOrderStatus,
  StockCount, StockCountStatus,
} from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from '../lib/api';
import { useAuth } from './useAuthStore';
import { cacheGet, cacheSet } from '../lib/cache';
import { getBootstrap } from '../lib/bootstrap';

interface WorkflowContextType {
  pickLists: PickList[];
  purchaseOrders: PurchaseOrder[];
  stockCounts: StockCount[];
  reservations: Record<string, number>;
  myHistory: PickHistoryEntry[];
  loading: boolean;

  refreshPickLists: () => Promise<void>;
  refreshReservations: () => Promise<void>;
  refreshMyHistory: () => Promise<void>;
  refreshPurchaseOrders: () => Promise<void>;
  refreshStockCounts: () => Promise<void>;

  // Pick Lists
  createPickList: (name: string, notes: string, assignedTo: string | null) => Promise<PickList>;
  updatePickList: (id: string, updates: { name?: string; notes?: string; assignedTo?: string | null }) => Promise<void>;
  deletePickList: (id: string) => Promise<void>;
  markReady: (id: string) => Promise<void>;
  unmarkReady: (id: string) => Promise<void>;
  completePickList: (id: string) => Promise<void>;
  addPickListItem: (listId: string, body: { itemId: string; requestedQty: number; locationHint?: string | null; unitPrice?: number | null }) => Promise<void>;
  updatePickListItem: (listId: string, itemId: string, body: { requestedQty?: number; locationHint?: string | null; unitPrice?: number | null }) => Promise<void>;
  removePickListItem: (listId: string, itemId: string) => Promise<void>;
  pickItem: (listId: string, itemId: string, quantity: number) => Promise<void>;
  getPickListById: (id: string) => PickList | undefined;
  fetchPickListByCode: (code: string) => Promise<PickList>;

  // Pick comments
  fetchComments: (pickListId: string) => Promise<PickListComment[]>;
  addComment: (pickListId: string, content: string) => Promise<PickListComment>;
  deleteComment: (pickListId: string, commentId: string) => Promise<void>;

  // Pick issues
  fetchIssues: (pickListId: string) => Promise<PickListIssue[]>;
  reportIssue: (pickListId: string, plItemId: string, body: {
    issueType: PickIssueType;
    quantityAffected: number;
    quantityActuallyPicked: number;
    notes: string | null;
    adjustItemQuantity: boolean;
  }) => Promise<PickListIssue>;
  deleteIssue: (pickListId: string, issueId: string) => Promise<void>;

  // Purchase Orders (server-backed)
  createPurchaseOrder: (supplier: string, notes: string, expectedDate?: string | null) => Promise<PurchaseOrder>;
  updatePurchaseOrder: (id: string, updates: { supplier?: string; notes?: string; status?: PurchaseOrderStatus; expectedDate?: string | null }) => Promise<void>;
  deletePurchaseOrder: (id: string) => Promise<void>;
  addPOItem: (orderId: string, body: { itemId: string; orderedQty: number; unitPrice: number }) => Promise<void>;
  updatePOItem: (orderId: string, itemRowId: string, updates: { orderedQty?: number; unitPrice?: number }) => Promise<void>;
  removePOItem: (orderId: string, itemRowId: string) => Promise<void>;
  receivePO: (id: string) => Promise<void>;
  getPOById: (id: string) => PurchaseOrder | undefined;

  // Stock Counts (server-backed)
  createStockCount: (name: string, notes: string) => Promise<StockCount>;
  updateStockCount: (id: string, updates: { name?: string; notes?: string; status?: StockCountStatus }) => Promise<void>;
  deleteStockCount: (id: string) => Promise<void>;
  addStockCountItem: (countId: string, body: { itemId: string; expectedQuantity: number }) => Promise<void>;
  updateStockCountItem: (countId: string, itemRowId: string, updates: { countedQuantity: number | null; notes?: string | null }) => Promise<void>;
  removeStockCountItem: (countId: string, itemRowId: string) => Promise<void>;
  applyStockCount: (id: string) => Promise<void>;
  getStockCountById: (id: string) => StockCount | undefined;
}

const WorkflowContext = createContext<WorkflowContextType | null>(null);

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, org } = useAuth();
  const orgId = org?.id ?? null;
  const [pickLists, setPickLists] = useState<PickList[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [stockCounts, setStockCounts] = useState<StockCount[]>([]);
  const [reservations, setReservations] = useState<Record<string, number>>({});
  const [myHistory, setMyHistory] = useState<PickHistoryEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Mirror current pickLists in a ref so optimistic-update helpers can capture
  // a pre-mutation snapshot without dragging pickLists into useCallback deps
  // (which would invalidate every action on every state change).
  const pickListsRef = useRef<PickList[]>([]);
  useEffect(() => { pickListsRef.current = pickLists; }, [pickLists]);

  // Patch the local pickList by id with the supplied changes and return the
  // pre-patch snapshot (so the caller can roll back on error). Returns null if
  // the id is not in state.
  const optimisticPatch = useCallback((id: string, patch: Partial<PickList>): PickList | null => {
    const snapshot = pickListsRef.current.find(p => p.id === id) ?? null;
    if (!snapshot) return null;
    setPickLists(curr => curr.map(p => p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p));
    return snapshot;
  }, []);

  const rollbackPatch = useCallback((snapshot: PickList | null) => {
    if (!snapshot) return;
    setPickLists(curr => curr.map(p => p.id === snapshot.id ? snapshot : p));
  }, []);

  const refreshPickLists = useCallback(async () => {
    try {
      const data = await apiGet<PickList[]>('/api/pick-lists');
      setPickLists(data);
      if (orgId) cacheSet(orgId, 'pickLists', data);
    } catch { /* keep cache */ }
  }, [orgId]);
  const refreshReservations = useCallback(async () => {
    try {
      const data = await apiGet<Record<string, number>>('/api/items/reservations');
      setReservations(data);
      if (orgId) cacheSet(orgId, 'reservations', data);
    } catch { /* keep cache */ }
  }, [orgId]);
  const refreshMyHistory = useCallback(async () => {
    try {
      const data = await apiGet<PickHistoryEntry[]>('/api/pick-lists/history');
      setMyHistory(data);
      if (orgId) cacheSet(orgId, 'pickHistory', data);
    } catch { /* keep cache */ }
  }, [orgId]);
  const refreshPurchaseOrders = useCallback(async () => {
    try {
      const data = await apiGet<PurchaseOrder[]>('/api/purchase-orders');
      setPurchaseOrders(data);
      if (orgId) cacheSet(orgId, 'purchaseOrders', data);
    } catch { /* keep cache */ }
  }, [orgId]);
  const refreshStockCounts = useCallback(async () => {
    try {
      const data = await apiGet<StockCount[]>('/api/stock-counts');
      setStockCounts(data);
      if (orgId) cacheSet(orgId, 'stockCounts', data);
    } catch { /* keep cache */ }
  }, [orgId]);

  useEffect(() => {
    if (!isLoggedIn) {
      setPickLists([]); setReservations({}); setMyHistory([]);
      setPurchaseOrders([]); setStockCounts([]);
      return;
    }

    // Hydrate from cache for instant paint.
    const cPL = cacheGet<PickList[]>(orgId, 'pickLists');
    const cRes = cacheGet<Record<string, number>>(orgId, 'reservations');
    const cHist = cacheGet<PickHistoryEntry[]>(orgId, 'pickHistory');
    const cPO = cacheGet<PurchaseOrder[]>(orgId, 'purchaseOrders');
    const cSC = cacheGet<StockCount[]>(orgId, 'stockCounts');
    const haveAny = cPL || cRes || cHist || cPO || cSC;
    if (cPL)   setPickLists(cPL);
    if (cRes)  setReservations(cRes);
    if (cHist) setMyHistory(cHist);
    if (cPO)   setPurchaseOrders(cPO);
    if (cSC)   setStockCounts(cSC);

    setLoading(!haveAny);
    if (!orgId) { setLoading(false); return; }
    getBootstrap(orgId)
      .then(data => {
        const pl = data.pickLists as PickList[];
        const po = data.purchaseOrders as PurchaseOrder[];
        const sc = data.stockCounts as StockCount[];
        const hist = data.pickHistory as PickHistoryEntry[];
        setPickLists(pl);
        setPurchaseOrders(po);
        setStockCounts(sc);
        setReservations(data.reservations);
        setMyHistory(hist);
        cacheSet(orgId, 'pickLists', pl);
        cacheSet(orgId, 'purchaseOrders', po);
        cacheSet(orgId, 'stockCounts', sc);
        cacheSet(orgId, 'reservations', data.reservations);
        cacheSet(orgId, 'pickHistory', hist);
      })
      .catch(() => { /* keep cached state */ })
      .finally(() => setLoading(false));
  }, [isLoggedIn, orgId]);

  // ── Pick Lists ────────────────────────────────────────────────────────────
  const createPickList = useCallback(async (name: string, notes: string, assignedTo: string | null) => {
    const pl = await apiPost<PickList>('/api/pick-lists', { name, notes, assignedTo });
    setPickLists(prev => [pl, ...prev]);
    return pl;
  }, []);
  const updatePickList = useCallback(async (id: string, updates: { name?: string; notes?: string; assignedTo?: string | null }) => {
    const snapshot = optimisticPatch(id, updates);
    try {
      const updated = await apiPut<PickList>(`/api/pick-lists/${id}`, updates);
      setPickLists(prev => prev.map(p => p.id === id ? updated : p));
    } catch (e) {
      rollbackPatch(snapshot);
      throw e;
    }
  }, [optimisticPatch, rollbackPatch]);
  const deletePickList = useCallback(async (id: string) => {
    const snapshot = pickListsRef.current.find(p => p.id === id) ?? null;
    setPickLists(prev => prev.filter(p => p.id !== id));
    try {
      await apiDelete(`/api/pick-lists/${id}`);
      await refreshReservations();
    } catch (e) {
      if (snapshot) {
        setPickLists(prev => prev.some(p => p.id === id) ? prev : [snapshot, ...prev]);
      }
      throw e;
    }
  }, [refreshReservations]);
  const markReady = useCallback(async (id: string) => {
    const snapshot = optimisticPatch(id, { status: 'ready' });
    try {
      const updated = await apiPost<PickList>(`/api/pick-lists/${id}/ready`);
      setPickLists(prev => prev.map(p => p.id === id ? updated : p));
    } catch (e) {
      rollbackPatch(snapshot);
      throw e;
    }
  }, [optimisticPatch, rollbackPatch]);
  const unmarkReady = useCallback(async (id: string) => {
    const snapshot = optimisticPatch(id, { status: 'draft' });
    try {
      const updated = await apiPost<PickList>(`/api/pick-lists/${id}/draft`);
      setPickLists(prev => prev.map(p => p.id === id ? updated : p));
    } catch (e) {
      rollbackPatch(snapshot);
      throw e;
    }
  }, [optimisticPatch, rollbackPatch]);
  const completePickList = useCallback(async (id: string) => {
    const snapshot = optimisticPatch(id, { status: 'completed' });
    try {
      const updated = await apiPost<PickList>(`/api/pick-lists/${id}/complete`);
      setPickLists(prev => prev.map(p => p.id === id ? updated : p));
      await refreshReservations();
    } catch (e) {
      rollbackPatch(snapshot);
      throw e;
    }
  }, [optimisticPatch, rollbackPatch, refreshReservations]);
  const addPickListItem = useCallback(async (listId: string, body: { itemId: string; requestedQty: number; locationHint?: string | null; unitPrice?: number | null }) => {
    const result = await apiPost<{ picked: PickList; added: string }>(`/api/pick-lists/${listId}/items`, body);
    setPickLists(prev => prev.map(p => p.id === listId ? result.picked : p));
    await refreshReservations();
  }, [refreshReservations]);
  const updatePickListItem = useCallback(async (listId: string, itemId: string, body: { requestedQty?: number; locationHint?: string | null; unitPrice?: number | null }) => {
    const snapshot = pickListsRef.current.find(p => p.id === listId) ?? null;
    if (snapshot) {
      setPickLists(prev => prev.map(p => p.id === listId ? {
        ...p,
        updatedAt: new Date().toISOString(),
        items: p.items.map(it => it.itemId === itemId ? {
          ...it,
          ...(body.requestedQty !== undefined ? { requestedQty: body.requestedQty } : {}),
          ...(body.locationHint !== undefined ? { locationHint: body.locationHint } : {}),
          ...(body.unitPrice !== undefined ? { unitPrice: body.unitPrice ?? 0 } : {}),
        } : it),
      } : p));
    }
    try {
      const updated = await apiPut<PickList>(`/api/pick-lists/${listId}/items/${itemId}`, body);
      setPickLists(prev => prev.map(p => p.id === listId ? updated : p));
      await refreshReservations();
    } catch (e) {
      if (snapshot) setPickLists(prev => prev.map(p => p.id === listId ? snapshot : p));
      throw e;
    }
  }, [refreshReservations]);
  const removePickListItem = useCallback(async (listId: string, itemId: string) => {
    const snapshot = pickListsRef.current.find(p => p.id === listId) ?? null;
    if (snapshot) {
      setPickLists(prev => prev.map(p => p.id === listId ? {
        ...p,
        updatedAt: new Date().toISOString(),
        items: p.items.filter(it => it.itemId !== itemId),
      } : p));
    }
    try {
      const updated = await apiDelete<PickList>(`/api/pick-lists/${listId}/items/${itemId}`);
      setPickLists(prev => prev.map(p => p.id === listId ? updated : p));
      await refreshReservations();
    } catch (e) {
      if (snapshot) setPickLists(prev => prev.map(p => p.id === listId ? snapshot : p));
      throw e;
    }
  }, [refreshReservations]);
  const pickItem = useCallback(async (listId: string, itemId: string, quantity: number) => {
    const updated = await apiPost<PickList>(`/api/pick-lists/${listId}/items/${itemId}/pick`, { quantity });
    setPickLists(prev => prev.map(p => p.id === listId ? updated : p));
    await Promise.all([refreshReservations(), refreshMyHistory()]);
  }, [refreshReservations, refreshMyHistory]);
  const getPickListById = useCallback((id: string) => pickLists.find(p => p.id === id), [pickLists]);
  const fetchPickListByCode = useCallback(async (code: string) => {
    const pl = await apiGet<PickList>(`/api/pick-lists/by-code/${encodeURIComponent(code)}`);
    setPickLists(prev => {
      const exists = prev.some(p => p.id === pl.id);
      return exists ? prev.map(p => p.id === pl.id ? pl : p) : [pl, ...prev];
    });
    return pl;
  }, []);

  // ── Pick comments ─────────────────────────────────────────────────────────
  const fetchComments = useCallback(async (pickListId: string) => {
    return apiGet<PickListComment[]>(`/api/pick-lists/${pickListId}/comments`);
  }, []);
  const addComment = useCallback(async (pickListId: string, content: string) => {
    return apiPost<PickListComment>(`/api/pick-lists/${pickListId}/comments`, { content });
  }, []);
  const deleteComment = useCallback(async (pickListId: string, commentId: string) => {
    await apiDelete(`/api/pick-lists/${pickListId}/comments/${commentId}`);
  }, []);

  // ── Pick issues ───────────────────────────────────────────────────────────
  const fetchIssues = useCallback(async (pickListId: string) => {
    return apiGet<PickListIssue[]>(`/api/pick-lists/${pickListId}/issues`);
  }, []);
  const reportIssue = useCallback(async (pickListId: string, plItemId: string, body: {
    issueType: PickIssueType;
    quantityAffected: number;
    quantityActuallyPicked: number;
    notes: string | null;
    adjustItemQuantity: boolean;
  }) => {
    const issue = await apiPost<PickListIssue>(`/api/pick-lists/${pickListId}/items/${plItemId}/issues`, body);
    if (body.adjustItemQuantity) {
      await refreshPickLists();
      await refreshReservations();
    }
    return issue;
  }, [refreshPickLists, refreshReservations]);
  const deleteIssue = useCallback(async (pickListId: string, issueId: string) => {
    await apiDelete(`/api/pick-lists/${pickListId}/issues/${issueId}`);
  }, []);

  // ── Purchase Orders (server-backed) ───────────────────────────────────────
  const createPurchaseOrder = useCallback(async (supplier: string, notes: string, expectedDate: string | null = null) => {
    const po = await apiPost<PurchaseOrder>('/api/purchase-orders', { supplier, notes, expectedDate });
    await refreshPurchaseOrders();
    return po;
  }, [refreshPurchaseOrders]);
  const updatePurchaseOrder = useCallback(async (id: string, updates: { supplier?: string; notes?: string; status?: PurchaseOrderStatus; expectedDate?: string | null }) => {
    await apiPut(`/api/purchase-orders/${id}`, updates);
    await refreshPurchaseOrders();
  }, [refreshPurchaseOrders]);
  const deletePurchaseOrder = useCallback(async (id: string) => {
    await apiDelete(`/api/purchase-orders/${id}`);
    await refreshPurchaseOrders();
  }, [refreshPurchaseOrders]);
  const addPOItem = useCallback(async (orderId: string, body: { itemId: string; orderedQty: number; unitPrice: number }) => {
    await apiPost(`/api/purchase-orders/${orderId}/items`, body);
    await refreshPurchaseOrders();
  }, [refreshPurchaseOrders]);
  const updatePOItem = useCallback(async (orderId: string, itemRowId: string, updates: { orderedQty?: number; unitPrice?: number }) => {
    await apiPut(`/api/purchase-orders/${orderId}/items/${itemRowId}`, updates);
    await refreshPurchaseOrders();
  }, [refreshPurchaseOrders]);
  const removePOItem = useCallback(async (orderId: string, itemRowId: string) => {
    await apiDelete(`/api/purchase-orders/${orderId}/items/${itemRowId}`);
    await refreshPurchaseOrders();
  }, [refreshPurchaseOrders]);
  const receivePO = useCallback(async (id: string) => {
    await apiPost(`/api/purchase-orders/${id}/receive`);
    await refreshPurchaseOrders();
  }, [refreshPurchaseOrders]);
  const getPOById = useCallback((id: string) => purchaseOrders.find(po => po.id === id), [purchaseOrders]);

  // ── Stock Counts (server-backed) ──────────────────────────────────────────
  const createStockCount = useCallback(async (name: string, notes: string) => {
    const sc = await apiPost<StockCount>('/api/stock-counts', { name, notes });
    await refreshStockCounts();
    return sc;
  }, [refreshStockCounts]);
  const updateStockCount = useCallback(async (id: string, updates: { name?: string; notes?: string; status?: StockCountStatus }) => {
    await apiPut(`/api/stock-counts/${id}`, updates);
    await refreshStockCounts();
  }, [refreshStockCounts]);
  const deleteStockCount = useCallback(async (id: string) => {
    await apiDelete(`/api/stock-counts/${id}`);
    await refreshStockCounts();
  }, [refreshStockCounts]);
  const addStockCountItem = useCallback(async (countId: string, body: { itemId: string; expectedQuantity: number }) => {
    await apiPost(`/api/stock-counts/${countId}/items`, body);
    await refreshStockCounts();
  }, [refreshStockCounts]);
  const updateStockCountItem = useCallback(async (countId: string, itemRowId: string, updates: { countedQuantity: number | null; notes?: string | null }) => {
    await apiPut(`/api/stock-counts/${countId}/items/${itemRowId}`, updates);
    await refreshStockCounts();
  }, [refreshStockCounts]);
  const removeStockCountItem = useCallback(async (countId: string, itemRowId: string) => {
    await apiDelete(`/api/stock-counts/${countId}/items/${itemRowId}`);
    await refreshStockCounts();
  }, [refreshStockCounts]);
  const applyStockCount = useCallback(async (id: string) => {
    await apiPost(`/api/stock-counts/${id}/apply`);
    await refreshStockCounts();
  }, [refreshStockCounts]);
  const getStockCountById = useCallback((id: string) => stockCounts.find(sc => sc.id === id), [stockCounts]);

  return (
    <WorkflowContext.Provider value={{
      pickLists, purchaseOrders, stockCounts, reservations, myHistory, loading,
      refreshPickLists, refreshReservations, refreshMyHistory, refreshPurchaseOrders, refreshStockCounts,
      createPickList, updatePickList, deletePickList, markReady, unmarkReady, completePickList,
      addPickListItem, updatePickListItem, removePickListItem, pickItem, getPickListById, fetchPickListByCode,
      fetchComments, addComment, deleteComment,
      fetchIssues, reportIssue, deleteIssue,
      createPurchaseOrder, updatePurchaseOrder, deletePurchaseOrder, addPOItem, updatePOItem, removePOItem, receivePO, getPOById,
      createStockCount, updateStockCount, deleteStockCount, addStockCountItem, updateStockCountItem, removeStockCountItem, applyStockCount, getStockCountById,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflows() {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflows must be used within a WorkflowProvider');
  return ctx;
}
