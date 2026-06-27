import { useState } from 'react';
import { Shield, LayoutGrid, Inbox, Building2, Users as UsersIcon, CreditCard, Cog } from 'lucide-react';
import HelpButton from '../components/HelpButton';
import AdminOverview from './admin/AdminOverview';
import AdminFeedback from './admin/AdminFeedback';
import AdminTeams from './admin/AdminTeams';
import AdminUsers from './admin/AdminUsers';
import AdminBilling from './admin/AdminBilling';
import AdminSystem from './admin/AdminSystem';

type AdminTab = 'overview' | 'feedback' | 'teams' | 'users' | 'billing' | 'system';

const TABS: { value: AdminTab; label: string; icon: typeof Inbox; title: string; sub: string }[] = [
  {
    value: 'overview', label: 'Overview', icon: LayoutGrid,
    title: 'Overview',
    sub: 'Platform health at a glance — users, teams, activity, signups, plan mix and estimated revenue.',
  },
  {
    value: 'feedback', label: 'Feedback', icon: Inbox,
    title: 'Feedback inbox',
    sub: 'Every piece of feedback submitted across all teams. Triage it through New → Reviewed → Resolved, or archive what\'s handled.',
  },
  {
    value: 'teams', label: 'Teams', icon: Building2,
    title: 'Teams',
    sub: 'Every team on the platform — plan, members, items and last activity. Open one to inspect members, billing and usage.',
  },
  {
    value: 'users', label: 'Users', icon: UsersIcon,
    title: 'Users',
    sub: 'Every account on the platform, with its team, role and super-admin status.',
  },
  {
    value: 'billing', label: 'Billing', icon: CreditCard,
    title: 'Billing',
    sub: 'Subscriptions and plan tiers. Catches drift between the web (team_billing) and mobile (teams.plan) sources, and lets you reconcile or comp a plan.',
  },
  {
    value: 'system', label: 'System', icon: Cog,
    title: 'System',
    sub: 'Live health, broadcast announcements, the operator audit trail and the current plan configuration.',
  },
];

export default function Admin() {
  const [tab, setTab] = useState<AdminTab>('overview');
  const meta = TABS.find(t => t.value === tab)!;

  return (
    <div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <span className="page-eyebrow">
            <Shield size={12} strokeWidth={2.4} /> Admin · Operator
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>{meta.title}</h1>
            <HelpButton topic="team" size={16} />
          </div>
          <p className="page-hero-sub">{meta.sub}</p>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border-color)' }}>
        {TABS.map(t => {
          const active = tab === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '7px',
                padding: '10px 16px', fontSize: '13.5px', fontWeight: 600, cursor: 'pointer',
                background: 'transparent', border: 'none',
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                borderBottom: `2px solid ${active ? 'var(--primary)' : 'transparent'}`,
                marginBottom: '-1px',
                transition: 'color 0.15s, border-color 0.15s',
              }}
            >
              <t.icon size={15} /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Every tab stays mounted so its data is fetched once on entry and
          switching tabs just toggles visibility — no reload on tab change. */}
      <div style={{ display: tab === 'overview' ? 'block' : 'none' }}><AdminOverview /></div>
      <div style={{ display: tab === 'feedback' ? 'block' : 'none' }}><AdminFeedback /></div>
      <div style={{ display: tab === 'teams' ? 'block' : 'none' }}><AdminTeams /></div>
      <div style={{ display: tab === 'users' ? 'block' : 'none' }}><AdminUsers /></div>
      <div style={{ display: tab === 'billing' ? 'block' : 'none' }}><AdminBilling /></div>
      <div style={{ display: tab === 'system' ? 'block' : 'none' }}><AdminSystem /></div>

      <style>{`
        .spin { animation: adminspin 0.8s linear infinite; }
        @keyframes adminspin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
