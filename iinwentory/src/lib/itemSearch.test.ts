import { describe, it, expect } from 'vitest';
import { matchItem, searchItems, parseTerms, tagNameMap } from './itemSearch';
import type { InventoryItem } from '../types';

function makeItem(overrides: Partial<InventoryItem>): InventoryItem {
  return {
    id: 'id-1',
    name: 'Widget',
    parentId: null,
    sku: null,
    description: null,
    weight: null,
    dimensions: null,
    location: null,
    quantity: 0,
    unit: 'pcs',
    minLevel: null,
    minQuantity: 0,
    price: 0,
    sellPrice: null,
    costPrice: null,
    customFields: {},
    notes: '',
    tags: [],
    photos: [],
    status: 'active',
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01',
    ...overrides,
  };
}

describe('parseTerms', () => {
  it('splits on whitespace and lowercases', () => {
    expect(parseTerms('  Red   Bolt ')).toEqual(['red', 'bolt']);
  });
  it('returns empty array for blank query', () => {
    expect(parseTerms('   ')).toEqual([]);
  });
});

describe('matchItem', () => {
  it('matches everything on empty query', () => {
    expect(matchItem(makeItem({}), '')).toBe(true);
  });

  it('is case-insensitive on name', () => {
    expect(matchItem(makeItem({ name: 'Hex Bolt' }), 'BOLT')).toBe(true);
  });

  it('matches across SKU, location, notes, id', () => {
    const item = makeItem({ sku: 'ABC-123', location: 'Aisle 4', notes: 'fragile', id: 'xyz' });
    expect(matchItem(item, 'abc-123')).toBe(true);
    expect(matchItem(item, 'aisle')).toBe(true);
    expect(matchItem(item, 'fragile')).toBe(true);
    expect(matchItem(item, 'xyz')).toBe(true);
  });

  it('requires every term to match somewhere (AND across fields)', () => {
    const item = makeItem({ name: 'Bolt, red', sku: 'HW-9' });
    expect(matchItem(item, 'red bolt')).toBe(true);   // both terms present, different order
    expect(matchItem(item, 'red hw-9')).toBe(true);   // terms span name + sku
    expect(matchItem(item, 'red green')).toBe(false); // "green" is absent
  });

  it('matches by tag name via context', () => {
    const item = makeItem({ tags: ['t1'] });
    const ctx = { tagsById: tagNameMap([{ id: 't1', name: 'Hazardous' }]) };
    expect(matchItem(item, 'hazardous', ctx)).toBe(true);
    expect(matchItem(item, 'hazardous')).toBe(false); // no ctx → tag not searchable
  });

  it('matches custom field keys and values', () => {
    const item = makeItem({ customFields: { color: 'crimson', batch: 42 } });
    expect(matchItem(item, 'crimson')).toBe(true);
    expect(matchItem(item, 'color')).toBe(true);
    expect(matchItem(item, '42')).toBe(true);
  });

  it('does not bridge terms across field boundaries', () => {
    // name ends in "abc", sku starts with "def" → "abcdef" must NOT match.
    const item = makeItem({ name: 'abc', sku: 'def' });
    expect(matchItem(item, 'abcdef')).toBe(false);
  });
});

describe('searchItems', () => {
  const items = [
    makeItem({ id: '1', name: 'Red Bolt' }),
    makeItem({ id: '2', name: 'Blue Nut' }),
    makeItem({ id: '3', name: 'Red Washer' }),
  ];

  it('returns the original list for a blank query', () => {
    expect(searchItems(items, '   ')).toBe(items);
  });

  it('filters to matching items', () => {
    expect(searchItems(items, 'red').map(i => i.id)).toEqual(['1', '3']);
  });
});
