import { useState, useEffect, useRef } from 'react';
import { HelpCircle, X, Lightbulb, ChevronRight } from 'lucide-react';
import { getTutorial } from '../lib/tutorials';

interface HelpButtonProps {
  topic: string;
  size?: number;
  label?: string;
  variant?: 'icon' | 'inline';
}

export default function HelpButton({ topic, size = 14, label, variant = 'icon' }: HelpButtonProps) {
  const [open, setOpen] = useState(false);
  const tut = getTutorial(topic);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  if (!tut) return null;

  const triggerStyles = variant === 'icon'
    ? {
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: size + 10, height: size + 10, borderRadius: '50%',
        background: 'transparent', color: 'var(--text-muted)',
        cursor: 'pointer', transition: 'all 0.15s', padding: 0,
      } as React.CSSProperties
    : {
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        background: 'transparent', color: 'var(--primary)',
        fontSize: '12px', fontWeight: 600,
        cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
      } as React.CSSProperties;

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen(true); }}
        style={triggerStyles}
        title={`What is ${tut.title}?`}
        aria-label={`Help: ${tut.title}`}
      >
        <HelpCircle size={size} />
        {variant === 'inline' && (label ?? `What is ${tut.title}?`)}
      </button>

      {open && (
        <div
          className="modal-overlay"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`tutorial-${tut.id}-title`}
        >
          <div
            ref={dialogRef}
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '560px', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: 'var(--primary-light)', color: 'var(--primary)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Lightbulb size={18} />
                </div>
                <h2 id={`tutorial-${tut.id}-title`} style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>
                  {tut.title}
                </h2>
              </div>
              <button onClick={() => setOpen(false)} style={{ padding: '4px' }} aria-label="Close help">
                <X size={20} color="var(--text-muted)" />
              </button>
            </div>

            <div style={{ overflowY: 'auto', paddingRight: '4px' }}>
              <p style={{ fontSize: '14px', lineHeight: '1.6', color: 'var(--text-medium)', marginTop: '12px', marginBottom: '20px' }}>
                {tut.intro}
              </p>

              <div style={{ marginBottom: '16px' }}>
                <h3 style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>
                  How it works
                </h3>
                <ol style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: 0, listStyle: 'none' }}>
                  {tut.steps.map((s, idx) => (
                    <li key={idx} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                        background: 'var(--primary)', color: '#fff',
                        fontSize: '11px', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginTop: '2px',
                      }}>{idx + 1}</div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', marginBottom: '2px' }}>{s.title}</div>
                        <div style={{ fontSize: '13px', color: 'var(--text-medium)', lineHeight: '1.5' }}>{s.body}</div>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>

              {tut.tips && tut.tips.length > 0 && (
                <div style={{ background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 14px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#92400e', marginBottom: '6px' }}>
                    <Lightbulb size={12} /> Tips
                  </div>
                  <ul style={{ margin: 0, paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {tut.tips.map((t, idx) => (
                      <li key={idx} style={{ fontSize: '13px', color: '#78350f', lineHeight: '1.5' }}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-color)' }}>
              <button className="btn-primary" onClick={() => setOpen(false)} style={{ padding: '8px 16px', fontSize: '13px' }}>
                Got it <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
