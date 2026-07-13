import type { InventoryItem } from '../types';

/**
 * Shared item search. Every search box in the app (Items, Advanced Search,
 * Workflows, the store's `searchItems`) routes through this so matching is
 * consistent: same fields, same multi-term behaviour, same tag/custom-field
 * coverage.
 *
 * Matching rules:
 *  - The query is split on whitespace into terms. EVERY term must match
 *    somewhere in the item (AND), so "red bolt" finds an item named
 *    "Bolt, red" - order and adjacency don't matter.
 *  - Each term is a case-insensitive substring test across name, SKU,
 *    location, notes, description, unit, the item id, its tag names, and any
 *    custom-field values.
 */

export interface ItemSearchContext {
  /** Map of tag id -> tag name, so items can be matched by tag name. */
  tagsById?: Map<string, string>;
}

/** Split a raw query into lowercased, non-empty terms. */
export function parseTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map(t => t.trim())
    .filter(Boolean);
}

/** Build the lowercased text blob an item is matched against. */
function buildHaystack(item: InventoryItem, ctx?: ItemSearchContext): string {
  const parts: (string | null | undefined)[] = [
    item.name,
    item.sku,
    item.location,
    item.notes,
    item.description,
    item.unit,
    item.id,
  ];

  // Tag names (item.tags holds tag ids)
  if (item.tags?.length && ctx?.tagsById) {
    for (const id of item.tags) {
      const name = ctx.tagsById.get(id);
      if (name) parts.push(name);
    }
  }

  // Custom field keys + primitive values
  if (item.customFields) {
    for (const [key, val] of Object.entries(item.customFields)) {
      if (val === null || val === undefined) continue;
      if (typeof val === 'object') continue; // skip nested structures
      parts.push(key);
      parts.push(String(val));
    }
  }

  // Join with a newline so a term can't accidentally bridge two fields.
  return parts.filter(Boolean).join('\n').toLowerCase();
}

/** True when every term in `query` matches the item. Empty query -> true. */
export function matchItem(item: InventoryItem, query: string, ctx?: ItemSearchContext): boolean {
  const terms = parseTerms(query);
  if (terms.length === 0) return true;
  const hay = buildHaystack(item, ctx);
  return terms.every(term => hay.includes(term));
}

/** Filter a list of items by `query`. Returns the list unchanged when empty. */
export function searchItems(
  items: InventoryItem[],
  query: string,
  ctx?: ItemSearchContext,
): InventoryItem[] {
  if (!query.trim()) return items;
  return items.filter(item => matchItem(item, query, ctx));
}

/** Convenience: build a tag id->name map from the tag list. */
export function tagNameMap(tags: { id: string; name: string }[]): Map<string, string> {
  return new Map(tags.map(t => [t.id, t.name]));
}
