import { useState } from 'react';
import { useTeam } from '../store/useTeamStore';
import { useSettings } from '../store/useSettingsStore';
import { useAuth } from '../store/useAuthStore';
import type { TeamMemberRole, TeamInvite } from '../types';
import { apiPost } from '../lib/api';
import { Crown, Shield, User, UserCheck, Plus, Copy, Trash2, Share2, Check, LogIn, AlertTriangle, Users as UsersIcon } from 'lucide-react';
import HelpButton from '../components/HelpButton';

const ROLES: { value: TeamMemberRole; label: string; desc: string; icon: typeof Crown }[] = [
  { value: 'owner',  label: 'Owner',  desc: 'Full access, cannot be removed',   icon: Crown },
  { value: 'admin',  label: 'Admin',  desc: 'Full access to inventory and team', icon: Shield },
  { value: 'member', label: 'Member', desc: 'Can view and edit inventory',       icon: User },
  { value: 'client', label: 'Client', desc: 'Scoped view, cannot pick or edit',  icon: UserCheck },
];

const roleColors: Record<TeamMemberRole, string> = {
  owner: '#f59e0b',
  admin: '#8b5cf6',
  member: '#22c55e',
  client: '#0ea5e9',
};

function RoleBadge({ role }: { role: TeamMemberRole }) {
  const r = ROLES.find(r => r.value === role) ?? ROLES[2];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: roleColors[role] + '18', color: roleColors[role],
      fontSize: '11px', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
      border: `1px solid ${roleColors[role]}33`,
    }}>
      <r.icon size={11} /> {r.label}
    </span>
  );
}

type AssignableRole = 'admin' | 'member' | 'client';

function RolePicker({ value, onChange }: { value: AssignableRole; onChange: (r: AssignableRole) => void }) {
  const options = ROLES.filter(r => r.value !== 'owner') as { value: AssignableRole; label: string; desc: string; icon: typeof Crown }[];
  return (
    <div
      role="radiogroup"
      aria-label="Member role"
      style={{
        display: 'inline-flex',
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-color)',
        borderRadius: '999px',
        padding: '3px',
        gap: '2px',
      }}
    >
      {options.map(opt => {
        const selected = value === opt.value;
        const color = roleColors[opt.value];
        return (
          <button
            key={opt.value}
            role="radio"
            aria-checked={selected}
            title={opt.desc}
            onClick={() => { if (!selected) onChange(opt.value); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 11px',
              borderRadius: '999px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: selected ? 'default' : 'pointer',
              border: 'none',
              background: selected ? color : 'transparent',
              color: selected ? '#fff' : color,
              boxShadow: selected ? `0 1px 2px ${color}55, 0 0 0 1px ${color}` : 'none',
              transition: 'background 0.15s, color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={(e) => {
              if (!selected) {
                e.currentTarget.style.background = color + '18';
              }
            }}
            onMouseLeave={(e) => {
              if (!selected) {
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            <opt.icon size={12} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function avatarColor(name: string): string {
  const colors = ['#294EA7', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
  return colors[(name.charCodeAt(0) || 0) % colors.length];
}

export default function Team() {
  const { members, loading, updateMemberRole, removeMember: removeMemberFromTeam } = useTeam();
  const { settings } = useSettings();
  const { user, refreshOrgPlan } = useAuth();
  const [popupInvite, setPopupInvite] = useState<TeamInvite | null>(null);
  const [copied, setCopied] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [emailedTo, setEmailedTo] = useState<string | null>(null);

  const myRole = members.find(m => m.id === user?.id)?.role;
  const isAdmin = myRole === 'owner' || myRole === 'admin';

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [joining, setJoining] = useState(false);
  const ownerHasOthers = myRole === 'owner' && members.length > 1;

  const createInvite = async () => {
    try {
      const email = inviteEmail.trim();
      const invite = await apiPost<TeamInvite & { emailed?: boolean }>(
        '/api/team/invites',
        email ? { email } : undefined,
      );
      setCopied(false);
      setEmailedTo(invite.emailed ? email : null);
      setPopupInvite(invite);
      setInviteEmail('');
    } catch (e) { alert(e instanceof Error ? e.message : 'Create invite failed'); }
  };

  const changeRole = async (userId: string, role: 'admin' | 'member' | 'client') => {
    // Optimistic: the store flips the role locally before the request and
    // rolls back on failure, so the picker updates the instant you click.
    try {
      await updateMemberRole(userId, role);
    } catch (e) { alert(e instanceof Error ? e.message : 'Role change failed'); }
  };

  const removeMember = async (userId: string) => {
    if (!confirm('Remove this member from the team?')) return;
    try {
      await removeMemberFromTeam(userId);
    } catch (e) { alert(e instanceof Error ? e.message : 'Remove failed'); }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard?.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* clipboard unavailable */ }
  };

  const handleJoinTeam = async () => {
    const code = joinCode.trim().toUpperCase();
    if (!code) { setJoinError('Enter an invite code.'); return; }
    setJoining(true);
    setJoinError('');
    try {
      await apiPost(`/api/team/invites/${encodeURIComponent(code)}/accept`);
      // Force a full reload so every store rehydrates against the new team.
      await refreshOrgPlan();
      window.location.assign('/dashboard');
    } catch (e) {
      setJoinError(e instanceof Error ? e.message : 'Failed to join team.');
      setJoining(false);
    }
  };

  const shareInvite = async (inv: TeamInvite) => {
    const text = `Join my team on ${settings.orgName}. Use invite code: ${inv.inviteCode}`;
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Team invite', text });
        return;
      } catch { /* user cancelled or share failed — fall through to copy */ }
    }
    void copyCode(inv.inviteCode);
  };

  return (
    <div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
      <div className="page-hero">
        <div className="page-hero-text">
          <span className="page-eyebrow">
            <UsersIcon size={12} strokeWidth={2.4} /> Team
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1>{settings.orgName}</h1>
            <HelpButton topic="team" size={16} />
          </div>
          <p className="page-hero-sub">
            {members.length} member{members.length !== 1 ? 's' : ''} · invite teammates with role‑based access and per‑folder client scoping.
          </p>
        </div>
        <div className="page-hero-actions">
          <button
            className="btn-outline"
            onClick={() => { setJoinOpen(true); setJoinCode(''); setJoinError(''); }}
            title="Join another team using an invite code"
          >
            <LogIn size={14} strokeWidth={2.2} /> Join team
          </button>
          {isAdmin && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                className="input"
                type="email"
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="Email (optional)"
                title="Optionally email the invite to someone"
                style={{ width: '180px' }}
                onKeyDown={e => { if (e.key === 'Enter') createInvite(); }}
              />
              <button className="btn-primary" onClick={createInvite}>
                <Plus size={15} strokeWidth={2.2} /> {inviteEmail.trim() ? 'Send invite' : 'Generate invite'}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '28px' }}>
        {ROLES.map(r => (
          <div
            key={r.value}
            className="stat-card"
            style={{
              ['--stat-accent' as string]: roleColors[r.value],
              cursor: 'default',
            } as React.CSSProperties}
          >
            <span className="stat-card-icon" style={{
              background: roleColors[r.value] + '14',
              color: roleColors[r.value],
              boxShadow: `inset 0 0 0 1px ${roleColors[r.value]}38`,
              marginBottom: 10,
            }}>
              <r.icon size={16} strokeWidth={2.0} />
            </span>
            <div style={{ fontSize: '13.5px', fontWeight: 700, color: roleColors[r.value], letterSpacing: '-0.012em' }}>
              {r.label}
            </div>
            <p style={{ marginTop: 4, fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
              {r.desc}
            </p>
          </div>
        ))}
      </div>

      {loading && <p style={{ color: 'var(--text-muted)' }}>Loading…</p>}

      <h3 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px' }}>Members ({members.length})</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {members.map(member => (
          <div key={member.id} className="card animate-fade" style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '16px', cursor: 'default' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '50%', flexShrink: 0,
              background: avatarColor(member.name), color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '14px', fontWeight: 700, letterSpacing: '0.5px',
            }}>
              {initials(member.name)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 600, fontSize: '15px' }}>{member.name}</span>
                <RoleBadge role={member.role} />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                {member.email || <span style={{ fontStyle: 'italic' }}>No email set</span>}
                <span style={{ margin: '0 8px', color: '#e2e8f0' }}>·</span>
                Joined {new Date(member.createdAt).toLocaleDateString()}
              </div>
            </div>
            {isAdmin && member.id !== user?.id && (myRole === 'owner' || member.role !== 'owner') && (
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {member.role === 'owner' ? (
                  <RoleBadge role="owner" />
                ) : (
                  <RolePicker
                    value={member.role as 'admin' | 'member' | 'client'}
                    onChange={(r) => changeRole(member.id, r)}
                  />
                )}
                <button
                  onClick={() => removeMember(member.id)}
                  title="Remove member"
                  style={{
                    color: 'var(--danger)',
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: '8px',
                    padding: '6px 8px',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(220, 38, 38, 0.08)';
                    e.currentTarget.style.borderColor = 'rgba(220, 38, 38, 0.30)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.borderColor = 'transparent';
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {joinOpen && (
        <div className="modal-overlay" onClick={() => !joining && setJoinOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '440px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <LogIn size={18} color="var(--primary)" />
              <h2 style={{ margin: 0 }}>Join a team</h2>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px', lineHeight: '1.5' }}>
              Paste the invite code shared by an owner or admin of the team you want to join.
            </p>

            {ownerHasOthers && (
              <div style={{
                background: '#fef2f2',
                border: '1px solid #fecaca',
                borderLeft: '4px solid #dc2626',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px',
                fontSize: '13px',
                color: '#991b1b',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  You're the <b>owner</b> of <b>{settings.orgName}</b> and there are other members.
                  Transfer ownership to someone else before joining another team — otherwise the
                  server will reject the join.
                </span>
              </div>
            )}

            {!ownerHasOthers && members.length > 1 && (
              <div style={{
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '12px 14px',
                marginBottom: '14px',
                fontSize: '13px',
                color: '#92400e',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  Joining another team will <b>remove you</b> from <b>{settings.orgName}</b>.
                  Each user can only belong to one team at a time.
                </span>
              </div>
            )}

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
              Invite code
            </label>
            <input
              className="input"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && !joining) void handleJoinTeam(); }}
              placeholder="ABC123"
              autoFocus
              maxLength={32}
              autoComplete="off"
              style={{
                width: '100%',
                fontFamily: 'monospace',
                textTransform: 'uppercase',
                letterSpacing: '2px',
                fontSize: '16px',
                fontWeight: 700,
                textAlign: 'center',
              }}
            />

            {joinError && (
              <div style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '8px',
                padding: '10px 12px',
                marginTop: '12px',
                fontSize: '13px',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}>
                <AlertTriangle size={14} /> {joinError}
              </div>
            )}

            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setJoinOpen(false)} disabled={joining}>
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleJoinTeam}
                disabled={joining || !joinCode.trim() || ownerHasOthers}
                style={{ opacity: (joining || !joinCode.trim() || ownerHasOthers) ? 0.5 : 1 }}
              >
                <LogIn size={14} /> {joining ? 'Joining…' : 'Join team'}
              </button>
            </div>
          </div>
        </div>
      )}

      {popupInvite && (
        <div className="modal-overlay" onClick={() => setPopupInvite(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '420px' }}>
            <h2 style={{ marginBottom: '6px' }}>Invite code ready</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Share this code to add a teammate to {settings.orgName}.
            </p>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
              background: 'var(--surface-raised)', border: '1px solid var(--border)',
              padding: '14px 18px', borderRadius: '10px',
              marginBottom: popupInvite.expiresAt ? '10px' : '18px',
            }}>
              <code style={{ fontSize: '22px', fontWeight: 700, fontFamily: 'monospace', letterSpacing: '2px' }}>
                {popupInvite.inviteCode}
              </code>
              <button
                onClick={() => copyCode(popupInvite.inviteCode)}
                className="btn-outline"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Copy</>}
              </button>
            </div>
            {emailedTo && (
              <p style={{ fontSize: '13px', color: '#059669', fontWeight: 600, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Check size={14} /> Invite emailed to {emailedTo}
              </p>
            )}
            {popupInvite.expiresAt && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
                Expires {new Date(popupInvite.expiresAt).toLocaleDateString()}
              </p>
            )}
            <div className="modal-actions">
              <button className="btn-outline" onClick={() => setPopupInvite(null)}>Close</button>
              <button className="btn-primary" onClick={() => shareInvite(popupInvite)}>
                <Share2 size={14} /> Share
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
