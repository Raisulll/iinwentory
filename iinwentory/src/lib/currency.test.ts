import { describe, it, expect } from 'vitest';
import {
  symbolToIso,
  currencySymbol,
  convertFromGBP,
  formatPrice,
  type FxRates,
} from './currency';

const rates: FxRates = {
  base: 'GBP',
  rates: { USD: 1.25, EUR: 1.15, JPY: 190, GBP: 1 },
  fetchedAt: 0,
};

describe('symbolToIso', () => {
  it('maps known symbols to ISO codes', () => {
    expect(symbolToIso('$')).toBe('USD');
    expect(symbolToIso('£')).toBe('GBP');
    expect(symbolToIso('C$')).toBe('CAD');
  });

  it('falls back to GBP for unknown symbols', () => {
    expect(symbolToIso('₿')).toBe('GBP');
  });
});

describe('currencySymbol', () => {
  it('normalises a stored symbol to its canonical display symbol', () => {
    expect(currencySymbol('$')).toBe('$');
    expect(currencySymbol('£')).toBe('£');
  });

  it('resolves unrecognised symbols through the GBP fallback', () => {
    // symbolToIso('QQ') -> 'GBP', whose canonical symbol is '£'.
    expect(currencySymbol('QQ')).toBe('£');
  });
});

describe('convertFromGBP', () => {
  it('passes through unchanged for the base currency', () => {
    expect(convertFromGBP(10, 'GBP', rates)).toBe(10);
  });

  it('multiplies by the FX rate for other currencies', () => {
    expect(convertFromGBP(10, 'USD', rates)).toBeCloseTo(12.5);
  });

  it('falls back to 1:1 when rates are missing', () => {
    expect(convertFromGBP(10, 'USD', null)).toBe(10);
  });

  it('falls back to 1:1 when the target rate is absent or non-positive', () => {
    const bad: FxRates = { base: 'GBP', rates: { USD: 0 }, fetchedAt: 0 };
    expect(convertFromGBP(10, 'USD', bad)).toBe(10);
    expect(convertFromGBP(10, 'ZZZ', rates)).toBe(10);
  });
});

describe('formatPrice', () => {
  it('renders the GBP symbol with 2 decimals', () => {
    expect(formatPrice(12.34, '£', null)).toBe('£12.34');
  });

  it('converts and renders with the target symbol', () => {
    expect(formatPrice(10, '$', rates)).toBe('$12.50');
  });

  it('renders JPY with no decimals and thousands separators', () => {
    // 100 GBP * 190 = 19,000 JPY
    expect(formatPrice(100, '¥', rates)).toBe('¥19,000');
  });

  it('groups thousands for large values', () => {
    expect(formatPrice(1234567.5, '£', null)).toBe('£1,234,567.50');
  });

  it('honours an explicit decimals override', () => {
    expect(formatPrice(12.3456, '£', null, 3)).toBe('£12.346');
  });
});
