// Lightweight per-org localStorage cache with TTL.
// Used as a fast-paint hydration layer before API calls return.
// Stale data is shown immediately; the network response then replaces it.

const PREFIX = 'iinwentory_cache:v1:';
const DEFAULT_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 days

interface Envelope<T> {
  scope: string;
  savedAt: number;
  data: T;
}

function fullKey(scope: string, key: string): string {
  return `${PREFIX}${scope}:${key}`;
}

export function cacheGet<T>(scope: string | null | undefined, key: string, ttlMs = DEFAULT_TTL_MS): T | null {
  if (!scope) return null;
  try {
    const raw = localStorage.getItem(fullKey(scope, key));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Envelope<T>;
    if (parsed.scope !== scope) return null;
    if (Date.now() - parsed.savedAt > ttlMs) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

export function cacheSet<T>(scope: string | null | undefined, key: string, data: T): void {
  if (!scope) return;
  try {
    const envelope: Envelope<T> = { scope, savedAt: Date.now(), data };
    localStorage.setItem(fullKey(scope, key), JSON.stringify(envelope));
  } catch {
    // Quota errors are non-fatal — cache is optional.
  }
}

export function cacheClearScope(scope: string | null | undefined): void {
  if (!scope) return;
  try {
    const prefix = `${PREFIX}${scope}:`;
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore.
  }
}

export function cacheClearAll(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PREFIX)) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));
  } catch {
    // Ignore.
  }
}
