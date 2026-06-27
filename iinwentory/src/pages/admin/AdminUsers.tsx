import { useEffect, useState, useCallback } from 'react';
import {
  Loader2, Crown, Shield, User, UserCheck, ShieldCheck,
  Mail, UserPlus, Download, Trash2,
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '../../lib/api';
import { useDebounce } from '../../lib/useDebounce';

interface UserRow {
  id: string;
  name: string | null;
  email: string | null;
  teamId: string | null;
  teamName: string | null;
  teamRole: string | null;
  isSuperAdmin: boolean;
  createdAt: string;
}

interface UserListResponse {
  items: UserRow[];
  nextCursor: string | null;
}

const roleMeta: Record<string, { color: string; icon: typeof Crown }> = {
  owner:  { color: '#f59e0b', icon: Crown },
  admin:  { color: '#8b5cf6', icon: Shield },
  member: { color: '#22c55e', icon: User },
  client: { color: '#0ea5e9', icon: UserCheck },
};

function RoleBadge({ role }: { role: string | null }) {
  if (!role) return <span style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic' }}>no team</span>;
  const m = roleMeta[role] ?? roleMeta.member;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      background: m.color + '18', color: m.color,
      fontSize: '11px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
      border: `1px solid ${m.color}33`,
    }}>
      <m.icon size={10} /> {role}
    </span>
  );
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function ActionButton({
  icon: Icon, title, color, disabled, onClick,
}: {
  icon: typeof Mail; title: string; color: string; disabled: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '30px', height: '30px', borderRadius: '8px',
        border: '1px solid transparent', background: 'transparent',
        color, cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.35 : 1, transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) { e.currentTarget.style.background = color + '14'; e.currentTarget.style.borderColor = color + '40'; } }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
    >
      <Icon size={15} />
    </button>
  );
}

function avatarColor(seed: string): string {
  const colors = ['#294EA7', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];
  return colors[(seed.charCodeAt(0) || 0) % colors.length];
}

export default function AdminUsers() {
  const [items, setItems] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const buildQuery = useCallback((cursor?: string) => {
    const params = new URLSearchParams();
    if (debouncedSearch.trim()) params.set('q', debouncedSearch.trim());
    if (cursor) params.set('cursor', cursor);
    return params.toString();
  }, [debouncedSearch]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiGet<UserListResponse>(`/api/admin/users?${buildQuery()}`)
      .then(data => {
        if (cancelled) return;
        setItems(data.items);
        setNextCursor(data.nextCursor);
      })
      .catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load users'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [buildQuery, reloadKey]);

  const loadMore = async () => {
    if (!nextCursor) return;
    setLoadingMore(true);
    try {
      const data = await apiGet<UserListResponse>(`/api/admin/users?${buildQuery(nextCursor)}`);
      setItems(prev => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load more');
    } finally {
      setLoadingMore(false);
    }
  };

  const sendReset = async (u: UserRow) => {
    if (!u.email) return;
    if (!confirm(`Send a password-reset email to ${u.email}?`)) return;
    setBusyId(u.id);
    try {
      const r = await apiPost<{ ok: boolean; emailed: boolean }>(`/api/admin/users/${u.id}/send-password-reset`);
      if (r.emailed) {
        alert(`Reset email sent to ${u.email}.`);
      } else {
        alert(`Reset link was generated, but the email could NOT be delivered.\n\nLikely cause: SMTP isn't configured on this server, or the Resend domain isn't verified yet (so only your own Resend address can receive mail). Verify the domain to email any user.`);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to send reset');
    } finally {
      setBusyId(null);
    }
  };

  const fixTeam = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      const r = await apiPost<{ created: boolean }>(`/api/admin/users/${u.id}/ensure-team`);
      alert(r.created ? 'Personal team created.' : 'User already had a team.');
      setReloadKey(k => k + 1);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to fix team');
    } finally {
      setBusyId(null);
    }
  };

  const exportUser = async (u: UserRow) => {
    setBusyId(u.id);
    try {
      const data = await apiGet<unknown>(`/api/admin/users/${u.id}/export`);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `user-export-${u.email ?? u.id}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Export failed');
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (u: UserRow) => {
    if (u.isSuperAdmin) return;
    if (!confirm(`PERMANENTLY delete ${u.email ?? u.id}?\n\nThis removes their account${u.teamRole === 'owner' ? ' and their personal team (if they are the sole member)' : ''}. This cannot be undone.`)) return;
    setBusyId(u.id);
    try {
      await apiDelete(`/api/admin/users/${u.id}`);
      setItems(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <input
          className="input"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search users by name or email…"
          style={{ flex: 1, minWidth: '220px' }}
        />
      </div>

      {error && (
        <div style={{
          background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px',
          padding: '10px 14px', marginBottom: '16px', fontSize: '13px', color: '#dc2626',
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Loader2 size={15} className="spin" /> Loading…
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {items.map(u => {
            const display = u.name || u.email || 'Unknown';
            const busy = busyId === u.id;
            return (
              <div key={u.id} className="card" style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', cursor: 'default' }}>
                <div style={{
                  width: '38px', height: '38px', borderRadius: '50%', flexShrink: 0,
                  background: avatarColor(display), color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700,
                }}>
                  {initials(display)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px' }}>{display}</span>
                    {u.isSuperAdmin && (
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: '4px',
                        background: '#294EA718', color: '#294EA7',
                        fontSize: '10.5px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px',
                        border: '1px solid #294EA733',
                      }}>
                        <ShieldCheck size={10} /> Super-admin
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                    {u.email}
                    <span style={{ margin: '0 7px' }}>·</span>
                    joined {new Date(u.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {u.teamName ?? '—'}
                  </span>
                  <RoleBadge role={u.teamRole} />
                  <div style={{ display: 'flex', gap: '4px', paddingLeft: '8px', borderLeft: '1px solid var(--border-color)' }}>
                    <ActionButton
                      icon={Mail} title="Send password-reset email" color="#294EA7"
                      disabled={busy || !u.email} onClick={() => sendReset(u)}
                    />
                    {!u.teamRole && (
                      <ActionButton
                        icon={UserPlus} title="Create a personal team for this user" color="#059669"
                        disabled={busy} onClick={() => fixTeam(u)}
                      />
                    )}
                    <ActionButton
                      icon={Download} title="Export this user's data (GDPR)" color="#64748b"
                      disabled={busy} onClick={() => exportUser(u)}
                    />
                    <ActionButton
                      icon={Trash2} title={u.isSuperAdmin ? 'Cannot delete a super-admin' : 'Delete account (GDPR)'}
                      color="#dc2626" disabled={busy || u.isSuperAdmin} onClick={() => deleteUser(u)}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <p style={{ color: 'var(--text-muted)', padding: '40px 0', textAlign: 'center' }}>No users found.</p>
          )}

          {nextCursor && (
            <button className="btn-outline" onClick={loadMore} disabled={loadingMore} style={{ alignSelf: 'center', marginTop: '6px' }}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </button>
          )}
        </div>
      )}
    </>
  );
}
