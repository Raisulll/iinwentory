import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkflows } from '../store/useWorkflowStore';
import { useStore } from '../store/useStore';
import { useTeam } from '../store/useTeamStore';
import { useAuth } from '../store/useAuthStore';
import type { PickList, PickListItemRow, PickIssueType } from '../types';
import {
  ScanLine, ArrowLeft, Hash, Package, Check, AlertTriangle, X, Search,
  ChevronRight, Lock, CheckCircle2,
} from 'lucide-react';
import HelpButton from '../components/HelpButton';

const ISSUE_LABELS: Record<PickIssueType, string> = {
  damaged_stock: 'Damaged stock',
  missing_unit: 'Missing unit',
  wrong_stock_at_location: 'Wrong stock at location',
  barcode_mismatch: 'Barcode mismatch',
  other: 'Other',
};

export default function PickMode() {
  const wf = useWorkflows();
  const store = useStore();
  const { members } = useTeam();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [codeInput, setCodeInput] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [skuInput, setSkuInput] = useState('');
  const [issueModalFor, setIssueModalFor] = useState<{ plItemId: string; itemName: string } | null>(null);
  const skuRef = useRef<HTMLInputElement>(null);

  const isClient = members.find(m => m.id === user?.id)?.role === 'client';
  const active = activeId ? wf.getPickListById(activeId) : null;

  const readyLists = wf.pickLists.filter(p => p.status === 'ready');

  // Refresh state on entry
  useEffect(() => {
    void wf.refreshPickLists();
    void wf.refreshReservations();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadByCode = useCallback(async (raw: string) => {
    const code = raw.trim().toUpperCase();
    if (!code) return;
    setWorking(true); setError(null);
    try {
      const pl = await wf.fetchPickListByCode(code);
      if (pl.status !== 'ready') {
        setError(`Pick list "${pl.name}" is in ${pl.status} state — only ready lists are pickable.`);
        setActiveId(null);
      } else {
        setActiveId(pl.id);
        setCodeInput('');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pick list not found');
      setActiveId(null);
    } finally { setWorking(false); }
  }, [wf]);

  const findItemBySku = useCallback((sku: string): PickListItemRow | null => {
    if (!active) return null;
    const cleaned = sku.trim().toLowerCase();
    if (!cleaned) return null;
    for (const pi of active.items) {
      const item = store.getItemById(pi.itemId);
      if (!item) continue;
      const skuMatch = (item.sku ?? '').toLowerCase() === cleaned;
      const idMatch = item.id.toLowerCase() === cleaned;
      const nameMatch = item.name.toLowerCase() === cleaned;
      if (skuMatch || idMatch || nameMatch) return pi;
    }
    return null;
  }, [active, store]);

  const pickOne = async (pi: PickListItemRow, qty = 1) => {
    if (!active) return;
    if (isClient) { setError('Clients cannot pick.'); return; }
    const remaining = pi.requestedQty - pi.pickedQty;
    if (remaining <= 0) { setError('Already fully picked.'); return; }
    const realQty = Math.min(qty, remaining);
    setWorking(true); setError(null);
    try {
      await wf.pickItem(active.id, pi.itemId, realQty);
      setSkuInput('');
      skuRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Pick failed');
    } finally { setWorking(false); }
  };

  const handleSkuSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const found = findItemBySku(skuInput);
    if (!found) {
      setError(`No matching item in this pick list for "${skuInput}"`);
      return;
    }
    await pickOne(found, 1);
  };

  const handleComplete = async () => {
    if (!active) return;
    if (!confirm('Complete this pick list?')) return;
    setWorking(true);
    try {
      await wf.completePickList(active.id);
      setActiveId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Complete failed');
    } finally { setWorking(false); }
  };

  const allDone = active ? active.items.every(i => i.pickedQty >= i.requestedQty) : false;

  return (
    <div style={{ flex: 1, padding: '24px', overflowY: 'auto', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <button className="btn-outline" onClick={() => navigate('/workflows')} style={{ padding: '7px 12px', fontSize: '13px' }}>
          <ArrowLeft size={14} /> Workflows
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ScanLine size={20} />
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>Pick Mode</h1>
          <HelpButton topic="pick-mode" size={16} />
        </div>
        <div style={{ width: '120px' }} />
      </div>

      {!active ? (
        <>
          <div className="card" style={{ padding: '20px', marginBottom: '20px', cursor: 'default' }}>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Enter pick list code</h2>
            <form onSubmit={(e) => { e.preventDefault(); void loadByCode(codeInput); }} style={{ display: 'flex', gap: '8px' }}>
              <input className="input" value={codeInput} onChange={e => setCodeInput(e.target.value.toUpperCase())}
                placeholder="PL-XXXXXX" autoFocus
                style={{ flex: 1, fontFamily: 'monospace', textTransform: 'uppercase' }} />
              <button className="btn-primary" disabled={!codeInput.trim() || working}>
                <Hash size={14} /> Open
              </button>
            </form>
            {error && <div style={{ color: 'var(--danger)', fontSize: '13px', marginTop: '10px' }}>{error}</div>}
          </div>

          <div>
            <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: 'var(--text-muted)' }}>
              Or pick from ready lists ({readyLists.length})
            </h2>
            {readyLists.length === 0 ? (
              <div className="empty-state"><Package size={36} /><p>No ready pick lists.</p><p>Mark a draft list as ready first.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {readyLists.map(pl => (
                  <button key={pl.id} className="card" onClick={() => setActiveId(pl.id)}
                    style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', textAlign: 'left' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '15px', marginBottom: '4px' }}>{pl.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '8px' }}>
                        <Hash size={11} style={{ alignSelf: 'center' }} /> {pl.code}
                        <span>·</span>
                        <span>{pl.items.length} lines</span>
                        <span>·</span>
                        <span>{pl.items.reduce((a, i) => a + (i.requestedQty - i.pickedQty), 0)} units to pick</span>
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <PickModeActive
          pl={active}
          isClient={isClient}
          working={working}
          allDone={allDone}
          error={error}
          skuInput={skuInput}
          setSkuInput={setSkuInput}
          skuRef={skuRef}
          onPick={pickOne}
          onSkuSubmit={handleSkuSubmit}
          onClose={() => { setActiveId(null); setError(null); setSkuInput(''); }}
          onComplete={handleComplete}
          onIssue={(plItemId, itemName) => setIssueModalFor({ plItemId, itemName })}
          getItemName={(id) => store.getItemById(id)?.name ?? '(deleted)'}
          getItemSku={(id) => store.getItemById(id)?.sku ?? null}
          getItemUnit={(id) => store.getItemById(id)?.unit ?? 'units'}
          getItemLocation={(id) => store.getItemById(id)?.location ?? null}
        />
      )}

      {issueModalFor && active && (
        <PickModeIssueModal
          itemName={issueModalFor.itemName}
          onClose={() => setIssueModalFor(null)}
          onSubmit={async (body) => {
            try {
              await wf.reportIssue(active.id, issueModalFor.plItemId, body);
              setIssueModalFor(null);
            } catch (e) {
              alert(e instanceof Error ? e.message : 'Report failed');
            }
          }}
        />
      )}
    </div>
  );
}

interface PickModeActiveProps {
  pl: PickList;
  isClient: boolean;
  working: boolean;
  allDone: boolean;
  error: string | null;
  skuInput: string;
  setSkuInput: (v: string) => void;
  skuRef: React.RefObject<HTMLInputElement | null>;
  onPick: (pi: PickListItemRow, qty: number) => Promise<void>;
  onSkuSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  onComplete: () => void;
  onIssue: (plItemId: string, itemName: string) => void;
  getItemName: (id: string) => string;
  getItemSku: (id: string) => string | null;
  getItemUnit: (id: string) => string;
  getItemLocation: (id: string) => string | null;
}

function PickModeActive({
  pl, isClient, working, allDone, error,
  skuInput, setSkuInput, skuRef,
  onPick, onSkuSubmit, onClose, onComplete, onIssue,
  getItemName, getItemSku, getItemUnit, getItemLocation,
}: PickModeActiveProps) {
  const sortedItems = [...pl.items].sort((a, b) => {
    // unfinished first
    const aDone = a.pickedQty >= a.requestedQty ? 1 : 0;
    const bDone = b.pickedQty >= b.requestedQty ? 1 : 0;
    if (aDone !== bDone) return aDone - bDone;
    return a.sortOrder - b.sortOrder;
  });

  const totalRequested = pl.items.reduce((a, i) => a + i.requestedQty, 0);
  const totalPicked = pl.items.reduce((a, i) => a + i.pickedQty, 0);
  const pct = totalRequested > 0 ? Math.round((totalPicked / totalRequested) * 100) : 0;

  return (
    <>
      <div className="card" style={{ padding: '16px 20px', marginBottom: '16px', cursor: 'default' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>{pl.name}</h2>
              <span style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--primary)', fontWeight: 600 }}>
                <Hash size={11} style={{ display: 'inline' }} /> {pl.code}
              </span>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
              {totalPicked} / {totalRequested} units picked · {pct}%
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {!isClient && allDone && (
              <button className="btn-primary" onClick={onComplete} disabled={working} style={{ background: '#22c55e', padding: '8px 14px', fontSize: '13px' }}>
                <CheckCircle2 size={14} /> Complete
              </button>
            )}
            <button className="btn-outline" onClick={onClose} style={{ padding: '7px 12px', fontSize: '13px' }}>
              <X size={14} /> Close
            </button>
          </div>
        </div>
        <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{ height: '100%', background: '#22c55e', width: `${pct}%`, transition: 'width 0.3s' }} />
        </div>
      </div>

      {!isClient && (
        <form onSubmit={onSkuSubmit} className="card" style={{ padding: '16px 20px', marginBottom: '16px', cursor: 'default' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>Scan or enter SKU / item ID</label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input ref={skuRef} className="input" autoFocus value={skuInput}
              onChange={e => setSkuInput(e.target.value)}
              placeholder="Scan barcode or type SKU..." disabled={working || allDone}
              style={{ flex: 1, fontFamily: 'monospace' }} />
            <button className="btn-primary" disabled={!skuInput.trim() || working || allDone}>
              <Check size={14} /> Pick 1
            </button>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
            Tip: barcode scanners send `Enter` after the code — pick happens automatically.
          </p>
        </form>
      )}

      {isClient && (
        <div style={{ background: 'var(--surface-raised)', padding: '12px 16px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Lock size={14} /> Client role: view only.
        </div>
      )}

      {error && <div style={{ background: '#fef2f2', color: '#b91c1c', padding: '10px 14px', borderRadius: '8px', marginBottom: '12px', fontSize: '13px' }}>{error}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedItems.map(pi => {
          const remaining = pi.requestedQty - pi.pickedQty;
          const done = remaining <= 0;
          const sku = getItemSku(pi.itemId);
          const loc = getItemLocation(pi.itemId);
          const unit = getItemUnit(pi.itemId);
          return (
            <div key={pi.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto', gap: '12px',
              padding: '14px 18px', borderRadius: '10px',
              background: done ? 'rgba(34, 197, 94, 0.10)' : 'var(--card-bg)',
              border: `1px solid ${done ? '#bbf7d0' : 'var(--border-color)'}`,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Package size={14} color={done ? '#22c55e' : 'var(--text-muted)'} />
                  <span style={{ fontWeight: 600, fontSize: '15px' }}>{getItemName(pi.itemId)}</span>
                  {sku && <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SKU {sku}</span>}
                  {loc && <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@ {loc}</span>}
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                  Picked <b style={{ color: done ? '#22c55e' : 'var(--text-dark)' }}>{pi.pickedQty}</b> / {pi.requestedQty} {unit}
                  {pi.locationHint && <> · <span style={{ color: '#3b82f6' }}>{pi.locationHint}</span></>}
                </div>
              </div>
              {!isClient && !done && (
                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                  <button className="btn-primary" onClick={() => onPick(pi, 1)} disabled={working} style={{ padding: '6px 14px', fontSize: '13px' }}>
                    <Check size={13} /> +1
                  </button>
                  <button className="btn-outline" onClick={() => onPick(pi, remaining)} disabled={working} style={{ padding: '6px 12px', fontSize: '12px' }}>
                    Pick all ({remaining})
                  </button>
                  <button onClick={() => onIssue(pi.id, getItemName(pi.itemId))} title="Report issue"
                    style={{ background: '#fef2f2', color: '#b91c1c', borderRadius: '6px', padding: '6px 10px', fontSize: '12px', fontWeight: 600 }}>
                    <AlertTriangle size={12} />
                  </button>
                </div>
              )}
              {done && (
                <span style={{ alignSelf: 'center', color: '#22c55e', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Check size={14} /> Done
                </span>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

function PickModeIssueModal({ itemName, onClose, onSubmit }: {
  itemName: string;
  onClose: () => void;
  onSubmit: (body: { issueType: PickIssueType; quantityAffected: number; quantityActuallyPicked: number; notes: string | null; adjustItemQuantity: boolean }) => Promise<void>;
}) {
  const [issueType, setIssueType] = useState<PickIssueType>('damaged_stock');
  const [qtyAffected, setQtyAffected] = useState('1');
  const [qtyActuallyPicked, setQtyActuallyPicked] = useState('0');
  const [notes, setNotes] = useState('');
  const [adjust, setAdjust] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    await onSubmit({
      issueType,
      quantityAffected: parseInt(qtyAffected) || 0,
      quantityActuallyPicked: parseInt(qtyActuallyPicked) || 0,
      notes: notes.trim() || null,
      adjustItemQuantity: adjust,
    });
    setSubmitting(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '18px' }}>Issue — {itemName}</h2>
          <button onClick={onClose}><X size={20} color="var(--text-muted)" /></button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Issue Type</label>
            <select className="input" value={issueType} onChange={e => setIssueType(e.target.value as PickIssueType)}>
              {(Object.keys(ISSUE_LABELS) as PickIssueType[]).map(k => (
                <option key={k} value={k}>{ISSUE_LABELS[k]}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Qty affected</label>
              <input type="number" className="input" min={0} value={qtyAffected} onChange={e => setQtyAffected(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Qty actually picked</label>
              <input type="number" className="input" min={0} value={qtyActuallyPicked} onChange={e => setQtyActuallyPicked(e.target.value)} />
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Notes</label>
            <textarea className="input" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Describe the issue..." style={{ resize: 'vertical' }} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={adjust} onChange={e => setAdjust(e.target.checked)} />
            Subtract <b>{qtyAffected || 0}</b> from inventory (audit transaction)
          </label>
        </div>
        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={submit} disabled={submitting} style={{ background: '#b91c1c' }}>
            <AlertTriangle size={14} /> Report
          </button>
        </div>
      </div>
    </div>
  );
}

// Avoid unused-import warning for Search icon while keeping bundle lean.
void Search;
