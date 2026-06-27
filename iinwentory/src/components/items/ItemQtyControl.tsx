import { SlidersHorizontal } from 'lucide-react';
import type { InventoryItem } from '../../types';

interface ItemQtyControlProps {
  item: InventoryItem;
  /** Hide the unit suffix (compact mode). */
  hideUnit?: boolean;
  /** Open the Adjust Stock popup for this item. */
  onAdjust: () => void;
}

/**
 * Read-only quantity readout + a hover-revealed "Adjust" button.
 *
 * Replaces the old inline +/- stepper on the Items page: quantity is no
 * longer mutated directly from the list. The button only appears when the
 * parent card/row is hovered (always visible on touch devices) and opens
 * the Adjust Stock modal — see the hover CSS in index.css keyed on
 * `.premium-item-card:hover` / `.premium-item-row:hover`.
 */
export default function ItemQtyControl({ item, hideUnit = false, onAdjust }: ItemQtyControlProps) {
  const qty = item.quantity;
  const stockState =
    qty === 0 ? 'out'
    : (item.minLevel !== null && qty <= item.minLevel) ? 'low'
    : 'in';

  return (
    <div className={`item-qty item-qty--${stockState}`}>
      <span className="item-qty-value">
        {qty.toLocaleString()}
        {!hideUnit && item.unit && <span className="item-qty-unit">{item.unit}</span>}
      </span>
      <button
        type="button"
        className="item-qty-adjust"
        aria-label="Adjust quantity"
        title="Adjust quantity"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); onAdjust(); }}
      >
        <SlidersHorizontal size={13} strokeWidth={2.4} />
      </button>
    </div>
  );
}
