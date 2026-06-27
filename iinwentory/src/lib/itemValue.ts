import type { InventoryItem } from '../types';

/**
 * Inventory value of a single item — matches the DB's `folder_stats` view:
 *   quantity × COALESCE(sell_price, cost_price, 0)
 *
 * Sell price is preferred; if it's null we fall back to cost price; if that's
 * also null the item contributes 0. Use this anywhere the UI says "Total Value"
 * or summarises stock worth.
 *
 * For expected-revenue calculations (sell × qty), use itemRetailValue().
 */
export function itemInventoryValue(
  i: Pick<InventoryItem, 'sellPrice' | 'costPrice' | 'quantity'>,
): number {
  return (i.sellPrice ?? i.costPrice ?? 0) * i.quantity;
}

/**
 * Expected revenue if every unit sold at its sell price. Falls back to the
 * legacy `price` field (which the server aliases to sell_price). Used by
 * the Value Report tab when it specifically wants retail math.
 */
export function itemRetailValue(
  i: Pick<InventoryItem, 'sellPrice' | 'price' | 'quantity'>,
): number {
  const p = i.sellPrice ?? i.price ?? 0;
  return p * i.quantity;
}
