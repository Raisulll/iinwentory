import { describe, it, expect } from 'vitest';
import { itemInventoryValue, itemRetailValue } from './itemValue';

describe('itemInventoryValue', () => {
  it('prefers sell price when present', () => {
    expect(itemInventoryValue({ sellPrice: 5, costPrice: 2, quantity: 3 })).toBe(15);
  });

  it('falls back to cost price when sell price is null', () => {
    expect(itemInventoryValue({ sellPrice: null, costPrice: 2, quantity: 4 })).toBe(8);
  });

  it('contributes 0 when both prices are null', () => {
    expect(itemInventoryValue({ sellPrice: null, costPrice: null, quantity: 9 })).toBe(0);
  });

  it('returns 0 for zero quantity regardless of price', () => {
    expect(itemInventoryValue({ sellPrice: 5, costPrice: 2, quantity: 0 })).toBe(0);
  });
});

describe('itemRetailValue', () => {
  it('prefers sell price', () => {
    expect(itemRetailValue({ sellPrice: 7, price: 3, quantity: 2 })).toBe(14);
  });

  it('falls back to the legacy price field', () => {
    expect(itemRetailValue({ sellPrice: null, price: 3, quantity: 2 })).toBe(6);
  });

  it('is 0 when the fallback price is 0', () => {
    expect(itemRetailValue({ sellPrice: null, price: 0, quantity: 5 })).toBe(0);
  });
});
