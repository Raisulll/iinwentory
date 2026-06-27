const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:7745';

const ACCESS_TOKEN_KEY = 'iinwentory_access_token';
const REFRESH_TOKEN_KEY = 'iinwentory_refresh_token';

// ── Token storage ─────────────────────────────────────────────────────────────

export function getAccessToken(): string | null {
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setTokens(access: string, refresh: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, access);
  localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

// ── Shared cookie helpers for marketing site ──────────────────────────────────
// The marketing Nuxt site reads hb.auth.session to show "logged in" state.

export function setSharedCookies(token: string, planId: string): void {
  const expires = new Date(Date.now() + 30 * 864e5).toUTCString();
  document.cookie = `hb.auth.session=${encodeURIComponent(token)}; expires=${expires}; path=/`;
  document.cookie = `hb.auth.plan=${encodeURIComponent(planId)}; expires=${expires}; path=/`;
}

export function clearSharedCookies(): void {
  document.cookie = 'hb.auth.session=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  document.cookie = 'hb.auth.plan=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
}

// ── Token refresh ─────────────────────────────────────────────────────────────

async function attemptRefresh(): Promise<string | null> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${BASE_URL}/api/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    setTokens(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    return null;
  }
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken();

  const makeRequest = (t: string | null) =>
    fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });

  // Retry up to 2 times on transient cold-start 5xx (502/503/504) or network failure.
  let res: Response;
  let attempt = 0;
  const maxAttempts = 3;
  while (true) {
    try {
      res = await makeRequest(token);
    } catch (networkErr) {
      if (attempt < maxAttempts - 1) {
        attempt++;
        await sleep(400 * attempt);
        continue;
      }
      throw networkErr;
    }
    // Treat infrastructure-level errors (Vercel HTML 5xx) as transient.
    // Real server errors return JSON and should surface immediately.
    const ct = res.headers.get('content-type') ?? '';
    const isHtml5xx = res.status >= 500 && !ct.includes('application/json');
    const transient = res.status === 502 || res.status === 503 || res.status === 504 || isHtml5xx;
    if (transient && attempt < maxAttempts - 1) {
      attempt++;
      await sleep(600 * attempt);
      continue;
    }
    break;
  }

  // Try to refresh once on 401
  if (res.status === 401 && token) {
    token = await attemptRefresh();
    if (token) {
      res = await makeRequest(token);
    } else {
      // Refresh failed — clear auth state
      clearTokens();
      clearSharedCookies();
      window.dispatchEvent(new Event('auth:logout'));
    }
  }

  return res;
}

// Build a useful Error from a non-2xx Response. Prefers the server's
// human-readable `message` (e.g. "Your Free plan supports up to 200 items.")
// over the machine `error` code, falls back through to status text so we
// never surface an opaque "Request failed" to the user.
async function extractApiError(res: Response): Promise<Error> {
  const ct = res.headers.get('content-type') ?? '';
  let body: unknown = null;
  if (ct.includes('application/json')) {
    body = await res.json().catch(() => null);
  } else {
    const text = await res.text().catch(() => '');
    body = text ? { error: text.slice(0, 200) } : null;
  }
  const b = body as Record<string, unknown> | null;
  const msg =
    (typeof b?.message === 'string' && b.message) ||
    (typeof b?.error   === 'string' && b.error)   ||
    res.statusText ||
    `HTTP ${res.status}`;
  return new Error(String(msg));
}

// ── Typed helpers ─────────────────────────────────────────────────────────────

export async function apiGet<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path);
  if (!res.ok) {
    throw await extractApiError(res);
  }
  return res.json();
}

export async function apiPost<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'POST',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw await extractApiError(res);
  }
  return res.json();
}

export async function apiPut<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PUT',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw await extractApiError(res);
  }
  return res.json();
}

export async function apiPatch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiFetch(path, {
    method: 'PATCH',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    throw await extractApiError(res);
  }
  return res.json();
}

export async function apiDelete<T = unknown>(path: string): Promise<T> {
  const res = await apiFetch(path, { method: 'DELETE' });
  if (!res.ok) {
    throw await extractApiError(res);
  }
  return res.json();
}

// Photo upload — multipart/form-data. Returns { url, filename, size, mimetype }.
export async function apiUploadPhoto(file: File): Promise<{ url: string; filename: string; size: number; mimetype: string }> {
  const form = new FormData();
  form.append('file', file);

  const token = getAccessToken();
  const res = await fetch(`${BASE_URL}/api/uploads`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}
