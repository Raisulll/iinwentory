import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../store/useAuthStore';
import { apiPost, apiPut } from '../lib/api';
import { PLANS, type PlanId } from '../plans';
import {
  User as UserIcon, Building2, Factory, ShoppingBag, Stethoscope,
  HardHat, Truck, Cpu, GraduationCap, Landmark, Heart, Sparkles,
  Boxes, ClipboardList, BarChart3, ShieldCheck, Compass,
  ArrowLeft, ArrowRight, Check, Loader2, Package, Tag,
} from 'lucide-react';

interface OnboardingData {
  name: string;
  companyName: string;
  industry: string;
  usage: string[];
  planId: PlanId;
  billingCycle: 'monthly' | 'yearly';
}

const INDUSTRIES: ReadonlyArray<{ id: string; label: string; icon: typeof Building2 }> = [
  { id: 'retail',        label: 'Retail & E-commerce', icon: ShoppingBag },
  { id: 'manufacturing', label: 'Manufacturing',       icon: Factory },
  { id: 'hospitality',   label: 'Hospitality & Food',  icon: Building2 },
  { id: 'healthcare',    label: 'Healthcare',          icon: Stethoscope },
  { id: 'construction',  label: 'Construction',        icon: HardHat },
  { id: 'logistics',     label: 'Logistics & Warehousing', icon: Truck },
  { id: 'tech',          label: 'IT & Software',       icon: Cpu },
  { id: 'education',     label: 'Education',           icon: GraduationCap },
  { id: 'government',    label: 'Government',          icon: Landmark },
  { id: 'nonprofit',     label: 'Nonprofit',           icon: Heart },
  { id: 'personal',      label: 'Personal use',        icon: UserIcon },
  { id: 'other',         label: 'Something else',      icon: Building2 },
];

const USAGE_OPTIONS: ReadonlyArray<{ id: string; label: string; desc: string; icon: typeof Boxes }> = [
  { id: 'track_personal', label: 'Track personal stuff',   desc: 'Tools, gear, collections, household.',         icon: Package },
  { id: 'business_stock', label: 'Manage business stock',  desc: 'Inventory across one or many locations.',       icon: Boxes },
  { id: 'pick_dispatch',  label: 'Pick & dispatch orders', desc: 'Pick lists, fulfilment, warehouse flow.',        icon: ClipboardList },
  { id: 'asset_mgmt',     label: 'Asset management',       desc: 'Equipment, check-in/check-out, ownership.',     icon: Tag },
  { id: 'audit',          label: 'Audit & compliance',     desc: 'Activity history, transactions, reporting.',   icon: ShieldCheck },
  { id: 'reports',        label: 'Reports & analytics',    desc: 'Stock valuation, low-stock alerts, trends.',   icon: BarChart3 },
  { id: 'exploring',      label: 'Just exploring',         desc: 'No pressure — kick the tyres.',                 icon: Compass },
];

const PLAN_ORDER: PlanId[] = ['free', 'advanced', 'ultra', 'premium'];

interface PlanState { planId: PlanId; inviteCode?: string }

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, org } = useAuth();
  const presetPlan = (location.state as PlanState | null)?.planId;

  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>({
    name: user?.name ?? '',
    companyName: org?.name && !/^.+'s Team$/.test(org.name) ? org.name : '',
    industry: '',
    usage: [],
    planId: presetPlan ?? org?.planId ?? 'free',
    billingCycle: 'yearly',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If user is already onboarded and lands here, bounce away.
  useEffect(() => {
    if (localStorage.getItem('iinw_onboarded') === '1' && step === 0) {
      navigate('/dashboard', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const total = 4;
  const progress = ((step + 1) / total) * 100;

  const canContinue = useMemo(() => {
    if (step === 0) return data.name.trim().length > 0;
    if (step === 1) return data.companyName.trim().length > 0 && data.industry.length > 0;
    if (step === 2) return data.usage.length > 0;
    return true;
  }, [step, data]);

  const next = () => setStep(s => Math.min(total - 1, s + 1));
  const back = () => setStep(s => Math.max(0, s - 1));

  const toggleUsage = (id: string) => {
    setData(d => ({
      ...d,
      usage: d.usage.includes(id) ? d.usage.filter(u => u !== id) : [...d.usage, id],
    }));
  };

  const finish = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Persist what the server already understands: company name → team name,
      // user's preferred display name → profile.full_name.
      await apiPut('/api/org', {
        orgName: data.companyName.trim() || (org?.name ?? 'My Workspace'),
        userName: data.name.trim(),
      });
      // Industry + usage have no server endpoint yet; keep client-side until
      // a profile metadata column lands.
      localStorage.setItem('iinw_onboarding', JSON.stringify({
        industry: data.industry,
        usage: data.usage,
        finishedAt: new Date().toISOString(),
      }));
      localStorage.setItem('iinw_onboarded', '1');

      // Paid plan? → Stripe checkout. Free? → dashboard.
      if (data.planId !== 'free') {
        try {
          const checkout = await apiPost<{ url: string }>('/api/billing/checkout', {
            planId: data.planId,
            billing: data.billingCycle,
          });
          if (checkout?.url) {
            window.location.href = checkout.url;
            return;
          }
        } catch {
          // Checkout failed — still let them in; they can upgrade from Settings.
        }
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your details. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const skip = () => {
    localStorage.setItem('iinw_onboarded', '1');
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="ob-shell">
      <header className="ob-header">
        <div className="ob-brand">
          <img src="/imperial-trends-logo.png" alt="" className="ob-brand-mark" />
          <span className="ob-brand-name">iinwentory</span>
        </div>
        <button className="ob-skip" onClick={skip} type="button">Skip for now</button>
      </header>

      <div className="ob-progress">
        <div className="ob-progress-bar" style={{ width: progress + '%' }} />
      </div>

      <main className="ob-main">
        <div className={`ob-stage ob-stage-${step}`}>
          {step === 0 && (
            <section className="ob-step">
              <span className="ob-eyebrow"><Sparkles size={11} strokeWidth={2.4} /> Welcome</span>
              <h1 className="ob-title">First — what should we call you?</h1>
              <p className="ob-sub">We'll use this in activity, notifications, and on shared pick lists.</p>
              <div className="ob-field">
                <label className="ob-label">Your name</label>
                <input
                  className="ob-input"
                  value={data.name}
                  onChange={e => setData(d => ({ ...d, name: e.target.value }))}
                  placeholder="e.g. Ditesh Patel"
                  autoFocus
                />
              </div>
            </section>
          )}

          {step === 1 && (
            <section className="ob-step">
              <span className="ob-eyebrow"><Building2 size={11} strokeWidth={2.4} /> About you</span>
              <h1 className="ob-title">Tell us about your business.</h1>
              <p className="ob-sub">This sets your workspace name and helps us tune suggestions to your sector.</p>

              <div className="ob-field">
                <label className="ob-label">Company / workspace name</label>
                <input
                  className="ob-input"
                  value={data.companyName}
                  onChange={e => setData(d => ({ ...d, companyName: e.target.value }))}
                  placeholder="e.g. Imperial Trends Ltd."
                  autoFocus
                />
              </div>

              <div className="ob-field">
                <label className="ob-label">Industry</label>
                <div className="ob-industry-grid">
                  {INDUSTRIES.map(ind => {
                    const Icon = ind.icon;
                    const active = data.industry === ind.id;
                    return (
                      <button
                        key={ind.id}
                        type="button"
                        className={`ob-industry-card${active ? ' is-active' : ''}`}
                        onClick={() => setData(d => ({ ...d, industry: ind.id }))}
                      >
                        <Icon size={16} strokeWidth={1.85} />
                        <span>{ind.label}</span>
                        {active && <Check size={13} strokeWidth={2.6} className="ob-industry-tick" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="ob-step">
              <span className="ob-eyebrow"><Boxes size={11} strokeWidth={2.4} /> How you'll use it</span>
              <h1 className="ob-title">What will iinwentory do for you?</h1>
              <p className="ob-sub">Pick all that apply. We'll highlight the relevant features first.</p>

              <div className="ob-usage-grid">
                {USAGE_OPTIONS.map(opt => {
                  const Icon = opt.icon;
                  const active = data.usage.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      className={`ob-usage-card${active ? ' is-active' : ''}`}
                      onClick={() => toggleUsage(opt.id)}
                    >
                      <span className="ob-usage-icon"><Icon size={18} strokeWidth={1.85} /></span>
                      <span className="ob-usage-text">
                        <span className="ob-usage-label">{opt.label}</span>
                        <span className="ob-usage-desc">{opt.desc}</span>
                      </span>
                      <span className={`ob-checkbox${active ? ' is-active' : ''}`}>
                        {active && <Check size={11} strokeWidth={3} />}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="ob-step ob-step-plans">
              <span className="ob-eyebrow"><Sparkles size={11} strokeWidth={2.4} /> Choose your plan</span>
              <h1 className="ob-title">Pick a tier — change it anytime.</h1>
              <p className="ob-sub">Start on Free, or unlock more items and users with a paid plan. Cancel any time.</p>

              <div className="ob-cycle">
                <button
                  type="button"
                  className={`ob-cycle-btn${data.billingCycle === 'monthly' ? ' is-active' : ''}`}
                  onClick={() => setData(d => ({ ...d, billingCycle: 'monthly' }))}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  className={`ob-cycle-btn${data.billingCycle === 'yearly' ? ' is-active' : ''}`}
                  onClick={() => setData(d => ({ ...d, billingCycle: 'yearly' }))}
                >
                  Yearly <span className="ob-cycle-save">save 50%</span>
                </button>
              </div>

              <div className="ob-plan-grid">
                {PLAN_ORDER.map(pid => {
                  const p = PLANS[pid];
                  const active = data.planId === pid;
                  const price = data.billingCycle === 'yearly' ? p.yearlyPrice : p.monthlyPrice;
                  const isFree = pid === 'free';
                  return (
                    <button
                      key={pid}
                      type="button"
                      className={`ob-plan-card${active ? ' is-active' : ''}${pid === 'ultra' ? ' is-popular' : ''}`}
                      onClick={() => setData(d => ({ ...d, planId: pid }))}
                      style={{ '--plan-color': p.color } as React.CSSProperties}
                    >
                      {pid === 'ultra' && <span className="ob-plan-badge">Most popular</span>}
                      <div className="ob-plan-head">
                        <span className="ob-plan-dot" />
                        <span className="ob-plan-name">{p.name}</span>
                      </div>
                      <div className="ob-plan-price">
                        {isFree ? (
                          <span className="ob-plan-amount">£0</span>
                        ) : (
                          <>
                            <span className="ob-plan-amount">£{price}</span>
                            <span className="ob-plan-period">/mo{data.billingCycle === 'yearly' ? ' billed yearly' : ''}</span>
                          </>
                        )}
                      </div>
                      <ul className="ob-plan-features">
                        <li><Check size={12} /> {p.maxItems === Infinity ? 'Unlimited' : p.maxItems.toLocaleString()} items</li>
                        <li><Check size={12} /> {p.maxUsers === Infinity ? 'Unlimited' : p.maxUsers} {p.maxUsers === 1 ? 'user' : 'users'}</li>
                        <li><Check size={12} /> {p.customFields === Infinity ? 'Unlimited' : p.customFields} custom field{p.customFields === 1 ? '' : 's'}</li>
                        <li><Check size={12} /> {p.activityHistoryMonths === Infinity ? 'Unlimited' : `${p.activityHistoryMonths}-mo`} history</li>
                        {!isFree && <li className="ob-plan-trial">14-day free trial</li>}
                      </ul>
                      {active && <span className="ob-plan-check"><Check size={14} strokeWidth={2.6} /></span>}
                    </button>
                  );
                })}
              </div>

              {error && <div className="ob-error">{error}</div>}
            </section>
          )}
        </div>
      </main>

      <footer className="ob-footer">
        <button
          type="button"
          className="ob-back"
          onClick={back}
          disabled={step === 0}
        >
          <ArrowLeft size={14} strokeWidth={2.1} /> Back
        </button>
        <div className="ob-step-count">Step {step + 1} of {total}</div>
        {step < total - 1 ? (
          <button
            type="button"
            className="ob-next"
            disabled={!canContinue}
            onClick={next}
          >
            Continue <ArrowRight size={14} strokeWidth={2.1} />
          </button>
        ) : (
          <button
            type="button"
            className="ob-next ob-finish"
            disabled={!canContinue || submitting}
            onClick={finish}
          >
            {submitting && <Loader2 size={14} className="spin" />}
            {data.planId === 'free' ? 'Take me to my workspace' : 'Start free trial'}
            <ArrowRight size={14} strokeWidth={2.1} />
          </button>
        )}
      </footer>

      <style>{`
        .ob-shell {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-color);
          font-family: var(--font-sans);
          color: var(--text-dark);
        }
        .ob-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 18px 28px;
        }
        .ob-brand {
          display: flex; align-items: center; gap: 10px;
          font-weight: 700;
          letter-spacing: -0.01em;
        }
        .ob-brand-mark { width: 28px; height: 28px; object-fit: contain; }
        .ob-brand-name { font-size: 15px; }
        .ob-skip {
          background: transparent;
          border: 0;
          color: var(--text-muted);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          padding: 6px 10px;
          border-radius: 8px;
          transition: color .15s var(--ease), background .15s var(--ease);
        }
        .ob-skip:hover { color: var(--text-dark); background: var(--card-bg); }

        .ob-progress {
          height: 3px;
          background: var(--border-color);
          overflow: hidden;
        }
        .ob-progress-bar {
          height: 100%;
          background: linear-gradient(90deg, #3651DC, #F59E0B);
          border-radius: 0 999px 999px 0;
          transition: width .35s var(--ease);
        }

        .ob-main {
          flex: 1;
          display: flex;
          justify-content: center;
          padding: 32px 24px 0;
          min-width: 0;
        }
        .ob-stage {
          width: 100%;
          max-width: 720px;
          animation: ob-stage-in .35s var(--ease) both;
        }
        .ob-stage-plans, .ob-stage-3 { max-width: 920px; }
        @keyframes ob-stage-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        .ob-step { display: flex; flex-direction: column; gap: 22px; padding-bottom: 32px; }
        .ob-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .ob-title {
          margin: 0;
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.15;
        }
        .ob-sub {
          margin: -10px 0 4px;
          color: var(--text-muted);
          font-size: 14.5px;
          line-height: 1.55;
        }

        .ob-field { display: flex; flex-direction: column; gap: 8px; }
        .ob-label {
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-medium);
          letter-spacing: -0.005em;
        }
        .ob-input {
          padding: 13px 14px;
          font-size: 15px;
          font-weight: 500;
          border: 1px solid var(--border-color);
          border-radius: 12px;
          background: var(--card-bg);
          color: var(--text-dark);
          outline: none;
          transition: border-color .15s var(--ease), box-shadow .15s var(--ease);
        }
        .ob-input:focus {
          border-color: var(--primary, #3651DC);
          box-shadow: 0 0 0 4px color-mix(in srgb, var(--primary, #3651DC) 18%, transparent);
        }

        .ob-industry-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
          gap: 8px;
        }
        .ob-industry-card {
          display: inline-flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 10px;
          color: var(--text-medium);
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          text-align: left;
          position: relative;
          transition: border-color .15s var(--ease), background .15s var(--ease), transform .15s var(--ease);
        }
        .ob-industry-card:hover { border-color: color-mix(in srgb, var(--primary, #3651DC) 28%, var(--border-color)); }
        .ob-industry-card.is-active {
          border-color: var(--primary, #3651DC);
          background: color-mix(in srgb, var(--primary, #3651DC) 8%, var(--card-bg));
          color: var(--text-dark);
        }
        .ob-industry-card svg { flex-shrink: 0; color: var(--text-muted); }
        .ob-industry-card.is-active svg { color: var(--primary, #3651DC); }
        .ob-industry-tick { margin-left: auto; color: var(--primary, #3651DC) !important; }

        .ob-usage-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 10px;
        }
        .ob-usage-card {
          display: grid;
          grid-template-columns: 36px 1fr 18px;
          align-items: center;
          gap: 12px;
          padding: 14px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          cursor: pointer;
          text-align: left;
          transition: border-color .15s var(--ease), background .15s var(--ease);
        }
        .ob-usage-card:hover { border-color: color-mix(in srgb, var(--primary, #3651DC) 30%, var(--border-color)); }
        .ob-usage-card.is-active {
          border-color: var(--primary, #3651DC);
          background: color-mix(in srgb, var(--primary, #3651DC) 8%, var(--card-bg));
        }
        .ob-usage-icon {
          width: 36px; height: 36px;
          display: inline-flex;
          align-items: center; justify-content: center;
          border-radius: 10px;
          background: color-mix(in srgb, var(--primary, #3651DC) 12%, transparent);
          color: var(--primary, #3651DC);
        }
        .ob-usage-text { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
        .ob-usage-label { font-weight: 700; font-size: 13.5px; color: var(--text-dark); }
        .ob-usage-desc { font-size: 12px; color: var(--text-muted); line-height: 1.4; }
        .ob-checkbox {
          width: 18px; height: 18px;
          border-radius: 6px;
          border: 1.5px solid var(--border-color);
          display: inline-flex; align-items: center; justify-content: center;
          transition: all .15s var(--ease);
        }
        .ob-checkbox.is-active {
          background: var(--primary, #3651DC);
          border-color: var(--primary, #3651DC);
          color: #fff;
        }

        .ob-cycle {
          display: inline-flex;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 999px;
          padding: 4px;
          gap: 2px;
          align-self: flex-start;
        }
        .ob-cycle-btn {
          padding: 7px 16px;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          background: transparent;
          border: 0;
          border-radius: 999px;
          cursor: pointer;
          transition: all .18s var(--ease);
          display: inline-flex; align-items: center; gap: 6px;
        }
        .ob-cycle-btn.is-active {
          background: var(--text-dark);
          color: var(--card-bg);
        }
        .ob-cycle-save {
          font-size: 10px;
          padding: 1px 7px;
          background: rgba(16,185,129,0.15);
          color: #059669;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.04em;
        }
        .ob-cycle-btn.is-active .ob-cycle-save { background: rgba(16,185,129,0.85); color: #fff; }

        .ob-plan-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
          gap: 12px;
        }
        .ob-plan-card {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: 18px 16px 14px;
          background: var(--card-bg);
          border: 2px solid var(--border-color);
          border-radius: 16px;
          cursor: pointer;
          text-align: left;
          transition: border-color .18s var(--ease), transform .18s var(--ease), box-shadow .18s var(--ease);
        }
        .ob-plan-card:hover { transform: translateY(-2px); box-shadow: 0 12px 28px -18px rgba(15,23,42,0.18); }
        .ob-plan-card.is-active {
          border-color: var(--plan-color, var(--primary, #3651DC));
          box-shadow: 0 14px 32px -18px color-mix(in srgb, var(--plan-color, #3651DC) 80%, transparent);
        }
        .ob-plan-card.is-popular { border-color: color-mix(in srgb, var(--plan-color, #3651DC) 40%, var(--border-color)); }

        .ob-plan-badge {
          position: absolute; top: -10px; left: 14px;
          background: var(--plan-color, var(--primary));
          color: #fff;
          padding: 2px 9px;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          border-radius: 999px;
        }
        .ob-plan-head { display: flex; align-items: center; gap: 8px; }
        .ob-plan-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: var(--plan-color);
        }
        .ob-plan-name { font-weight: 800; font-size: 14px; letter-spacing: -0.01em; }
        .ob-plan-price { display: flex; align-items: baseline; gap: 4px; }
        .ob-plan-amount { font-size: 26px; font-weight: 800; letter-spacing: -0.025em; }
        .ob-plan-period { font-size: 11px; color: var(--text-muted); font-weight: 500; }
        .ob-plan-features {
          margin: 0; padding: 0;
          list-style: none;
          display: flex; flex-direction: column; gap: 6px;
          font-size: 12px;
          color: var(--text-medium);
        }
        .ob-plan-features li {
          display: flex; align-items: center; gap: 6px;
        }
        .ob-plan-features svg { color: var(--plan-color); flex-shrink: 0; }
        .ob-plan-trial {
          font-weight: 700;
          color: #059669 !important;
          font-size: 11px;
          margin-top: 2px;
          padding-top: 6px;
          border-top: 1px solid var(--border-color);
        }
        .ob-plan-trial::before {
          content: '✓';
          margin-right: 4px;
        }
        .ob-plan-check {
          position: absolute;
          top: 14px; right: 14px;
          width: 24px; height: 24px;
          border-radius: 50%;
          background: var(--plan-color);
          color: #fff;
          display: inline-flex;
          align-items: center; justify-content: center;
        }

        .ob-error {
          padding: 10px 14px;
          background: rgba(220,38,38,0.08);
          color: #B91C1C;
          border-radius: 10px;
          font-size: 13px;
        }

        .ob-footer {
          padding: 16px 28px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-top: 1px solid var(--border-color);
          background: color-mix(in srgb, var(--bg-color) 92%, transparent);
          backdrop-filter: blur(8px);
        }
        .ob-back, .ob-next {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 10px 18px;
          font-size: 13.5px;
          font-weight: 600;
          border-radius: 10px;
          border: 1px solid var(--border-color);
          background: var(--card-bg);
          color: var(--text-medium);
          cursor: pointer;
          transition: all .15s var(--ease);
        }
        .ob-back:hover:not(:disabled) { color: var(--text-dark); border-color: var(--border-color); background: var(--surface-raised); }
        .ob-back:disabled { opacity: 0.4; cursor: not-allowed; }
        .ob-next {
          background: var(--text-dark);
          color: var(--card-bg);
          border-color: var(--text-dark);
          padding: 11px 22px;
        }
        .ob-next:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 8px 18px -12px rgba(15,23,42,0.4); }
        .ob-next:disabled { opacity: 0.5; cursor: not-allowed; }
        .ob-step-count { font-size: 12px; color: var(--text-muted); }

        .spin { animation: spin 0.7s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        @media (max-width: 720px) {
          .ob-header { padding: 14px 16px; }
          .ob-main { padding: 24px 16px 0; }
          .ob-footer { padding: 14px 16px 18px; }
          .ob-title { font-size: 22px; }
          .ob-stage-3 .ob-plan-grid { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
}
