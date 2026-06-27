import { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { apiGet } from '../lib/api';

interface Announcement {
  id: string;
  message: string;
  type: string;
}

const colors: Record<string, string> = {
  info: '#294EA7',
  warning: '#d97706',
  success: '#059669',
};

const DISMISS_KEY = 'iinwentory_dismissed_announcement';

// App-wide operator broadcast, shown to every signed-in user. Dismissal is
// remembered per announcement id, so a new announcement resurfaces.
export default function AnnouncementBanner() {
  const [ann, setAnn] = useState<Announcement | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiGet<{ announcement: Announcement | null }>('/api/announcement')
      .then(d => {
        if (cancelled || !d.announcement) return;
        if (localStorage.getItem(DISMISS_KEY) !== d.announcement.id) setAnn(d.announcement);
      })
      .catch(() => { /* unauthenticated or offline — no banner */ });
    return () => { cancelled = true; };
  }, []);

  if (!ann) return null;
  const color = colors[ann.type] ?? colors.info;

  const dismiss = () => {
    try { localStorage.setItem(DISMISS_KEY, ann.id); } catch { /* ignore */ }
    setAnn(null);
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 18px',
      background: color + '14', borderBottom: `1px solid ${color}33`,
      color, fontSize: '13px', fontWeight: 600, flexShrink: 0,
    }}>
      <Megaphone size={15} strokeWidth={2.2} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, color: 'var(--text-color)' }}>{ann.message}</span>
      <button
        onClick={dismiss}
        title="Dismiss"
        style={{ display: 'inline-flex', background: 'transparent', border: 'none', color, cursor: 'pointer', padding: '2px' }}
      >
        <X size={15} />
      </button>
    </div>
  );
}
