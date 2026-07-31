import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, AlertTriangle, TicketPercent, Plus, Pencil, Trash2, X, Link2, Check, Mail, Send, Users,
  Globe, Sparkles, Star, Layers,
} from 'lucide-react';
import { apiGet, apiPost, apiPatch, apiDelete } from '../../lib/api';
import { confirmDialog, alertDialog } from '../../components/ConfirmDialog';

const ALL_PLANS = ['free', 'advanced', 'premium', 'enterprise'] as const;

interface OfferCoupon {
  percentOff: number | null;
  amountOff: number | null;
  valid: boolean;
  timesRedeemed: number;
  maxRedemptions: number | null;
  redeemBy: number | null;
}
interface Offer {
  slug: string;
  stripeCouponId: string;
  description: string | null;
  newUsersOnly: boolean;
  allowedPlans: string[];
  active: boolean;
  validUntil: string | null;
  createdAt: string;
  expired: boolean;
  coupon: OfferCoupon | null;
}
interface OffersResponse {
  items: Offer[];
  summary: { total: number; active: number; redemptions: number };
}

const PAID_PLANS = ['advanced', 'premium'] as const;

function discountLabel(c: OfferCoupon | null): string {
  if (!c) return '—';
  if (c.percentOff) return `${c.percentOff}% off`;
  if (c.amountOff) return `$${(c.amountOff / 100).toFixed(2)} off`;
  return 'Discount';
}

export default function AdminOffers() {
  const [items, setItems] = useState<Offer[]>([]);
  const [summary, setSummary] = useState<OffersResponse['summary'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [busySlug, setBusySlug] = useState<string | null>(null);
  const [editing, setEditing] = useState<Offer | null>(null);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [campaignFor, setCampaignFor] = useState<Offer | null>(null);

  const reload = useCallback(() => setReloadKey(k => k + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet<OffersResponse>('/api/admin/offers')
      .then(data => { if (!cancelled) { setItems(data.items); setSummary(data.summary); } })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load offers'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [reloadKey]);

  const toggleActive = async (o: Offer) => {
    setBusySlug(o.slug);
    try {
      await apiPatch(`/api/admin/offers/${o.slug}`, { active: !o.active });
      reload();
    } catch (e) {
      void alertDialog({ title: 'Update failed', message: e instanceof Error ? e.message : 'Failed to update offer', tone: 'danger' });
    } finally {
      setBusySlug(null);
    }
  };

  const remove = async (o: Offer) => {
    if (!await confirmDialog({ title: 'Delete offer', message: `Delete offer "${o.slug}"? Existing Stripe redemptions are unaffected; the code just stops working.`, confirmText: 'Delete offer', tone: 'danger' })) return;
    setBusySlug(o.slug);
    try {
      await apiDelete(`/api/admin/offers/${o.slug}`);
      reload();
    } catch (e) {
      void alertDialog({ title: 'Delete failed', message: e instanceof Error ? e.message : 'Failed to delete offer', tone: 'danger' });
    } finally {
      setBusySlug(null);
    }
  };

  const copyLink = (slug: string) => {
    const url = `${window.location.origin}/?offer=${encodeURIComponent(slug)}`;
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(c => (c === slug ? null : c)), 1800);
    }).catch(() => { /* clipboard blocked — ignore */ });
  };

  return (
    <>
      {summary && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
          <SummaryChip label="Offers" value={summary.total} />
          <SummaryChip label="Active" value={summary.active} />
          <SummaryChip label="Redemptions" value={summary.redemptions} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '18px' }}>
        <button className="btn-primary" onClick={() => setCreating(true)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', padding: '9px 14px' }}>
          <Plus size={15} /> New offer
        </button>
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626' }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={15} className="spin" /> Loading…
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {items.map(o => {
            const busy = busySlug === o.slug;
            const inactive = !o.active || o.expired;
            return (
              <div key={o.slug} className="card" style={{ padding: '16px 20px', cursor: 'default', opacity: inactive ? 0.72 : 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '5px' }}>
                      <code style={{
                        fontSize: '13.5px', fontWeight: 700, background: 'var(--primary-light)', color: 'var(--primary)',
                        padding: '2px 9px', borderRadius: '6px', letterSpacing: '0.02em',
                      }}>{o.slug.toUpperCase()}</code>
                      <Badge color="#059669">{discountLabel(o.coupon)}</Badge>
                      {o.newUsersOnly && <Badge color="#294EA7">new users</Badge>}
                      {o.active && !o.expired && <Badge color="#059669" soft>active</Badge>}
                      {!o.active && <Badge color="#64748b" soft>paused</Badge>}
                      {o.expired && <Badge color="#d97706" soft>expired</Badge>}
                      {o.coupon === null && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: '#b91c1c' }}>
                          <AlertTriangle size={12} /> coupon missing in Stripe
                        </span>
                      )}
                      {o.coupon && !o.coupon.valid && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '11.5px', fontWeight: 600, color: '#d97706' }}>
                          <AlertTriangle size={12} /> coupon exhausted/expired in Stripe
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '13px', color: 'var(--text-medium)', marginBottom: '4px' }}>
                      {o.description || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>No description</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'flex', gap: '7px', flexWrap: 'wrap', alignItems: 'center' }}>
                      <span>Plans: <b>{o.allowedPlans.join(', ') || '—'}</b></span>
                      <span>·</span>
                      <span>Redeemed: <b>{o.coupon?.timesRedeemed ?? 0}{o.coupon?.maxRedemptions ? ` / ${o.coupon.maxRedemptions}` : ''}</b></span>
                      {o.validUntil && (<><span>·</span><span>Ends {new Date(o.validUntil).toLocaleDateString()}</span></>)}
                      <span>·</span>
                      <span>Coupon <code style={{ fontSize: '11px' }}>{o.stripeCouponId}</code></span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button className="btn-outline" disabled={busy} onClick={() => copyLink(o.slug)}
                      title="Copy shareable link" style={miniBtn}>
                      {copied === o.slug ? <><Check size={13} /> Copied</> : <><Link2 size={13} /> Link</>}
                    </button>
                    <button className="btn-outline" disabled={busy} onClick={() => setCampaignFor(o)}
                      title="Email this offer to users" style={miniBtn}>
                      <Mail size={13} /> Send
                    </button>
                    <button className="btn-outline" disabled={busy} onClick={() => toggleActive(o)} style={miniBtn}>
                      {o.active ? 'Pause' : 'Activate'}
                    </button>
                    <button className="btn-outline" disabled={busy} onClick={() => setEditing(o)} style={miniBtn}>
                      <Pencil size={13} /> Edit
                    </button>
                    <button className="btn-outline" disabled={busy} onClick={() => remove(o)}
                      style={{ ...miniBtn, borderColor: '#dc2626', color: '#dc2626' }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '50px 20px', color: 'var(--text-muted)' }}>
              <TicketPercent size={36} strokeWidth={1.4} />
              <p style={{ fontSize: '14px' }}>No promotional offers yet.</p>
              <button className="btn-primary" onClick={() => setCreating(true)} style={{ fontSize: '13px' }}>
                <Plus size={14} /> Create your first offer
              </button>
            </div>
          )}
        </div>
      )}

      {(creating || editing) && (
        <OfferModal
          offer={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={() => { setCreating(false); setEditing(null); reload(); }}
        />
      )}

      {campaignFor && (
        <CampaignModal offer={campaignFor} onClose={() => setCampaignFor(null)} />
      )}
    </>
  );
}

const miniBtn: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '7px 12px',
};

function Badge({ children, color, soft }: { children: React.ReactNode; color: string; soft?: boolean }) {
  return (
    <span style={{
      background: color + (soft ? '18' : '22'), color, fontSize: '11px', fontWeight: 700,
      padding: '2px 9px', borderRadius: '20px', border: `1px solid ${color}33`,
    }}>
      {children}
    </span>
  );
}

function SummaryChip({ label, value }: { label: string; value: number }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', padding: '8px 14px', borderRadius: '10px',
      background: 'var(--surface-raised)', border: '1px solid var(--border-color)', minWidth: '92px',
    }}>
      <span style={{ fontSize: '18px', fontWeight: 700 }}>{value}</span>
      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{label}</span>
    </div>
  );
}

// ISO → value for <input type="datetime-local"> (local time, no seconds/zone).
function isoToLocalInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function OfferModal({ offer, onClose, onSaved }: { offer: Offer | null; onClose: () => void; onSaved: () => void }) {
  const isEdit = !!offer;
  const [slug, setSlug] = useState(offer?.slug ?? '');
  const [stripeCouponId, setStripeCouponId] = useState(offer?.stripeCouponId ?? '');
  // Coupon source: new offers default to minting a Stripe coupon here; editing an
  // existing offer keeps its coupon id (coupon terms aren't editable after creation).
  const [couponMode, setCouponMode] = useState<'create' | 'existing'>(isEdit ? 'existing' : 'create');
  const [discountType, setDiscountType] = useState<'percent' | 'amount'>('percent');
  const [discountValue, setDiscountValue] = useState('');
  const [duration, setDuration] = useState<'once' | 'repeating' | 'forever'>('once');
  const [durationMonths, setDurationMonths] = useState('3');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [description, setDescription] = useState(offer?.description ?? '');
  const [newUsersOnly, setNewUsersOnly] = useState(offer?.newUsersOnly ?? true);
  const [allowedPlans, setAllowedPlans] = useState<string[]>(offer?.allowedPlans ?? [...PAID_PLANS]);
  const [active, setActive] = useState(offer?.active ?? true);
  const [validUntil, setValidUntil] = useState(isoToLocalInput(offer?.validUntil ?? null));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const togglePlan = (p: string) =>
    setAllowedPlans(prev => (prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]));

  const save = async () => {
    setErr('');
    if (!isEdit && !slug.trim()) { setErr('Slug is required.'); return; }
    if (allowedPlans.length === 0) { setErr('Select at least one plan.'); return; }

    // Build the coupon source: mint a new one, or reference an existing id.
    let couponFields: Record<string, unknown>;
    if (!isEdit && couponMode === 'create') {
      const val = parseFloat(discountValue);
      if (!val || val <= 0) { setErr('Enter a discount amount.'); return; }
      if (discountType === 'percent' && val > 100) { setErr('Percentage cannot exceed 100.'); return; }
      couponFields = {
        coupon: {
          ...(discountType === 'percent' ? { percentOff: val } : { amountOff: Math.round(val * 100) }),
          duration,
          ...(duration === 'repeating' ? { durationInMonths: parseInt(durationMonths) || 1 } : {}),
          ...(maxRedemptions.trim() ? { maxRedemptions: parseInt(maxRedemptions) } : {}),
        },
      };
    } else {
      if (!stripeCouponId.trim()) { setErr('Stripe coupon ID is required.'); return; }
      couponFields = { stripeCouponId: stripeCouponId.trim() };
    }

    setSaving(true);
    try {
      const body = {
        description: description.trim() || undefined,
        newUsersOnly,
        allowedPlans,
        active,
        validUntil: validUntil ? new Date(validUntil).toISOString() : null,
      };
      if (isEdit) {
        await apiPatch(`/api/admin/offers/${offer!.slug}`, { ...body, ...couponFields });
      } else {
        await apiPost('/api/admin/offers', { slug: slug.trim(), ...body, ...couponFields });
      }
      onSaved();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed to save offer');
      setSaving(false);
    }
  };

  const labelStyle: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' };
  const fieldGap: React.CSSProperties = { marginBottom: '14px' };

  return (
    <div className="modal-overlay" onClick={() => !saving && onClose()}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h2 style={{ margin: 0 }}>{isEdit ? `Edit offer` : 'New offer'}</h2>
          <button onClick={onClose} className="user-logout" title="Close" style={{ width: 30, height: 30 }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          The slug is the public code — it works both as a <code>?offer=</code> link and a typed promo code. The discount is created in Stripe for you.
        </p>

        <div style={fieldGap}>
          <label style={labelStyle}>Slug / code</label>
          <input className="input" value={slug} disabled={isEdit}
            onChange={e => setSlug(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
            placeholder="welcome30" style={{ width: '100%', opacity: isEdit ? 0.6 : 1 }} />
        </div>

        {isEdit ? (
          <div style={fieldGap}>
            <label style={labelStyle}>Stripe coupon</label>
            <input className="input" value={stripeCouponId} disabled
              style={{ width: '100%', opacity: 0.6 }} />
            <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
              Coupon terms can't be changed after creation. To change the discount, create a new offer.
            </span>
          </div>
        ) : (
          <div style={fieldGap}>
            <label style={labelStyle}>Discount</label>
            {couponMode === 'create' ? (
              <>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <input className="input" type="number" min="0" step="any" value={discountValue}
                    onChange={e => setDiscountValue(e.target.value)}
                    placeholder={discountType === 'percent' ? '30' : '10.00'} style={{ width: '110px' }} />
                  <select className="input" value={discountType}
                    onChange={e => setDiscountType(e.target.value as 'percent' | 'amount')} style={{ width: '120px' }}>
                    <option value="percent">% off</option>
                    <option value="amount">$ off</option>
                  </select>
                  <select className="input" value={duration}
                    onChange={e => setDuration(e.target.value as 'once' | 'repeating' | 'forever')} style={{ flex: 1 }}>
                    <option value="once">first payment</option>
                    <option value="repeating">first N months</option>
                    <option value="forever">forever</option>
                  </select>
                </div>
                {duration === 'repeating' && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '13px', color: 'var(--text-medium)' }}>for</span>
                    <input className="input" type="number" min="1" max="36" value={durationMonths}
                      onChange={e => setDurationMonths(e.target.value)} style={{ width: '70px' }} />
                    <span style={{ fontSize: '13px', color: 'var(--text-medium)' }}>months</span>
                  </div>
                )}
                <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input className="input" type="number" min="1" value={maxRedemptions}
                    onChange={e => setMaxRedemptions(e.target.value)}
                    placeholder="unlimited" style={{ width: '120px' }} />
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>max redemptions (optional)</span>
                </div>
                <button type="button" onClick={() => setCouponMode('existing')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', padding: '8px 0 0', textAlign: 'left' }}>
                  Use an existing Stripe coupon ID instead
                </button>
              </>
            ) : (
              <>
                <input className="input" value={stripeCouponId} onChange={e => setStripeCouponId(e.target.value)}
                  placeholder="e.g. welcome30 (existing Stripe coupon)" style={{ width: '100%' }} />
                <button type="button" onClick={() => setCouponMode('create')}
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '12px', cursor: 'pointer', padding: '8px 0 0', textAlign: 'left' }}>
                  Create a new coupon instead
                </button>
              </>
            )}
          </div>
        )}

        <div style={fieldGap}>
          <label style={labelStyle}>Description (shown to customers)</label>
          <input className="input" value={description} onChange={e => setDescription(e.target.value)}
            placeholder="30% off your first plan" maxLength={200} style={{ width: '100%' }} />
        </div>

        <div style={fieldGap}>
          <label style={labelStyle}>Applies to plans</label>
          <div style={{ display: 'flex', gap: '16px' }}>
            {PAID_PLANS.map(p => (
              <label key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>
                <input type="checkbox" checked={allowedPlans.includes(p)} onChange={() => togglePlan(p)} />
                {p}
              </label>
            ))}
          </div>
        </div>

        <div style={fieldGap}>
          <label style={labelStyle}>Ends (optional)</label>
          <input className="input" type="datetime-local" value={validUntil}
            onChange={e => setValidUntil(e.target.value)} style={{ width: '100%' }} />
          <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
            App-side cutoff. Stripe's own redemption cap / expiry (set on the coupon) also applies.
          </span>
        </div>

        <div style={{ display: 'flex', gap: '18px', ...fieldGap }}>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={newUsersOnly} onChange={e => setNewUsersOnly(e.target.checked)} />
            New customers only
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontSize: '13px', cursor: 'pointer' }}>
            <input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} />
            Active
          </label>
        </div>

        {err && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', marginTop: '4px', fontSize: '13px', color: '#dc2626' }}>
            {err}
          </div>
        )}

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create offer'}
          </button>
        </div>
      </div>
    </div>
  );
}

type Audience = 'new_users' | 'existing_subscribers' | 'plan' | 'everyone';
type Scope = 'all_users' | 'team_owners';
interface PreviewResult { count: number; capped: boolean; sendCap: number; sample: string[] }
interface SendResult { matched: number; sent: number; failed: number; capped: boolean }

const AUDIENCE_LABELS: { key: Audience; label: string; hint: string; icon: typeof Users }[] = [
  { key: 'everyone', label: 'Everyone', hint: 'No segmentation — the widest reach', icon: Globe },
  { key: 'new_users', label: 'New / never-subscribed', hint: 'Free plan, no Stripe history', icon: Sparkles },
  { key: 'existing_subscribers', label: 'Existing / past subscribers', hint: 'Currently or previously on a paid plan', icon: Star },
  { key: 'plan', label: 'By plan tier', hint: 'People on a specific plan', icon: Layers },
];

const SCOPE_OPTIONS: { key: Scope; label: string; hint: string }[] = [
  { key: 'all_users', label: 'Every individual user', hint: 'All members — a 5-person team gets 5 emails' },
  { key: 'team_owners', label: 'One contact per team', hint: 'Just the account owner — a 5-person team gets 1 email' },
];

// Compose + send a promo-code campaign email to a targeted audience.
function CampaignModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  const [audience, setAudience] = useState<Audience>('everyone');
  const [scope, setScope] = useState<Scope>('all_users');
  const [plan, setPlan] = useState<string>('advanced');
  const [signupFrom, setSignupFrom] = useState('');
  const [signupTo, setSignupTo] = useState('');
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [busy, setBusy] = useState<'preview' | 'send' | null>(null);
  const [result, setResult] = useState<SendResult | null>(null);
  const [err, setErr] = useState('');

  const buildBody = () => ({
    audience,
    scope,
    ...(audience === 'plan' ? { plan } : {}),
    ...(signupFrom ? { signupFrom: new Date(signupFrom).toISOString() } : {}),
    ...(signupTo ? { signupTo: new Date(signupTo).toISOString() } : {}),
  });

  // Any change to targeting invalidates a stale preview/result.
  const resetPreview = () => { setPreview(null); setResult(null); };

  const doPreview = async () => {
    setBusy('preview'); setErr(''); setResult(null);
    try {
      const r = await apiPost<PreviewResult>(`/api/admin/offers/${offer.slug}/preview-audience`, buildBody());
      setPreview(r);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to preview'); }
    finally { setBusy(null); }
  };

  const doSend = async () => {
    const n = preview?.count ?? 0;
    if (!await confirmDialog({ title: 'Send offer', message: `Send offer "${offer.slug.toUpperCase()}" to ${n} recipient${n === 1 ? '' : 's'}? This emails them the promo code.`, confirmText: 'Send emails' })) return;
    setBusy('send'); setErr('');
    try {
      const r = await apiPost<SendResult>(`/api/admin/offers/${offer.slug}/send`, buildBody());
      setResult(r); setPreview(null);
    } catch (e) { setErr(e instanceof Error ? e.message : 'Failed to send'); }
    finally { setBusy(null); }
  };

  const sectionLabel: React.CSSProperties = { display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '7px' };
  // Selectable card used for both the recipient-scope and audience pickers.
  const optionCard = (active: boolean): React.CSSProperties => ({
    textAlign: 'left', padding: '11px 12px', borderRadius: '10px', cursor: 'pointer',
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
    background: active ? 'var(--primary-light)' : 'var(--card-bg)',
    transition: 'border-color 0.15s, background 0.15s',
    flex: 1,
  });

  return (
    <div className="modal-overlay" onClick={() => !busy && onClose()}>
      <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
          <h2 style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Send size={18} /> Send offer
          </h2>
          <button onClick={onClose} className="user-logout" title="Close" style={{ width: 30, height: 30 }}><X size={16} /></button>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
          Email the code <code style={{ color: 'var(--primary)', fontWeight: 700 }}>{offer.slug.toUpperCase()}</code> to your users. We always skip anyone who unsubscribed and never email the same person this offer twice.
        </p>

        <label style={sectionLabel}>Recipients</label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '18px' }}>
          {SCOPE_OPTIONS.map(s => {
            const active = scope === s.key;
            return (
              <button key={s.key} type="button" onClick={() => { setScope(s.key); resetPreview(); }} style={optionCard(active)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  {active
                    ? <Check size={15} color="var(--primary)" strokeWidth={3} />
                    : <span style={{ width: 15, height: 15, borderRadius: '50%', border: '1.5px solid var(--border-strong)', display: 'inline-block' }} />}
                  <span style={{ fontSize: '13px', fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text-dark)' }}>{s.label}</span>
                </span>
                <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{s.hint}</span>
              </button>
            );
          })}
        </div>

        <label style={sectionLabel}>Audience</label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
          {AUDIENCE_LABELS.map(a => {
            const A = a.icon;
            const active = audience === a.key;
            return (
              <button key={a.key} type="button" onClick={() => { setAudience(a.key); resetPreview(); }} style={optionCard(active)}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <A size={15} color={active ? 'var(--primary)' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '13px', fontWeight: 700, color: active ? 'var(--primary)' : 'var(--text-dark)' }}>{a.label}</span>
                </span>
                <span style={{ display: 'block', fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>{a.hint}</span>
              </button>
            );
          })}
        </div>

        {audience === 'plan' && (
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>Plan</label>
            <select className="input" value={plan} onChange={e => { setPlan(e.target.value); resetPreview(); }} style={{ width: '100%', textTransform: 'capitalize' }}>
              {ALL_PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px', marginBottom: '16px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '5px' }}>Signed up after (optional)</label>
            <input className="input" type="date" value={signupFrom} onChange={e => { setSignupFrom(e.target.value); resetPreview(); }} style={{ width: '100%' }} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, marginBottom: '5px' }}>Before (optional)</label>
            <input className="input" type="date" value={signupTo} onChange={e => { setSignupTo(e.target.value); resetPreview(); }} style={{ width: '100%' }} />
          </div>
        </div>

        {preview && !result && (
          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '11px 14px', marginBottom: '14px', fontSize: '13px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 600, color: 'var(--primary)' }}>
              <Users size={14} /> {preview.count} recipient{preview.count === 1 ? '' : 's'}
            </div>
            {preview.sample.length > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                e.g. {preview.sample.join(', ')}{preview.count > preview.sample.length ? '…' : ''}
              </div>
            )}
            {preview.capped && (
              <div style={{ fontSize: '12px', color: '#d97706', marginTop: '4px' }}>
                Only the first {preview.sendCap} will be emailed per send.
              </div>
            )}
            {preview.count === 0 && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>
                No one matches (or all matches were already emailed this offer).
              </div>
            )}
          </div>
        )}

        {busy === 'send' && (
          <div style={{ background: 'var(--primary-light)', border: '1px solid var(--primary)', borderRadius: '8px', padding: '11px 14px', marginBottom: '14px', fontSize: '13px', color: 'var(--primary)' }}>
            <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <Loader2 size={14} className="spin" /> Sending {preview?.count ? `to ${preview.count} recipient${preview.count === 1 ? '' : 's'}` : 'emails'}…
            </div>
            <div style={{ marginTop: '4px', color: 'var(--text-muted)' }}>
              Emails go out one at a time, so this can take a moment for large audiences. Please keep this window open.
            </div>
          </div>
        )}

        {result && (
          <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: '8px', padding: '11px 14px', marginBottom: '14px', fontSize: '13px', color: '#166534' }}>
            <div style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '7px' }}><Check size={14} /> Campaign sent</div>
            <div style={{ marginTop: '4px' }}>{result.sent} sent · {result.failed} failed · {result.matched} matched</div>
          </div>
        )}

        {err && (
          <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', marginBottom: '14px', fontSize: '13px', color: '#dc2626' }}>
            {err}
          </div>
        )}

        <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginBottom: '14px', display: 'flex', gap: '6px' }}>
          <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: '1px' }} />
          Emails send from the configured mail domain. If the domain isn't verified in Resend yet, delivery is limited to your own verified address.
        </div>

        <div className="modal-actions">
          <button className="btn-outline" onClick={onClose} disabled={!!busy}>Close</button>
          <button className="btn-outline" onClick={doPreview} disabled={!!busy}>
            {busy === 'preview' ? <><Loader2 size={13} className="spin" /> Checking…</> : <><Users size={14} /> Preview</>}
          </button>
          <button className="btn-primary" onClick={doSend} disabled={!!busy || !preview || preview.count === 0}
            title={!preview ? 'Preview the audience first' : ''}>
            {busy === 'send' ? <><Loader2 size={13} className="spin" /> Sending…</> : <><Send size={14} /> Send email</>}
          </button>
        </div>
      </div>
    </div>
  );
}
