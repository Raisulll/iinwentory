import { useState, useEffect } from 'react';
import { useSettings } from '../store/useSettingsStore';
import { useStore } from '../store/useStore';
import { useAuth } from '../store/useAuthStore';
import { clearActivityLog } from '../store/activityLog';
import { apiPost, apiDelete, setTokens } from '../lib/api';
import { PLANS, type PlanId } from '../plans';
import {
  User, Building2, Sliders, Database, Save, RotateCcw,
  Download, Upload, Trash2, Check, AlertTriangle, Tags as TagsIcon, ShieldAlert,
  CreditCard, ExternalLink, Sparkles, PanelLeftClose, PanelLeftOpen, Users as UsersIcon,
  KeyRound,
} from 'lucide-react';
import HelpButton from '../components/HelpButton';
import TagsManager from '../components/TagsManager';
import Team from './Team';

type SettingsTab = 'profile' | 'organization' | 'team' | 'preferences' | 'billing' | 'tags' | 'data';

const tabList: { id: SettingsTab; label: string; icon: typeof User }[] = [
  { id: 'profile', label: 'Profile', icon: User },
  { id: 'organization', label: 'Organization', icon: Building2 },
  { id: 'team', label: 'Team', icon: UsersIcon },
  { id: 'preferences', label: 'Preferences', icon: Sliders },
  { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
  { id: 'tags', label: 'Tags', icon: TagsIcon },
  { id: 'data', label: 'Data Management', icon: Database },
];

export default function Settings() {
  const { settings, updateSettings, resetSettings } = useSettings();
  const store = useStore();
  const { logout, org, plan, refreshOrgPlan } = useAuth();

  // Default to billing tab when Stripe redirects back with ?billing=...
  // or when the marketing site sends a user with ?upgrade=<plan>.
  const initialTab = ((): SettingsTab => {
    if (typeof window === 'undefined') return 'profile';
    const params = new URLSearchParams(window.location.search);
    if (params.get('billing') || params.get('upgrade')) return 'billing';
    return 'profile';
  })();

  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [saved, setSaved] = useState(false);
  const [railOpen, setRailOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true;
    return localStorage.getItem('iinw_settings_rail') !== '0';
  });
  const toggleRail = () => {
    const next = !railOpen;
    setRailOpen(next);
    try { localStorage.setItem('iinw_settings_rail', next ? '1' : '0'); } catch { /* ignore */ }
  };

  // Billing flow state
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');
  const [billingBusy, setBillingBusy] = useState<string | null>(null);
  const [billingError, setBillingError] = useState('');
  const [billingBanner, setBillingBanner] = useState<'success' | 'cancelled' | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const flag = params.get('billing');
    if (flag === 'success' || flag === 'cancelled') {
      setBillingBanner(flag);
      params.delete('billing');
      const url = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', url);
      if (flag === 'success') {
        // Webhook fires roughly synchronously; poll a couple times so the new plan
        // appears even if the webhook is slightly delayed.
        void refreshOrgPlan();
        setTimeout(() => { void refreshOrgPlan(); }, 2500);
        setTimeout(() => { void refreshOrgPlan(); }, 7000);
      }
    }

    // Marketing-site / post-register deep link: ?upgrade=<plan>&cycle=<monthly|yearly>
    // → auto-launch Stripe checkout the moment the user lands on this page.
    const upgrade = params.get('upgrade');
    const cycle = params.get('cycle');
    const validPlans = ['advanced', 'ultra', 'premium'] as const;
    const validCycles = ['monthly', 'yearly'] as const;
    if (
      upgrade &&
      (validPlans as readonly string[]).includes(upgrade) &&
      cycle &&
      (validCycles as readonly string[]).includes(cycle)
    ) {
      // Strip params first so a refresh after returning from Stripe doesn't loop.
      params.delete('upgrade');
      params.delete('cycle');
      const cleanUrl = window.location.pathname + (params.toString() ? `?${params}` : '');
      window.history.replaceState({}, '', cleanUrl);
      setBillingCycle(cycle as 'monthly' | 'yearly');
      // Defer one tick so React has applied the cycle change first.
      setTimeout(() => { void startCheckout(upgrade as PlanId); }, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshOrgPlan]);

  const startCheckout = async (planId: PlanId) => {
    setBillingBusy(`${planId}_${billingCycle}`);
    setBillingError('');
    try {
      const data = await apiPost<{ url: string }>('/api/billing/checkout', {
        planId,
        billing: billingCycle,
      });
      window.location.assign(data.url);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to start checkout');
      setBillingBusy(null);
    }
  };

  const openPortal = async () => {
    setBillingBusy('portal');
    setBillingError('');
    try {
      const data = await apiPost<{ url: string }>('/api/billing/portal', {});
      window.location.assign(data.url);
    } catch (err) {
      setBillingError(err instanceof Error ? err.message : 'Failed to open billing portal');
      setBillingBusy(null);
    }
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const DELETE_PHRASE = 'DELETE MY ACCOUNT';

  // Local draft state
  const [orgName, setOrgName] = useState(settings.orgName);
  const [userName, setUserName] = useState(settings.userName);
  const [userEmail, setUserEmail] = useState(settings.userEmail);
  const [currency, setCurrency] = useState(settings.currency);
  const [defaultView, setDefaultView] = useState(settings.defaultView);
  const [lowStockAlerts, setLowStockAlerts] = useState(settings.lowStockAlerts);

  // Sync local draft with the store when settings change elsewhere
  // (e.g. Sidebar currency picker, server hydration after cache).
  useEffect(() => { setOrgName(settings.orgName); }, [settings.orgName]);
  useEffect(() => { setUserName(settings.userName); }, [settings.userName]);
  useEffect(() => { setUserEmail(settings.userEmail); }, [settings.userEmail]);
  useEffect(() => { setCurrency(settings.currency); }, [settings.currency]);
  useEffect(() => { setDefaultView(settings.defaultView); }, [settings.defaultView]);
  useEffect(() => { setLowStockAlerts(settings.lowStockAlerts); }, [settings.lowStockAlerts]);

  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importError, setImportError] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      await updateSettings({ orgName, userName, userEmail, currency, defaultView, lowStockAlerts });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (!confirm('Reset all settings to defaults?')) return;
    resetSettings();
    setOrgName('My Organization');
    setUserName('Account Owner');
    setUserEmail('');
    setCurrency('£');
    setDefaultView('grid');
    setLowStockAlerts(true);
  };

  const handleExport = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      settings,
      items: store.items,
      folders: store.folders,
      tags: store.tags,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iinwentory-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.items || !data.folders || !data.tags) {
          setImportError('Invalid backup file. Expected items, folders, and tags.');
          return;
        }
        if (!confirm(`Import ${data.items.length} items, ${data.folders.length} folders, ${data.tags.length} tags? This will REPLACE all current data.`)) return;
        await apiPost('/api/data/import', {
          items: data.items,
          folders: data.folders,
          tags: data.tags,
        });
        window.location.reload();
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Failed to parse or import the backup file.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleClearAll = async () => {
    try {
      await apiDelete('/api/data');
      clearActivityLog();
      window.location.reload();
    } catch (err) {
      alert('Failed to clear data: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText.trim() !== DELETE_PHRASE || !deleteAcknowledged) return;
    setDeleting(true);
    setDeleteError('');
    try {
      await apiDelete('/api/account');
      clearActivityLog();
      await logout();
      window.location.assign('/login?accountDeleted=1');
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Account deletion failed.');
      setDeleting(false);
    }
  };

  const sectionStyle = { display: 'flex', flexDirection: 'column' as const, gap: '20px' };
  const fieldStyle = { display: 'flex', flexDirection: 'column' as const, gap: '6px' };
  const labelStyle = { fontSize: '13px', fontWeight: 600, color: 'var(--text-medium)' } as const;
  const hintStyle = { fontSize: '12px', color: 'var(--text-muted)' } as const;

  return (
    <div style={{ display: 'flex', height: '100%' }}>
      <style>{`
        .settings-tab {
          position: relative;
          display: flex;
          align-items: center;
          gap: 11px;
          width: 100%;
          padding: 9px 12px;
          border-radius: 9px;
          font-size: 13px;
          font-weight: 500;
          text-align: left;
          color: var(--text-medium);
          letter-spacing: -0.005em;
          background: transparent;
          transition: all 0.16s var(--ease);
          cursor: pointer;
        }
        .settings-tab:hover { background: var(--hover-bg); color: var(--text-dark); }
        .settings-tab.active {
          background: var(--primary-light);
          color: var(--primary);
          font-weight: 600;
        }
        .settings-tab.active::before {
          content: '';
          position: absolute;
          left: 0; top: 50%;
          transform: translateY(-50%);
          width: 3px; height: 18px;
          background: var(--primary);
          border-radius: 0 3px 3px 0;
        }
      `}</style>

      {/* Sidebar tabs */}
      <aside className={`search-side folder-rail ${railOpen ? '' : 'collapsed'}`} style={{
        width: railOpen ? '236px' : '0',
        minWidth: railOpen ? '236px' : '0',
        borderRight: railOpen ? '1px solid var(--border-color)' : 'none',
        background: 'linear-gradient(180deg, var(--card-bg) 0%, color-mix(in srgb, var(--card-bg) 92%, var(--bg-color)) 100%)',
        padding: railOpen ? '24px 14px' : '0',
        overflowX: 'hidden',
      }}>
        <div style={{ padding: '0 6px', marginBottom: '14px' }}>
          <span className="page-eyebrow" style={{ marginBottom: 4 }}>
            <Sliders size={11} strokeWidth={2.4} /> Workspace
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 800, letterSpacing: '-0.022em' }}>Settings</h2>
            <HelpButton topic="settings" size={14} />
          </div>
        </div>
        {tabList.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
          >
            <tab.icon size={15} strokeWidth={1.9} /> {tab.label}
          </button>
        ))}
      </aside>

      {/* Rail toggle */}
      <div className="rail-toggle">
        <button
          type="button"
          className={`rail-toggle-btn ${railOpen ? '' : 'collapsed'}`}
          onClick={toggleRail}
          title={railOpen ? 'Collapse settings nav' : 'Expand settings nav'}
          aria-label={railOpen ? 'Collapse settings nav' : 'Expand settings nav'}
        >
          {railOpen ? <PanelLeftClose size={15} strokeWidth={2.0} /> : <PanelLeftOpen size={15} strokeWidth={2.0} />}
        </button>
      </div>

      {/* Main content */}
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto', minWidth: 0 }}>

        {activeTab === 'profile' && (
          <div style={sectionStyle}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Profile</h1>
              <p style={hintStyle}>Your personal account information.</p>
            </div>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'default' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Display Name</label>
                <input className="input" value={userName} onChange={e => setUserName(e.target.value)} placeholder="Your name" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Email Address</label>
                <input className="input" type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} placeholder="you@example.com" />
                <span style={hintStyle}>Used for low-stock alert notifications.</span>
              </div>
            </div>
            <ChangePasswordCard />
          </div>
        )}

        {activeTab === 'organization' && (
          <div style={sectionStyle}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Organization</h1>
              <p style={hintStyle}>Settings for your organization's inventory workspace.</p>
            </div>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'default' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Organization Name</label>
                <input className="input" value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="My Company" />
                <span style={hintStyle}>Displayed in the app and on exports.</span>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'preferences' && (
          <div style={sectionStyle}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Preferences</h1>
              <p style={hintStyle}>Customize how iinwentory looks and behaves.</p>
            </div>
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', cursor: 'default' }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Display Currency</label>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '-4px 0 6px' }}>
                  Prices are stored and entered in GBP (£), then shown converted to your selected currency using daily exchange rates (frankfurter.app).
                </p>
                <select className="input" value={currency} onChange={e => setCurrency(e.target.value)}>
                  <option value="$">$ — USD / Dollar</option>
                  <option value="€">€ — Euro</option>
                  <option value="£">£ — GBP / Pound</option>
                  <option value="¥">¥ — JPY / Yen</option>
                  <option value="₹">₹ — INR / Rupee</option>
                  <option value="₩">₩ — KRW / Won</option>
                  <option value="C$">C$ — CAD</option>
                  <option value="A$">A$ — AUD</option>
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Default Items View</label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  {(['grid', 'list'] as const).map(v => (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px' }}>
                      <input type="radio" name="defaultView" checked={defaultView === v} onChange={() => setDefaultView(v)} style={{ accentColor: 'var(--primary)' }} />
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </label>
                  ))}
                </div>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Low Stock Alerts</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input type="checkbox" checked={lowStockAlerts} onChange={e => setLowStockAlerts(e.target.checked)} style={{ width: '18px', height: '18px', accentColor: 'var(--primary)' }} />
                  <span style={{ fontSize: '14px' }}>Show notifications for items at or below minimum level</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'billing' && (
          <div style={sectionStyle}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Billing & Plan</h1>
              <p style={hintStyle}>Manage your subscription, switch plans, or open the Stripe billing portal.</p>
            </div>

            {billingBanner === 'success' && (
              <div style={{
                background: '#ecfdf5', border: '1px solid #6ee7b7',
                borderRadius: '10px', padding: '12px 16px',
                fontSize: '13px', color: '#065f46',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <Check size={16} />
                Subscription updated. Your new plan is active — it may take a few seconds to refresh.
              </div>
            )}
            {billingBanner === 'cancelled' && (
              <div style={{
                background: '#fffbeb', border: '1px solid #fde68a',
                borderRadius: '10px', padding: '12px 16px',
                fontSize: '13px', color: '#92400e',
                display: 'flex', alignItems: 'center', gap: '10px',
              }}>
                <AlertTriangle size={16} />
                Checkout cancelled. No changes were made to your subscription.
              </div>
            )}

            {/* Current plan card */}
            <div className="card" style={{
              padding: '20px 22px', cursor: 'default',
              background: `linear-gradient(180deg, ${plan.color}10 0%, var(--card-bg) 70%)`,
              borderTop: `3px solid ${plan.color}`,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                    Current Plan
                  </div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: plan.color, marginTop: '4px' }}>
                    {plan.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    {plan.maxItems === Infinity ? 'Unlimited' : plan.maxItems} items ·{' '}
                    {plan.maxUsers === Infinity ? 'Unlimited' : plan.maxUsers} users ·{' '}
                    {plan.customFields === Infinity ? 'Unlimited' : plan.customFields} custom fields
                  </div>
                  {org && (
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Team: <b>{org.name}</b>
                    </div>
                  )}
                </div>
                {plan.id !== 'free' && plan.id !== 'enterprise' && (
                  <button
                    className="btn-outline"
                    onClick={openPortal}
                    disabled={billingBusy === 'portal'}
                    style={{ fontSize: '13px', padding: '8px 14px' }}
                  >
                    <ExternalLink size={13} />
                    {billingBusy === 'portal' ? 'Opening…' : 'Manage subscription'}
                  </button>
                )}
              </div>
            </div>

            {billingError && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fca5a5',
                borderRadius: '8px', padding: '10px 14px',
                fontSize: '13px', color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <AlertTriangle size={14} /> {billingError}
              </div>
            )}

            {/* Billing cycle toggle */}
            {plan.id !== 'enterprise' && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>
                  Available plans
                </h3>
                <div style={{
                  display: 'inline-flex',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '999px',
                  padding: '3px',
                }}>
                  {(['monthly', 'yearly'] as const).map(cycle => (
                    <button
                      key={cycle}
                      onClick={() => setBillingCycle(cycle)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '999px',
                        fontSize: '12px',
                        fontWeight: 700,
                        border: 'none',
                        background: billingCycle === cycle ? 'var(--primary)' : 'transparent',
                        color: billingCycle === cycle ? '#fff' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.15s',
                      }}
                    >
                      {cycle === 'monthly' ? 'Monthly' : 'Yearly (save 50%)'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Plan grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '12px',
            }}>
              {(() => {
                // Rank order — anything below the user's current paid tier is a downgrade
                // and must be routed through Stripe's portal, not the checkout endpoint.
                const RANK: Record<string, number> = { free: 0, advanced: 1, ultra: 2, premium: 3, enterprise: 4 };
                const currentRank = RANK[plan.id] ?? 0;
                return (['advanced', 'ultra', 'premium'] as const).map(planId => {
                  const p = PLANS[planId];
                  const isCurrent = plan.id === planId;
                  const isLower = !isCurrent && RANK[planId] < currentRank;
                  const isHigher = !isCurrent && RANK[planId] > currentRank;
                  const price = billingCycle === 'monthly' ? p.monthlyPrice : p.yearlyPrice;
                  const busyKey = `${planId}_${billingCycle}`;
                  const busy = billingBusy === busyKey;
                  const inactive = isCurrent || isLower;
                  return (
                    <div
                      key={planId}
                      className="card"
                      style={{
                        padding: '18px',
                        cursor: 'default',
                        borderTop: `3px solid ${p.color}`,
                        opacity: inactive ? 0.55 : 1,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={14} color={p.color} />
                        <div style={{ fontSize: '15px', fontWeight: 700, color: p.color }}>
                          {p.name}
                        </div>
                        {isCurrent && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '20px', background: p.color + '22', color: p.color,
                            marginLeft: 'auto',
                          }}>
                            ACTIVE
                          </span>
                        )}
                        {isLower && (
                          <span style={{
                            fontSize: '10px', fontWeight: 700, padding: '2px 8px',
                            borderRadius: '20px', background: 'var(--text-muted)' + '22', color: 'var(--text-muted)',
                            marginLeft: 'auto',
                          }}>
                            LOWER TIER
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: '10px' }}>
                        <span style={{ fontSize: '24px', fontWeight: 800 }}>${price}</span>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', marginLeft: '4px' }}>
                          / month{billingCycle === 'yearly' ? ', billed yearly' : ''}
                        </span>
                      </div>
                      <ul style={{ fontSize: '12px', color: 'var(--text-medium)', marginTop: '12px', paddingLeft: '18px', lineHeight: '1.7' }}>
                        <li>{p.maxItems} items</li>
                        <li>{p.maxUsers} users</li>
                        <li>{p.customFields} custom fields</li>
                        <li>
                          {p.activityHistoryMonths === Infinity
                            ? 'Unlimited history'
                            : p.activityHistoryMonths >= 12
                              ? `${Math.round(p.activityHistoryMonths / 12)} year${p.activityHistoryMonths === 12 ? '' : 's'} history`
                              : `${p.activityHistoryMonths} month${p.activityHistoryMonths === 1 ? '' : 's'} history`}
                        </li>
                      </ul>
                      <button
                        className="btn-primary"
                        onClick={() => { if (isHigher) startCheckout(planId); }}
                        disabled={inactive || busy || billingBusy !== null}
                        title={isLower ? 'Downgrades are handled through Manage subscription' : undefined}
                        style={{
                          width: '100%',
                          marginTop: '12px',
                          background: inactive ? 'var(--text-muted)' : p.color,
                          opacity: inactive ? 0.6 : 1,
                          cursor: inactive ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          padding: '9px 12px',
                        }}
                      >
                        {isCurrent
                          ? 'Current plan'
                          : isLower
                            ? `Downgrade via portal`
                            : busy
                              ? 'Redirecting…'
                              : `Upgrade to ${p.name}`}
                      </button>
                    </div>
                  );
                });
              })()}
            </div>

            <div style={{ fontSize: '11px', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              Payments are processed securely by Stripe. After clicking Upgrade you'll be redirected to a Stripe-hosted checkout page.
              You can cancel or change plans anytime via <b>Manage subscription</b> above.
            </div>
          </div>
        )}

        {activeTab === 'team' && (
          <div style={{ ...sectionStyle, margin: -28 }}>
            <Team />
          </div>
        )}

        {activeTab === 'tags' && (
          <div style={sectionStyle}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Tags</h1>
              <p style={hintStyle}>Organize and label items with colored tags. Changes save automatically.</p>
            </div>
            <TagsManager showHeader={false} />
          </div>
        )}

        {activeTab === 'data' && (
          <div style={sectionStyle}>
            <div>
              <h1 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>Data Management</h1>
              <p style={hintStyle}>Export, import, or clear your inventory data.</p>
            </div>

            <div className="card" style={{ padding: '24px', cursor: 'default' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>Export Data</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                Download a full backup of your inventory, folders, tags, and settings as a JSON file.
              </p>
              <button className="btn-primary" onClick={handleExport}>
                <Download size={15} /> Download Backup
              </button>
            </div>

            <div className="card" style={{ padding: '24px', cursor: 'default' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '15px' }}>Import Data</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                Restore from a previously exported JSON backup. <b>This will replace all current data.</b>
              </p>
              {importError && (
                <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={14} /> {importError}
                </div>
              )}
              <label className="btn-outline" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Upload size={15} /> Upload Backup File
                <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
              </label>
            </div>

            <div className="card" style={{ padding: '24px', border: '1px solid #fca5a5', cursor: 'default' }}>
              <h3 style={{ fontWeight: 700, marginBottom: '8px', fontSize: '15px', color: 'var(--danger)' }}>Danger Zone</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                Permanently delete all inventory data, folders, tags, and activity history. This cannot be undone.
              </p>
              {!showClearConfirm ? (
                <button className="btn-danger" onClick={() => setShowClearConfirm(true)}>
                  <Trash2 size={15} /> Clear All Data
                </button>
              ) : (
                <div style={{ background: 'color-mix(in srgb, var(--danger) 12%, var(--card-bg))', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--danger)' }}>Are you absolutely sure? All inventory data will be deleted permanently.</p>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className="btn-outline" onClick={() => setShowClearConfirm(false)}>Cancel</button>
                    <button className="btn-danger" onClick={handleClearAll}><Trash2 size={14} /> Yes, Delete Everything</button>
                  </div>
                </div>
              )}
            </div>

            <div className="card" style={{
              padding: '24px',
              border: '2px solid #dc2626',
              background: 'linear-gradient(180deg, var(--card-bg) 0%, color-mix(in srgb, var(--danger) 8%, var(--card-bg)) 100%)',
              cursor: 'default',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <ShieldAlert size={18} color="#dc2626" />
                <h3 style={{ fontWeight: 700, fontSize: '15px', color: '#dc2626', margin: 0 }}>
                  Delete Account
                </h3>
              </div>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.6' }}>
                Permanently delete your iinwentory account, all inventory data, team memberships,
                pick lists, photos, and activity history. This action cannot be undone.
                Consider exporting a backup first.
              </p>

              {!deleteOpen ? (
                <button
                  className="btn-danger"
                  onClick={() => { setDeleteOpen(true); setDeleteError(''); }}
                  style={{ background: '#dc2626' }}
                >
                  <Trash2 size={15} /> Delete My Account
                </button>
              ) : (
                <div style={{
                  background: 'var(--card-bg)',
                  border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)',
                  borderRadius: '10px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}>
                  <div style={{
                    background: 'color-mix(in srgb, var(--danger) 9%, var(--card-bg))',
                    border: '1px solid color-mix(in srgb, var(--danger) 25%, transparent)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    fontSize: '13px',
                    color: 'color-mix(in srgb, var(--danger) 70%, var(--text-dark))',
                    lineHeight: '1.5',
                  }}>
                    <strong>This will permanently delete:</strong>
                    <ul style={{ margin: '6px 0 0 18px', padding: 0 }}>
                      <li>Your profile and login credentials</li>
                      <li>All inventory items, folders, tags, and photos</li>
                      <li>Pick lists, comments, and audit logs you created</li>
                      <li>All team memberships tied to this account</li>
                    </ul>
                  </div>

                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    fontSize: '13px',
                    color: 'var(--text-medium)',
                    cursor: 'pointer',
                  }}>
                    <input
                      type="checkbox"
                      checked={deleteAcknowledged}
                      onChange={e => setDeleteAcknowledged(e.target.checked)}
                      style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: '#dc2626' }}
                    />
                    <span>
                      I understand this is permanent and cannot be undone, and that I've already
                      exported a backup if I wanted one.
                    </span>
                  </label>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-medium)' }}>
                      Type <code style={{
                        background: 'color-mix(in srgb, var(--danger) 16%, var(--card-bg))',
                        color: 'var(--danger)',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        fontWeight: 700,
                      }}>{DELETE_PHRASE}</code> to confirm
                    </label>
                    <input
                      className="input"
                      value={deleteConfirmText}
                      onChange={e => setDeleteConfirmText(e.target.value)}
                      placeholder={DELETE_PHRASE}
                      autoComplete="off"
                      style={{
                        borderColor: deleteConfirmText && deleteConfirmText.trim() !== DELETE_PHRASE
                          ? '#fca5a5'
                          : undefined,
                      }}
                    />
                  </div>

                  {deleteError && (
                    <div style={{
                      background: 'color-mix(in srgb, var(--danger) 12%, var(--card-bg))',
                      border: '1px solid color-mix(in srgb, var(--danger) 35%, transparent)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      fontSize: '13px',
                      color: 'var(--danger)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                    }}>
                      <AlertTriangle size={14} /> {deleteError}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button
                      className="btn-outline"
                      onClick={() => {
                        setDeleteOpen(false);
                        setDeleteConfirmText('');
                        setDeleteAcknowledged(false);
                        setDeleteError('');
                      }}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-danger"
                      onClick={handleDeleteAccount}
                      disabled={
                        deleting ||
                        deleteConfirmText.trim() !== DELETE_PHRASE ||
                        !deleteAcknowledged
                      }
                      style={{
                        background: '#dc2626',
                        opacity: (
                          deleting ||
                          deleteConfirmText.trim() !== DELETE_PHRASE ||
                          !deleteAcknowledged
                        ) ? 0.45 : 1,
                      }}
                    >
                      <Trash2 size={14} /> {deleting ? 'Deleting…' : 'Permanently delete account'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Save / Reset buttons — only on settings tabs that need explicit save */}
        {activeTab !== 'data' && activeTab !== 'tags' && activeTab !== 'billing' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
            {saveError && (
              <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertTriangle size={14} /> {saveError}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ gap: '8px', opacity: saving ? 0.7 : 1 }}>
                {saved ? <><Check size={15} /> Saved!</> : saving ? <><Save size={15} /> Saving…</> : <><Save size={15} /> Save Changes</>}
              </button>
              <button className="btn-outline" onClick={handleReset} disabled={saving}>
                <RotateCcw size={15} /> Reset to Defaults
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const submit = async () => {
    setError('');
    setDone(false);
    if (next.length < 6) { setError('New password must be at least 6 characters.'); return; }
    if (next !== confirm) { setError('New passwords do not match.'); return; }
    setSaving(true);
    try {
      const r = await apiPost<{ accessToken: string; refreshToken: string }>('/api/auth/change-password', {
        currentPassword: current,
        newPassword: next,
      });
      // Sessions were rotated server-side — adopt the fresh tokens so this
      // client stays signed in (other devices are logged out).
      setTokens(r.accessToken, r.refreshToken);
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to change password.');
    } finally {
      setSaving(false);
    }
  };

  const label: React.CSSProperties = { fontSize: '13px', fontWeight: 600, marginBottom: '6px', display: 'block' };
  const field: React.CSSProperties = { display: 'flex', flexDirection: 'column' };

  return (
    <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', cursor: 'default' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
        <KeyRound size={17} color="var(--primary)" />
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, margin: 0 }}>Change password</h3>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            Update the password you use to sign in. This signs you out on other devices.
          </p>
        </div>
      </div>

      <div style={field}>
        <label style={label}>Current password</label>
        <input className="input" type="password" autoComplete="current-password"
          value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" />
      </div>
      <div style={field}>
        <label style={label}>New password</label>
        <input className="input" type="password" autoComplete="new-password"
          value={next} onChange={e => setNext(e.target.value)} placeholder="At least 6 characters" />
      </div>
      <div style={field}>
        <label style={label}>Confirm new password</label>
        <input className="input" type="password" autoComplete="new-password"
          value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Re-enter new password"
          onKeyDown={e => { if (e.key === 'Enter' && !saving) submit(); }} />
      </div>

      {error && (
        <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}
      {done && (
        <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: '#059669', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Check size={14} /> Password updated.
        </div>
      )}

      <button
        className="btn-primary"
        onClick={submit}
        disabled={saving || !current || !next || !confirm}
        style={{ alignSelf: 'flex-start', opacity: (saving || !current || !next || !confirm) ? 0.6 : 1 }}
      >
        {saving ? 'Updating…' : 'Update password'}
      </button>
    </div>
  );
}
