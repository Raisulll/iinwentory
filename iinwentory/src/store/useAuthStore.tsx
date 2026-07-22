import {
  createContext, useContext, useState, useCallback, useEffect, type ReactNode,
} from 'react';
import { getPlan, type Plan, type PlanId } from '../plans';
import {
  apiPost, apiGet,
  setTokens, clearTokens, getAccessToken,
  setSharedCookies, clearSharedCookies,
} from '../lib/api';
import { cacheClearAll } from '../lib/cache';
import { clearBootstrap } from '../lib/bootstrap';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  /** Platform operator flag — set from profiles.role === 'super_admin'. */
  isSuperAdmin?: boolean;
}

interface OrgInfo {
  id: string;
  name: string;
  planId: PlanId;
}

interface AuthContextType {
  isLoggedIn: boolean;
  authLoading: boolean;
  user: AuthUser | null;
  org: OrgInfo | null;
  plan: Plan;
  login: (email: string, password: string) => Promise<{ ok: true } | { ok: false; error: string }>;
  loginWithGoogle: (credential: string) => Promise<{ ok: true; isNewUser: boolean } | { ok: false; error: string }>;
  register: (name: string, email: string, password: string, planId: PlanId, inviteCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  upgradePlan: (planId: PlanId) => void;
  refreshOrgPlan: () => Promise<void>;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [org, setOrg] = useState<OrgInfo | null>(null);
  const [plan, setPlan] = useState<Plan>(getPlan('free'));
  const [authLoading, setAuthLoading] = useState(() => !!getAccessToken());

  const isLoggedIn = user !== null;

  // Validate stored token and restore session on mount
  useEffect(() => {
    if (!getAccessToken()) {
      setAuthLoading(false);
      return;
    }

    apiGet<{ user: AuthUser; org: OrgInfo | null }>('/api/auth/me')
      .then(({ user, org }) => {
        setUser(user);
        if (org) {
          setOrg(org);
          setPlan(getPlan(org.planId));
          setSharedCookies(getAccessToken()!, org.planId);
        }
      })
      .catch(() => {
        clearTokens();
        clearSharedCookies();
      })
      .finally(() => setAuthLoading(false));
  }, []);

  // Listen for forced logout events (401 + refresh failed)
  useEffect(() => {
    const handler = () => {
      cacheClearAll();
      clearBootstrap();
      setUser(null);
      setOrg(null);
      setPlan(getPlan('free'));
    };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);

  const login = useCallback(async (
    email: string, password: string,
  ): Promise<{ ok: true } | { ok: false; error: string }> => {
    try {
      const data = await apiPost<{
        accessToken: string; refreshToken: string;
        user: AuthUser; org: OrgInfo | null;
      }>('/api/auth/login', { email, password });

      // org should always be present now (server provisions a personal team on
      // first login), but stay defensive so a missing org can't crash here and
      // get misreported below as "Cannot reach the server".
      const planId = data.org?.planId ?? 'free';
      setTokens(data.accessToken, data.refreshToken);
      setSharedCookies(data.accessToken, planId);
      setUser(data.user);
      setOrg(data.org ?? null);
      setPlan(getPlan(planId));
      return { ok: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      // TypeError: fetch failed → backend unreachable.
      if (err instanceof TypeError || /fetch|network|failed to fetch/i.test(msg)) {
        return { ok: false, error: 'Cannot reach the server. Is the backend running on the configured URL?' };
      }
      // The API surfaces "Invalid credentials" / similar on 401; pass that through.
      return { ok: false, error: msg || 'Login failed. Please try again.' };
    }
  }, []);

  const loginWithGoogle = useCallback(async (
    credential: string,
  ): Promise<{ ok: true; isNewUser: boolean } | { ok: false; error: string }> => {
    try {
      const data = await apiPost<{
        accessToken: string; refreshToken: string;
        user: AuthUser; org: OrgInfo | null; isNewUser: boolean;
      }>('/api/auth/google', { credential });

      const planId = data.org?.planId ?? 'free';
      setTokens(data.accessToken, data.refreshToken);
      setSharedCookies(data.accessToken, planId);
      setUser(data.user);
      setOrg(data.org ?? null);
      setPlan(getPlan(planId));
      return { ok: true, isNewUser: data.isNewUser };
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (err instanceof TypeError || /fetch|network|failed to fetch/i.test(msg)) {
        return { ok: false, error: 'Cannot reach the server. Is the backend running on the configured URL?' };
      }
      return { ok: false, error: msg || 'Google sign-in failed. Please try again.' };
    }
  }, []);

  const register = useCallback(async (
    name: string, email: string, password: string, planId: PlanId, inviteCode?: string,
  ): Promise<void> => {
    const payload: Record<string, unknown> = { name, email, password, planId };
    if (inviteCode && inviteCode.trim()) {
      payload.inviteCode = inviteCode.trim().toUpperCase();
    }
    const data = await apiPost<{
      accessToken: string; refreshToken: string;
      user: AuthUser; org: OrgInfo;
    }>('/api/auth/register', payload);

    setTokens(data.accessToken, data.refreshToken);
    setSharedCookies(data.accessToken, data.org.planId);
    setUser(data.user);
    setOrg(data.org);
    setPlan(getPlan(data.org.planId));
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try { await apiPost('/api/auth/logout'); } catch { /* ignore */ }
    clearTokens();
    clearSharedCookies();
    cacheClearAll();
    clearBootstrap();
    setUser(null);
    setOrg(null);
    setPlan(getPlan('free'));
  }, []);

  const upgradePlan = useCallback((planId: PlanId) => {
    setPlan(getPlan(planId));
    if (org) {
      const updated = { ...org, planId };
      setOrg(updated);
      setSharedCookies(getAccessToken() ?? '', planId);
    }
  }, [org]);

  const refreshOrgPlan = useCallback(async (): Promise<void> => {
    try {
      const data = await apiGet<{ user: AuthUser; org: OrgInfo | null }>('/api/auth/me');
      if (data.org) {
        setOrg(data.org);
        setPlan(getPlan(data.org.planId));
        setSharedCookies(getAccessToken() ?? '', data.org.planId);
      }
    } catch { /* ignore */ }
  }, []);

  return (
    <AuthContext.Provider value={{
      isLoggedIn, authLoading, user, org, plan,
      login, loginWithGoogle, register, logout, upgradePlan, refreshOrgPlan,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
