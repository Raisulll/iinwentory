// Single round-trip bootstrap shared across all stores.
//
// On login, AuthProvider hydrates user/org first. Once the org id is known we
// kick off /api/bootstrap exactly once and every downstream store reads its
// slice from the same shared promise. This collapses ~10 separate fetches
// into one, which is the dominant first-paint cost on remote DBs.

import { apiGet } from './api';

export interface BootstrapData {
  org: { id: string; name: string; planId: string } | null;
  settings: { currency: string; defaultView: string; lowStockAlerts: boolean };
  user: { id: string; name: string; email: string } | null;
  team: unknown[];
  items: unknown[];
  folders: unknown[];
  tags: unknown[];
  pickLists: unknown[];
  reservations: Record<string, number>;
  pickHistory: unknown[];
  purchaseOrders: unknown[];
  stockCounts: unknown[];
}

interface PendingBootstrap {
  orgId: string;
  promise: Promise<BootstrapData>;
}

let pending: PendingBootstrap | null = null;

export function getBootstrap(orgId: string): Promise<BootstrapData> {
  if (pending && pending.orgId === orgId) return pending.promise;
  const promise = apiGet<BootstrapData>('/api/bootstrap');
  pending = { orgId, promise };
  // Drop reference once settled so that an explicit refetch can re-trigger.
  promise.finally(() => {
    if (pending && pending.promise === promise) pending = null;
  });
  return promise;
}

export function clearBootstrap(): void {
  pending = null;
}

/**
 * Force a fresh /api/bootstrap fetch, ignoring any in-flight or cached
 * promise. Used by the sync ticker to pick up changes made by the mobile
 * app (or another browser tab) without waiting for a manual refresh.
 */
export function refetchBootstrap(): Promise<BootstrapData> {
  return apiGet<BootstrapData>('/api/bootstrap');
}
