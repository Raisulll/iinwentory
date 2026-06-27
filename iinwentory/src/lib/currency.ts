// Currency formatting + conversion.
//
// Prices are STORED in GBP (the base currency) and entered in GBP. The chosen
// display currency converts the figure at render time using daily FX rates
// (frankfurter.app, base GBP). So a stored 7.50 shows as £7.50, or ~$9.53 /
// ~€8.78 etc. depending on the selected currency and the current rate.
//
// Data entry stays in GBP — only display converts — so values round-trip
// without drift. Changing the display currency never rewrites stored amounts.

export interface FxRates {
  base: string;
  rates: Record<string, number>;
  fetchedAt: number;
}

export interface CurrencyMeta {
  symbol: string;
  code: string;
  name: string;
}

// Symbols stored historically in settings.currency map to ISO codes for FX.
export const SYMBOL_TO_ISO: Record<string, string> = {
  '$':  'USD',
  '€':  'EUR',
  '£':  'GBP',
  '¥':  'JPY',
  '₹':  'INR',
  '₩':  'KRW',
  'C$': 'CAD',
  'A$': 'AUD',
};

export const CURRENCY_META: Record<string, CurrencyMeta> = {
  USD: { symbol: '$',  code: 'USD', name: 'US Dollar' },
  EUR: { symbol: '€',  code: 'EUR', name: 'Euro' },
  GBP: { symbol: '£',  code: 'GBP', name: 'British Pound' },
  JPY: { symbol: '¥',  code: 'JPY', name: 'Japanese Yen' },
  INR: { symbol: '₹',  code: 'INR', name: 'Indian Rupee' },
  KRW: { symbol: '₩',  code: 'KRW', name: 'Korean Won' },
  CAD: { symbol: 'C$', code: 'CAD', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', code: 'AUD', name: 'Australian Dollar' },
};

export const BASE_CURRENCY = 'GBP';

export function symbolToIso(symbol: string): string {
  return SYMBOL_TO_ISO[symbol] ?? 'GBP';
}

// Normalise a stored currency value (already a symbol) to its canonical display
// symbol — the same symbol `formatPrice` renders. Use for labels/prefixes next
// to price inputs so they track the chosen currency.
export function currencySymbol(stored: string): string {
  return CURRENCY_META[symbolToIso(stored)]?.symbol ?? stored;
}

// Prices are stored in GBP (the base currency). Convert to the target currency
// at render time using daily FX rates (base GBP, so rate is a direct multiplier).
// Falls back to 1:1 when rates are unavailable or the target is GBP.
export function convertFromGBP(amount: number, targetIso: string, rates: FxRates | null): number {
  if (!rates || targetIso === BASE_CURRENCY) return amount;
  const rate = rates.rates?.[targetIso];
  return typeof rate === 'number' && rate > 0 ? amount * rate : amount;
}

// JPY/KRW are typically shown without decimals; everything else 2dp.
function decimalsFor(iso: string): number {
  return iso === 'JPY' || iso === 'KRW' ? 0 : 2;
}

// Format a stored amount with the user's chosen currency symbol. Display-only:
// the number is rendered as-is, just with the matching symbol and decimals.
//   formatPrice(12.34, '£', rates)  -> "£12.34"
export function formatPrice(
  amount: number,
  displaySymbol: string,
  rates: FxRates | null,
  decimals?: number,
): string {
  const iso = symbolToIso(displaySymbol);
  const meta = CURRENCY_META[iso];
  const sym = meta?.symbol ?? displaySymbol;
  const value = convertFromGBP(amount, iso, rates);
  const d = decimals ?? decimalsFor(iso);
  const fixed = value.toFixed(d);
  // Thousands separators help on JPY/KRW where amounts run large.
  const [whole, frac] = fixed.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac ? `${sym}${grouped}.${frac}` : `${sym}${grouped}`;
}
