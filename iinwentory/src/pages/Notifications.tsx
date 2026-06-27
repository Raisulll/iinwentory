import { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import HelpButton from '../components/HelpButton';
import { useSettings } from '../store/useSettingsStore';
import { useAuth } from '../store/useAuthStore';
import { useTeam } from '../store/useTeamStore';
import { fetchActivityLog } from '../store/activityLog';
import { useNavigate } from 'react-router-dom';
import type { ActivityLogEntry } from '../types';
import {
  Bell, AlertTriangle, Package, Folder, Tag, ClipboardList,
  ShoppingCart, BarChart2, Check, Clock
} from 'lucide-react';

const SEEN_KEY = 'iinwentory_notif_seen';

function getLastSeen(): string {
  return localStorage.getItem(SEEN_KEY) || new Date(0).toISOString();
}

function markAllSeen() {
  localStorage.setItem(SEEN_KEY, new Date().toISOString());
}

const entityIcons: Record<string, typeof Package> = {
  item: Package,
  folder: Folder,
  tag: Tag,
  pick_list: ClipboardList,
  purchase_order: ShoppingCart,
  stock_count: BarChart2,
};

const actionColors: Record<string, string> = {
  created: '#22c55e',
  updated: '#3b82f6',
  deleted: '#ef4444',
  moved: '#f59e0b',
  qty_changed: '#8b5cf6',
  status_changed: '#06b6d4',
  issue_reported: '#f43f5e',
  received: '#10b981',
  completed: '#06b6d4',
};

/** The server sends a dotted action ("item.created"); colors are keyed by the verb. */
function actionColor(action: string): string {
  const verb = action.includes('.') ? (action.split('.').pop() ?? action) : action;
  return actionColors[verb] || 'var(--text-muted)';
}

function formatDetails(action: string, details: unknown, entityName: string): string {
  if (typeof details === 'string') return details;
  if (!details || typeof details !== 'object') return entityName || 'Activity';
  const d = details as Record<string, unknown>;
  const name = (typeof d.name === 'string' ? d.name : entityName) || 'Item';
  const change = typeof d.change === 'number' ? d.change : null;
  const before = typeof d.before === 'number' ? d.before : null;
  const after = typeof d.after === 'number' ? d.after : null;
  const reason = typeof d.reason === 'string' ? d.reason : null;
  const status = typeof d.status === 'string' ? d.status : null;
  const code = typeof d.code === 'string' ? d.code : null;

  const parts = action.split('.');
  const verb = parts[parts.length - 1] ?? action;

  if (verb === 'qty_changed' && before !== null && after !== null) {
    return `${name}: quantity ${before} → ${after}${reason ? ` (${reason})` : ''}`;
  }
  if (verb === 'qty_changed' && change !== null) {
    return `${name}: quantity ${change > 0 ? '+' : ''}${change}${reason ? ` (${reason})` : ''}`;
  }
  if (verb === 'moved') {
    return `${name} moved`;
  }
  if (verb === 'created') return `${name} created${code ? ` (${code})` : ''}`;
  if (verb === 'deleted') return `${name} deleted`;
  if (verb === 'updated') return `${name} updated`;
  if (verb === 'status_changed' && status) return `${name}: status → ${status}`;
  return name;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (d > 0) return `${d}d ago`;
  if (h > 0) return `${h}h ago`;
  if (m > 0) return `${m}m ago`;
  return 'just now';
}

export default function Notifications() {
  const store = useStore();
  const { settings } = useSettings();
  const { user } = useAuth();
  const { members } = useTeam();
  const navigate = useNavigate();
  const myRole = members.find(m => m.id === user?.id)?.role;
  const canSeeAuthor = myRole === 'owner';

  const [log, setLog] = useState<ActivityLogEntry[]>([]);
  const [lastSeen, setLastSeen] = useState(getLastSeen());
  const [activeTab, setActiveTab] = useState<'alerts' | 'activity'>('alerts');

  useEffect(() => {
    fetchActivityLog().then(setLog).catch(() => setLog([]));
  }, []);

  const lowStockItems = store.getLowStockItems();
  const newCount = log.filter(e => e.timestamp > lastSeen).length;

  const handleMarkSeen = () => {
    markAllSeen();
    setLastSeen(new Date().toISOString());
  };

  return (
    <div style={{ flex: 1, padding: '32px 36px', overflowY: 'auto' }}>
      <style>{`
        .notif-tabs {
          position: relative;
          display: inline-flex;
          background: var(--surface-tint);
          padding: 4px;
          border-radius: 12px;
          margin-bottom: 24px;
          border: 1px solid var(--border-color);
        }
        .notif-tab {
          position: relative;
          padding: 8px 16px;
          border: none;
          background: transparent;
          font-size: 12.5px;
          font-weight: 600;
          color: var(--text-muted);
          letter-spacing: -0.005em;
          border-radius: 9px;
          display: inline-flex;
          align-items: center;
          gap: 7px;
          transition: color 0.22s var(--ease);
          cursor: pointer;
          z-index: 2;
        }
        .notif-tab.active { color: var(--primary); }
        .notif-tab-pill {
          background: rgba(239, 68, 68, 0.14);
          color: #B91C1C;
          padding: 1px 7px;
          border-radius: 999px;
          font-size: 10.5px;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
      `}</style>

      <div className="page-hero">
        <div className="page-hero-text">
          <span className="page-eyebrow">
            <Bell size={12} strokeWidth={2.4} /> Notifications
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1>Activity &amp; alerts</h1>
            <HelpButton topic="notifications" size={16} />
            {newCount > 0 && (
              <span className="chip chip-danger">
                {newCount} new
              </span>
            )}
          </div>
          <p className="page-hero-sub">
            Low‑stock alerts and a real‑time audit trail of every change to your inventory.
          </p>
        </div>
        {newCount > 0 && (
          <div className="page-hero-actions">
            <button className="btn-outline" onClick={handleMarkSeen}>
              <Check size={14} strokeWidth={2.2} /> Mark all as read
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="notif-tabs">
        <button className={`notif-tab ${activeTab === 'alerts' ? 'active' : ''}`} onClick={() => setActiveTab('alerts')}>
          <AlertTriangle size={13} strokeWidth={2.2} />
          Low‑stock alerts
          {settings.lowStockAlerts && lowStockItems.length > 0 && (
            <span className="notif-tab-pill">{lowStockItems.length}</span>
          )}
        </button>
        <button className={`notif-tab ${activeTab === 'activity' ? 'active' : ''}`} onClick={() => setActiveTab('activity')}>
          <Clock size={13} strokeWidth={2.2} />
          Activity history
          {newCount > 0 && (
            <span className="notif-tab-pill">{newCount}</span>
          )}
        </button>
      </div>

      {/* Low stock alerts tab */}
      {activeTab === 'alerts' && (
        <>
          {!settings.lowStockAlerts ? (
            <div className="empty-state">
              <Bell size={44} />
              <p>Low stock alerts are disabled</p>
              <p>Enable them in Settings → Preferences.</p>
              <button className="btn-outline" style={{ marginTop: '16px' }} onClick={() => navigate('/settings')}>Go to Settings</button>
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="empty-state">
              <Check size={44} color="#22c55e" />
              <p style={{ color: '#22c55e' }}>All items are well stocked</p>
              <p>No items are at or below their minimum level.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {lowStockItems.length} item{lowStockItems.length !== 1 ? 's' : ''} need restocking
              </p>
              {lowStockItems.map(item => (
                <div
                  key={item.id}
                  className="card animate-fade alert-row"
                  style={{ display: 'flex', alignItems: 'center', padding: '16px 20px', gap: '14px', cursor: 'pointer' }}
                  onClick={() => navigate(`/items/detail/${item.id}`)}
                >
                  <div className="alert-icon-bubble" style={{ borderRadius: '50%', width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <AlertTriangle size={18} color="#ef4444" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, marginBottom: '2px' }}>{item.name}</div>
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      Current: <b style={{ color: '#ef4444' }}>{item.quantity} {item.unit}</b>
                      <span style={{ margin: '0 8px', color: 'var(--border-color)' }}>·</span>
                      Min level: <b>{item.minLevel} {item.unit}</b>
                    </div>
                  </div>
                  <span className="alert-pill" style={{ fontSize: '12px', fontWeight: 600, padding: '4px 12px', borderRadius: '20px' }}>
                    Restock needed
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Activity history tab */}
      {activeTab === 'activity' && (
        <>
          {log.length === 0 ? (
            <div className="empty-state">
              <Clock size={44} />
              <p>No activity yet</p>
              <p>Changes to your inventory will appear here.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {log.map(entry => {
                const Icon = entityIcons[entry.entityType] || Package;
                const isNew = entry.timestamp > lastSeen;
                const author = entry.userId ? (members.find(m => m.id === entry.userId)?.name ?? 'Member') : 'System';
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '14px',
                      padding: '12px 16px', borderRadius: '10px',
                      background: isNew ? 'rgba(99, 131, 255, 0.10)' : 'var(--card-bg)',
                      border: `1px solid ${isNew ? 'rgba(99, 131, 255, 0.32)' : 'var(--border-color)'}`,
                      marginBottom: '2px',
                    }}
                  >
                    <div style={{
                      width: '34px', height: '34px', borderRadius: '50%', flexShrink: 0,
                      background: `color-mix(in srgb, ${actionColor(entry.action)} 14%, transparent)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Icon size={16} color={actionColor(entry.action)} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: 'var(--text-dark)', lineHeight: '1.4' }}>
                        {formatDetails(entry.action, entry.details, entry.entityName)}
                        {canSeeAuthor && (
                          <span style={{ marginLeft: 8, fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                            · by <b style={{ color: 'var(--text-medium)' }}>{author}</b>
                          </span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                      {isNew && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        {timeAgo(entry.timestamp)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
