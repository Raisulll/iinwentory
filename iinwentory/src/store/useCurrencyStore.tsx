// FX rates provider + render-time formatter hook.
//
// Loads /api/fx-rates once on mount, caches in localStorage with a 24h TTL,
// and exposes `format(amountGBP)` that renders in the user's currently chosen
// display currency.

import { createContext, useContext, useEffect, useState, useMemo, useCallback, type ReactNode } from 'react';
import { apiGet } from '../lib/api';
import { useSettings } from './useSettingsStore';
import { formatPrice, convertFromGBP, symbolToIso, type FxRates } from '../lib/currency';

const FX_LS_KEY = 'iinwentory_fx_rates';
const FX_TTL_MS = 24 * 60 * 60 * 1000;

function readCachedRates(): FxRates | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FX_LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as FxRates;
    if (!parsed?.rates || typeof parsed.fetchedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCachedRates(r: FxRates): void {
  try { localStorage.setItem(FX_LS_KEY, JSON.stringify(r)); } catch { /* ignore */ }
}

interface CurrencyContextType {
  rates: FxRates | null;
  format: (amountGBP: number, decimals?: number) => string;
  convert: (amountGBP: number) => number;
}

const CurrencyContext = createContext<CurrencyContextType | null>(null);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [rates, setRates] = useState<FxRates | null>(() => readCachedRates());

  useEffect(() => {
    const cached = rates;
    const stale = !cached || Date.now() - cached.fetchedAt > FX_TTL_MS;
    if (!stale) return;
    let cancelled = false;
    apiGet<FxRates>('/api/fx-rates')
      .then(data => {
        if (cancelled) return;
        const next = { ...data, fetchedAt: Date.now() };
        setRates(next);
        writeCachedRates(next);
      })
      .catch(() => { /* keep cache or null; format falls back to 1:1 */ });
    return () => { cancelled = true; };
    // Only run on mount (cached check above guards against repeat fetches).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const format = useCallback((amountGBP: number, decimals?: number) => {
    return formatPrice(amountGBP, settings.currency, rates, decimals);
  }, [settings.currency, rates]);

  const convert = useCallback((amountGBP: number) => {
    return convertFromGBP(amountGBP, symbolToIso(settings.currency), rates);
  }, [settings.currency, rates]);

  const value = useMemo(() => ({ rates, format, convert }), [rates, format, convert]);

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextType {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider');
  return ctx;
}
