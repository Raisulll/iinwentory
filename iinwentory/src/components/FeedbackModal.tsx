import { useEffect, useState } from 'react';
import { X, Star, MessageSquarePlus, Check } from 'lucide-react';
import { apiPost } from '../lib/api';
import { useAuth } from '../store/useAuthStore';

type Category = 'general' | 'bug' | 'feature' | 'praise' | 'other';

interface CategoryOption {
  value: Category;
  label: string;
}

const CATEGORIES: ReadonlyArray<CategoryOption> = [
  { value: 'general', label: 'General' },
  { value: 'bug', label: 'Bug' },
  { value: 'feature', label: 'Feature idea' },
  { value: 'praise', label: 'Praise' },
  { value: 'other', label: 'Other' },
];

interface FeedbackModalProps {
  open: boolean;
  onClose: () => void;
}

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const { user } = useAuth();
  const [category, setCategory] = useState<Category>('general');
  const [rating, setRating] = useState<number>(0);
  const [hover, setHover] = useState<number>(0);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  // Reset the form each time the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setCategory('general');
      setRating(0);
      setHover(0);
      setMessage('');
      setError(null);
      setDone(false);
      setSubmitting(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = async () => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError('Please enter a message before sending.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiPost('/api/feedback', {
        category,
        rating: rating > 0 ? rating : null,
        message: trimmed,
        page: window.location.pathname,
        name: user?.name ?? null,
      });
      setDone(true);
      // Auto-close shortly after the thank-you state.
      setTimeout(onClose, 1400);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send feedback. Please try again.');
      setSubmitting(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'var(--primary-light)', color: 'var(--primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <MessageSquarePlus size={18} />
            </div>
            <h2 id="feedback-title" style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
              Send feedback
            </h2>
          </div>
          <button onClick={onClose} style={{ padding: '4px' }} aria-label="Close feedback">
            <X size={20} color="var(--text-muted)" />
          </button>
        </div>

        {done ? (
          <div style={{ padding: '28px 8px 12px', textAlign: 'center' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '50%', margin: '0 auto 14px',
              background: '#dcfce7', color: '#16a34a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Check size={26} />
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>Thanks for the feedback!</div>
            <div style={{ fontSize: '13px', color: 'var(--text-medium)' }}>
              We read every message — it really helps us improve.
            </div>
          </div>
        ) : (
          <>
            <p style={{ fontSize: '13.5px', lineHeight: '1.6', color: 'var(--text-medium)', marginTop: '10px', marginBottom: '18px' }}>
              Found a bug, have an idea, or just want to say hi? Let us know below.
            </p>

            {/* Category */}
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              Category
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
              {CATEGORIES.map((c) => {
                const active = c.value === category;
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    style={{
                      padding: '7px 14px', borderRadius: '999px', fontSize: '13px', fontWeight: 600,
                      cursor: 'pointer', transition: 'all 0.15s',
                      border: `1px solid ${active ? 'var(--primary)' : 'var(--border-color)'}`,
                      background: active ? 'var(--primary)' : 'transparent',
                      color: active ? '#fff' : 'var(--text-medium)',
                    }}
                  >
                    {c.label}
                  </button>
                );
              })}
            </div>

            {/* Rating */}
            <label style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              Rating <span style={{ textTransform: 'none', fontWeight: 500, color: 'var(--text-muted)' }}>(optional)</span>
            </label>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '18px' }}>
              {[1, 2, 3, 4, 5].map((n) => {
                const filled = (hover || rating) >= n;
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setRating(rating === n ? 0 : n)}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    aria-label={`${n} star${n > 1 ? 's' : ''}`}
                    style={{ padding: '2px', cursor: 'pointer', background: 'transparent', lineHeight: 0 }}
                  >
                    <Star
                      size={26}
                      strokeWidth={1.8}
                      color={filled ? '#F59E0B' : 'var(--text-muted)'}
                      fill={filled ? '#F59E0B' : 'none'}
                    />
                  </button>
                );
              })}
            </div>

            {/* Message */}
            <label htmlFor="feedback-message" style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'block' }}>
              Message
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us what's on your mind…"
              rows={4}
              maxLength={4000}
              autoFocus
              style={{
                width: '100%', resize: 'vertical', padding: '10px 12px',
                borderRadius: '8px', border: '1px solid var(--border-color)',
                fontSize: '14px', fontFamily: 'inherit', color: 'var(--text-dark)',
                background: 'var(--bg-input, #fff)', lineHeight: 1.5,
              }}
            />

            {error && (
              <div style={{ marginTop: '10px', fontSize: '13px', color: '#dc2626', fontWeight: 500 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--border-color)' }}>
              <button
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '8px 16px', fontSize: '13px', fontWeight: 600,
                  borderRadius: '8px', border: '1px solid var(--border-color)',
                  background: 'transparent', color: 'var(--text-medium)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handleSubmit}
                disabled={submitting || !message.trim()}
                style={{ padding: '8px 18px', fontSize: '13px', opacity: submitting || !message.trim() ? 0.6 : 1 }}
              >
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
