import { useEffect, useState } from 'react';
import { Plus, Minus, Equal, TrendingUp, TrendingDown, ArrowRight, Loader2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { InventoryItem } from '../../types';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

interface AdjustStockModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem;
}

type Mode = 'add' | 'remove' | 'set';

const MODES: { id: Mode; label: string; icon: typeof Plus }[] = [
  { id: 'add', label: 'Add', icon: Plus },
  { id: 'remove', label: 'Remove', icon: Minus },
  { id: 'set', label: 'Set', icon: Equal },
];

/** Quick-add amounts surfaced as chips in Add / Remove modes. */
const QUICK = [1, 5, 10, 25, 100];

type StockState = 'in' | 'low' | 'out';

function stockStateOf(qty: number, minLevel: number | null): StockState {
  if (qty <= 0) return 'out';
  if (minLevel !== null && qty <= minLevel) return 'low';
  return 'in';
}

/**
 * Adjust Stock — a tactile "stock counter". Three modes (Add / Remove / Set),
 * a hero readout of the *resulting* stock level (color-coded by stock state),
 * a current→new flow with a signed delta pill, and an optional reason appended
 * to notes. Single optimistic call to store.updateItem.
 */
export default function AdjustStockModal({ open, onClose, item }: AdjustStockModalProps) {
  const store = useStore();
  const [mode, setMode] = useState<Mode>('add');
  const [qty, setQty] = useState('1');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  // Reset transient form state each time the modal opens for a fresh item.
  useEffect(() => {
    if (open) { setMode('add'); setQty('1'); setReason(''); }
  }, [open, item.id]);

  const parsedQty = Math.max(0, parseInt(qty) || 0);
  const next =
    mode === 'add'    ? item.quantity + parsedQty
    : mode === 'remove' ? Math.max(0, item.quantity - parsedQty)
    :                     parsedQty;
  const delta = next - item.quantity;
  const nextState = stockStateOf(next, item.minLevel);
  const dirty = next !== item.quantity;

  const handleSave = async () => {
    if (saving || !dirty) { if (!dirty) onClose(); return; }
    setSaving(true);
    try {
      await store.updateItem(item.id, {
        quantity: next,
        notes: reason.trim()
          ? `${item.notes ? item.notes + '\n' : ''}[stock adjusted ${item.quantity}→${next}] ${reason.trim()}`
          : item.notes,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const bump = (by: number) => setQty(String(Math.max(0, parsedQty + by)));
  const setAmount = (n: number) => setQty(String(n));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="as gap-0 overflow-hidden border-0 p-0 sm:max-w-[396px]"
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void handleSave(); }
        }}
      >
        {/* Header */}
        <div className="as-head">
          <div className="as-kicker">Adjust stock</div>
          <DialogTitle className="as-title">{item.name}</DialogTitle>
          <div className="as-current">
            <span className="as-current-dot" data-state={stockStateOf(item.quantity, item.minLevel)} />
            <span className="as-current-num">{item.quantity.toLocaleString()}</span>
            <span className="as-current-unit">{item.unit || 'in stock'}</span>
          </div>
        </div>

        <div className="as-body">
          {/* Mode segmented control */}
          <div className="as-seg" data-mode={mode}>
            <span className="as-seg-thumb" aria-hidden />
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                className={cn('as-seg-btn', mode === id && 'is-active')}
                onClick={() => setMode(id)}
              >
                <Icon size={14} strokeWidth={2.6} />
                {label}
              </button>
            ))}
          </div>

          {/* Stepper */}
          <div className="as-stepper">
            <button type="button" className="as-step" onClick={() => bump(-1)} aria-label="Decrease">
              <Minus size={20} strokeWidth={2.8} />
            </button>
            <div className="as-amount">
              <input
                type="text"
                inputMode="numeric"
                value={qty}
                onChange={(e) => setQty(e.target.value.replace(/[^\d]/g, ''))}
                onFocus={(e) => e.target.select()}
                className="as-amount-input"
                aria-label={mode === 'set' ? 'Set stock to' : `Quantity to ${mode}`}
              />
              <span className="as-amount-label">
                {mode === 'add' ? 'to add' : mode === 'remove' ? 'to remove' : 'exact count'}
              </span>
            </div>
            <button type="button" className="as-step" onClick={() => bump(1)} aria-label="Increase">
              <Plus size={20} strokeWidth={2.8} />
            </button>
          </div>

          {/* Quick chips */}
          <div className="as-chips">
            {QUICK.map((n) => (
              <button
                key={n}
                type="button"
                className="as-chip"
                onClick={() => (mode === 'set' ? setAmount(n) : bump(n))}
              >
                {mode === 'set' ? n : (mode === 'remove' ? `−${n}` : `+${n}`)}
              </button>
            ))}
          </div>

          {/* Result readout */}
          <div className="as-result" data-state={nextState}>
            <div className="as-result-top">
              <span className="as-result-label">New stock level</span>
              {delta !== 0 && (
                <span className={cn('as-delta', delta > 0 ? 'is-up' : 'is-down')}>
                  {delta > 0 ? <TrendingUp size={12} strokeWidth={2.8} /> : <TrendingDown size={12} strokeWidth={2.8} />}
                  {delta > 0 ? '+' : '−'}{Math.abs(delta).toLocaleString()}
                </span>
              )}
            </div>
            <div className="as-result-flow">
              <span className="as-result-from">{item.quantity.toLocaleString()}</span>
              <ArrowRight size={16} strokeWidth={2.6} className="as-result-arrow" />
              <span className="as-result-to">{next.toLocaleString()}</span>
              {item.unit && <span className="as-result-unit">{item.unit}</span>}
            </div>
            {nextState !== 'in' && (
              <div className="as-result-flag">
                {nextState === 'out' ? 'Out of stock' : 'Below minimum level'}
              </div>
            )}
          </div>

          {/* Reason */}
          <label className="as-field">
            <span className="as-field-label">Reason <em>optional</em></span>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="restock, breakage, count correction…"
              className="as-field-input"
            />
          </label>
        </div>

        {/* Footer */}
        <div className="as-foot">
          <button type="button" className="as-btn as-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="as-btn as-btn-save"
            onClick={() => void handleSave()}
            disabled={saving || !dirty}
          >
            {saving ? <Loader2 size={15} className="animate-spin" /> : null}
            {saving ? 'Saving…' : dirty ? 'Save adjustment' : 'No change'}
          </button>
        </div>
      </DialogContent>

      <style>{`
        .as { box-shadow: var(--shadow-modal, 0 24px 60px -16px rgba(15,23,42,.32)); }

        /* ---- Header ---- */
        .as-head {
          position: relative;
          padding: 22px 24px 18px;
          background:
            radial-gradient(120% 140% at 0% 0%, var(--primary-tint) 0%, transparent 60%),
            var(--surface-raised);
          border-bottom: 1px solid var(--border-color);
        }
        .as-kicker {
          font-size: 10.5px; font-weight: 800; letter-spacing: .14em;
          text-transform: uppercase; color: var(--primary);
        }
        .as-title {
          margin: 4px 0 0; font-family: var(--font-display);
          font-size: 22px; font-weight: 600; line-height: 1.15;
          letter-spacing: -0.01em; color: var(--text-dark);
        }
        .as-current { display: inline-flex; align-items: baseline; gap: 7px; margin-top: 10px; }
        .as-current-dot {
          width: 7px; height: 7px; border-radius: 999px; align-self: center;
          background: var(--success);
        }
        .as-current-dot[data-state="low"] { background: var(--warning); }
        .as-current-dot[data-state="out"] { background: var(--danger); }
        .as-current-num {
          font-family: var(--font-mono); font-size: 14px; font-weight: 700;
          color: var(--text-dark); font-variant-numeric: tabular-nums;
        }
        .as-current-unit { font-size: 11.5px; font-weight: 500; color: var(--text-muted); }

        /* ---- Body ---- */
        .as-body { padding: 18px 24px 20px; display: flex; flex-direction: column; gap: 16px; }

        /* Segmented control */
        .as-seg {
          position: relative; display: grid; grid-template-columns: repeat(3, 1fr);
          padding: 4px; border-radius: var(--radius-md);
          background: var(--surface-tint); border: 1px solid var(--border-color);
        }
        .as-seg-thumb {
          position: absolute; top: 4px; bottom: 4px; left: 4px;
          width: calc((100% - 8px) / 3); border-radius: calc(var(--radius-md) - 4px);
          background: var(--card-bg);
          box-shadow: 0 1px 2px rgba(15,23,42,.10), 0 3px 8px -3px rgba(15,23,42,.18);
          transition: transform .26s cubic-bezier(.4,1.2,.4,1);
        }
        .as-seg[data-mode="remove"] .as-seg-thumb { transform: translateX(100%); }
        .as-seg[data-mode="set"] .as-seg-thumb { transform: translateX(200%); }
        .as-seg-btn {
          position: relative; z-index: 1; display: inline-flex; align-items: center;
          justify-content: center; gap: 6px; padding: 8px 0; border: 0; background: none;
          cursor: pointer; font-size: 13px; font-weight: 700; letter-spacing: -0.01em;
          color: var(--text-muted); transition: color .2s var(--ease);
        }
        .as-seg-btn.is-active { color: var(--primary); }
        .as-seg[data-mode="remove"] .as-seg-btn.is-active { color: var(--danger); }

        /* Stepper */
        .as-stepper { display: flex; align-items: center; justify-content: space-between; gap: 14px; }
        .as-step {
          flex: none; width: 52px; height: 52px; border-radius: 999px;
          display: inline-flex; align-items: center; justify-content: center;
          border: 1px solid var(--border-strong); background: var(--card-bg);
          color: var(--text-dark); cursor: pointer;
          transition: transform .12s var(--ease), background .15s var(--ease),
            border-color .15s var(--ease), color .15s var(--ease);
        }
        .as-step:hover { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .as-step:active { transform: scale(.9); }
        .as-amount { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .as-amount-input {
          width: 100%; text-align: center; border: 0; background: transparent; outline: none;
          -webkit-appearance: none; appearance: none; color-scheme: light;
          font-family: var(--font-mono); font-size: 44px; font-weight: 700;
          line-height: 1; letter-spacing: -0.03em; color: var(--text-dark);
          font-variant-numeric: tabular-nums;
        }
        /* index.css (~L1423) force-coerces ALL dark-mode inputs to a
           surface-raised fill with !important + a high-specificity :not() chain.
           The hero amount field must stay chrome-free, so out-specify it. */
        [data-theme="dark"] .as .as-body .as-stepper .as-amount .as-amount-input {
          background: transparent !important;
        }
        .as-amount-label {
          font-size: 10.5px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase;
          color: var(--text-muted);
        }

        /* Quick chips */
        .as-chips { display: flex; gap: 7px; }
        .as-chip {
          flex: 1; padding: 7px 0; border-radius: var(--radius-sm);
          border: 1px solid var(--border-color); background: var(--surface-raised);
          font-family: var(--font-mono); font-size: 12.5px; font-weight: 700;
          color: var(--text-medium); cursor: pointer; font-variant-numeric: tabular-nums;
          transition: background .14s var(--ease), border-color .14s var(--ease),
            color .14s var(--ease), transform .12s var(--ease);
        }
        .as-chip:hover { background: var(--primary-light); border-color: var(--primary); color: var(--primary); }
        .as-chip:active { transform: scale(.94); }

        /* Result readout */
        .as-result {
          border-radius: var(--radius-lg); padding: 14px 16px;
          border: 1px solid var(--border-color);
          background:
            linear-gradient(180deg, var(--primary-tint) 0%, transparent 100%),
            var(--surface-raised);
          --accent: var(--primary);
        }
        .as-result[data-state="low"] { --accent: var(--warning); }
        .as-result[data-state="out"] { --accent: var(--danger); }
        .as-result-top { display: flex; align-items: center; justify-content: space-between; }
        .as-result-label {
          font-size: 10.5px; font-weight: 800; letter-spacing: .1em; text-transform: uppercase;
          color: var(--text-muted);
        }
        .as-delta {
          display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px;
          border-radius: 999px; font-family: var(--font-mono); font-size: 11.5px; font-weight: 700;
        }
        .as-delta.is-up { color: var(--success); background: color-mix(in srgb, var(--success) 14%, transparent); }
        .as-delta.is-down { color: var(--danger); background: color-mix(in srgb, var(--danger) 14%, transparent); }
        .as-result-flow { display: flex; align-items: baseline; gap: 9px; margin-top: 6px; }
        .as-result-from {
          font-family: var(--font-mono); font-size: 20px; font-weight: 600;
          color: var(--text-muted); font-variant-numeric: tabular-nums;
        }
        .as-result-arrow { align-self: center; color: var(--text-muted); flex: none; }
        .as-result-to {
          font-family: var(--font-mono); font-size: 34px; font-weight: 700;
          line-height: 1; letter-spacing: -0.02em; color: var(--accent);
          font-variant-numeric: tabular-nums;
        }
        .as-result-unit { font-size: 13px; font-weight: 600; color: var(--text-muted); }
        .as-result-flag {
          margin-top: 8px; font-size: 11.5px; font-weight: 700; color: var(--accent);
          display: inline-flex; align-items: center;
        }

        /* Reason field */
        .as-field { display: flex; flex-direction: column; gap: 7px; }
        .as-field-label {
          font-size: 11px; font-weight: 700; letter-spacing: .04em; text-transform: uppercase;
          color: var(--text-medium);
        }
        .as-field-label em { font-style: normal; font-weight: 500; text-transform: none; color: var(--text-muted); letter-spacing: 0; }
        .as-field-input {
          width: 100%; padding: 10px 13px; border-radius: var(--radius-sm);
          border: 1px solid var(--border-strong); background: var(--card-bg);
          font-size: 13.5px; color: var(--text-dark); outline: none;
          transition: border-color .15s var(--ease), box-shadow .15s var(--ease);
        }
        .as-field-input::placeholder { color: var(--text-muted); }
        .as-field-input:focus {
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-tint);
        }

        /* Footer */
        .as-foot {
          display: flex; gap: 10px; padding: 16px 24px 20px;
          border-top: 1px solid var(--border-color); background: var(--surface-raised);
        }
        .as-btn {
          height: 44px; border-radius: var(--radius); font-size: 14px; font-weight: 700;
          letter-spacing: -0.01em; cursor: pointer; display: inline-flex; align-items: center;
          justify-content: center; gap: 8px; transition: transform .12s var(--ease),
            background .15s var(--ease), box-shadow .15s var(--ease), opacity .15s var(--ease);
        }
        .as-btn-ghost {
          flex: 0 0 auto; padding: 0 18px; border: 1px solid var(--border-strong);
          background: var(--card-bg); color: var(--text-medium);
        }
        .as-btn-ghost:hover { background: var(--surface-tint); }
        .as-btn-save {
          flex: 1; border: 0; color: #fff;
          background: linear-gradient(180deg, var(--primary-soft) 0%, var(--primary) 100%);
          box-shadow: 0 1px 0 rgba(255,255,255,.18) inset, 0 6px 16px -5px var(--primary-glow);
        }
        .as-btn-save:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 1px 0 rgba(255,255,255,.2) inset, 0 10px 22px -6px var(--primary-glow); }
        .as-btn-save:active:not(:disabled) { transform: translateY(0); }
        .as-btn-save:disabled { opacity: .5; cursor: default; box-shadow: none; }
      `}</style>
    </Dialog>
  );
}
