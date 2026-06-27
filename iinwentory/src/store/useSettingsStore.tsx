import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { AppSettings } from '../types';
import { apiPut } from '../lib/api';
import { useAuth } from './useAuthStore';
import { cacheGet, cacheSet } from '../lib/cache';
import { getBootstrap } from '../lib/bootstrap';

const THEME_LS_KEY = 'iinwentory_theme';

function readStoredTheme(): 'light' | 'dark' {
  if (typeof localStorage === 'undefined') return 'light';
  const v = localStorage.getItem(THEME_LS_KEY);
  return v === 'dark' ? 'dark' : 'light';
}

const DEFAULT_SETTINGS: AppSettings = {
  orgName: 'My Organization',
  userName: 'Account Owner',
  userEmail: '',
  currency: '£',
  defaultView: 'grid',
  lowStockAlerts: true,
  theme: readStoredTheme(),
};

interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (updates: Partial<AppSettings>) => Promise<void>;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const { isLoggedIn, user, org } = useAuth();
  const orgId = org?.id ?? null;
  const [settings, setSettings] = useState<AppSettings>({ ...DEFAULT_SETTINGS });
  // Timestamp of the last local settings edit. Used to drop a stale bootstrap
  // hydration that resolves *after* the user changed something (e.g. picked a
  // currency) but reflects the pre-change server state — otherwise the slow
  // remote read silently reverts the user's selection.
  const lastLocalEditRef = useRef(0);

  // Hydrate from cache + revalidate from server when the user logs in.
  useEffect(() => {
    if (!isLoggedIn) {
      setSettings({ ...DEFAULT_SETTINGS });
      return;
    }

    const cached = cacheGet<AppSettings>(orgId, 'settings');
    if (cached) setSettings(cached);

    if (!orgId) return;
    const fetchStartedAt = Date.now();
    getBootstrap(orgId)
      .then(data => {
        // A local edit landed after this fetch began — its value is newer than
        // what the server returned here, so don't clobber it.
        if (lastLocalEditRef.current > fetchStartedAt) return;
        const next: AppSettings = {
          orgName: data.org?.name ?? DEFAULT_SETTINGS.orgName,
          userName: data.user?.name ?? DEFAULT_SETTINGS.userName,
          userEmail: data.user?.email ?? '',
          currency: data.settings.currency,
          defaultView: data.settings.defaultView as 'grid' | 'list',
          lowStockAlerts: data.settings.lowStockAlerts,
          theme: readStoredTheme(),
        };
        setSettings(next);
        cacheSet(orgId, 'settings', next);
      })
      .catch(() => { /* keep cache or defaults */ });
  }, [isLoggedIn, orgId]);

  // Apply the active theme to the document and persist user choice across logouts.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', settings.theme);
    try { localStorage.setItem(THEME_LS_KEY, settings.theme); } catch { /* ignore */ }
  }, [settings.theme]);

  // Sync user/org name changes from auth store
  useEffect(() => {
    if (user) setSettings(prev => ({ ...prev, userName: user.name, userEmail: user.email }));
  }, [user]);

  useEffect(() => {
    if (org) setSettings(prev => ({ ...prev, orgName: org.name }));
  }, [org]);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>): Promise<void> => {
    lastLocalEditRef.current = Date.now();
    setSettings(prev => {
      const next = { ...prev, ...updates };
      if (orgId) cacheSet(orgId, 'settings', next);
      return next;
    });

    await apiPut('/api/org', {
      ...(updates.orgName !== undefined && { orgName: updates.orgName }),
      ...(updates.userName !== undefined && { userName: updates.userName }),
      ...(updates.currency !== undefined && { currency: updates.currency }),
      ...(updates.defaultView !== undefined && { defaultView: updates.defaultView }),
      ...(updates.lowStockAlerts !== undefined && { lowStockAlerts: updates.lowStockAlerts }),
    });
  }, [orgId]);

  const resetSettings = useCallback(() => {
    setSettings({ ...DEFAULT_SETTINGS });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
