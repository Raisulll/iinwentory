import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, HelpCircle, Info, CheckCircle2 } from 'lucide-react';

// A modern, promise-based replacement for the browser's native confirm()/alert().
// Import { confirmDialog, alertDialog } anywhere and await them:
//
//   if (!await confirmDialog('Remove this member?')) return;
//   await alertDialog({ title: 'Sent', message: 'Reset email delivered.' });
//
// A single <ConfirmDialogHost /> mounted at the app root renders the styled
// modal. Requests queue, so overlapping calls show one at a time.

type DialogKind = 'confirm' | 'alert';
export type DialogTone = 'default' | 'danger' | 'success';

export interface ConfirmOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone?: DialogTone;
}

export interface AlertOptions {
  title?: string;
  message: string;
  confirmText?: string;
  tone?: DialogTone;
}

interface DialogRequest {
  kind: DialogKind;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  tone: DialogTone;
  resolve: (value: boolean) => void;
}

// Tiny external store so the imperative helpers can drive the mounted host.
let listeners: Array<(queue: DialogRequest[]) => void> = [];
let queue: DialogRequest[] = [];

function emit() {
  const snapshot = [...queue];
  listeners.forEach(l => l(snapshot));
}

function enqueue(req: Omit<DialogRequest, 'resolve'>): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    queue = [...queue, { ...req, resolve }];
    emit();
  });
}

export function confirmDialog(opts: string | ConfirmOptions): Promise<boolean> {
  const o = typeof opts === 'string' ? { message: opts } : opts;
  return enqueue({
    kind: 'confirm',
    title: o.title,
    message: o.message,
    confirmText: o.confirmText,
    cancelText: o.cancelText,
    tone: o.tone ?? 'default',
  });
}

export function alertDialog(opts: string | AlertOptions): Promise<void> {
  const o = typeof opts === 'string' ? { message: opts } : opts;
  return enqueue({
    kind: 'alert',
    title: o.title,
    message: o.message,
    confirmText: o.confirmText,
    tone: o.tone ?? 'default',
  }).then(() => undefined);
}

const TONE: Record<DialogTone, { color: string; bg: string; Icon: typeof AlertTriangle }> = {
  default: { color: 'var(--primary)', bg: 'var(--primary-light)', Icon: HelpCircle },
  danger: { color: 'var(--danger)', bg: 'color-mix(in srgb, var(--danger) 14%, transparent)', Icon: AlertTriangle },
  success: { color: '#16a34a', bg: '#dcfce7', Icon: CheckCircle2 },
};

export function ConfirmDialogHost() {
  const [q, setQ] = useState<DialogRequest[]>([]);
  const confirmBtnRef = useRef<HTMLButtonElement>(null);
  const current = q[0];

  useEffect(() => {
    const l = (next: DialogRequest[]) => setQ(next);
    listeners.push(l);
    return () => { listeners = listeners.filter(x => x !== l); };
  }, []);

  useEffect(() => {
    if (current) confirmBtnRef.current?.focus();
  }, [current]);

  if (!current) return null;

  const close = (result: boolean) => {
    current.resolve(result);
    queue = queue.slice(1);
    emit();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); close(false); }
    if (e.key === 'Enter') { e.stopPropagation(); close(true); }
  };

  const isAlert = current.kind === 'alert';
  const tone = TONE[current.tone];
  const { Icon } = tone;
  const title = current.title ?? (isAlert ? 'Notice' : 'Are you sure?');
  const confirmClass = current.tone === 'danger' ? 'btn-danger' : 'btn-primary';

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onKeyDown={onKeyDown}
      onClick={() => !isAlert && close(false)}
      // Sit above other modals (.modal-overlay is z-index 1000): a confirm/alert
      // is frequently triggered from within another modal, and must never open
      // behind the surface that launched it.
      style={{ zIndex: 4000 }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 'unset', maxWidth: '440px', padding: '26px 26px 22px' }}
      >
        <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
          <div style={{
            flexShrink: 0, width: '42px', height: '42px', borderRadius: '50%',
            background: tone.bg, color: tone.color,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={21} />
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: '1px' }}>
            <h2 id="confirm-dialog-title" style={{
              margin: 0, fontSize: '17px', fontWeight: 700,
              color: 'var(--text-dark)', letterSpacing: '-0.01em',
            }}>
              {title}
            </h2>
            <p style={{
              margin: '7px 0 0', fontSize: '13.5px', lineHeight: 1.6,
              color: 'var(--text-medium)', whiteSpace: 'pre-line',
            }}>
              {current.message}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
          {!isAlert && (
            <button
              className="btn-outline"
              onClick={() => close(false)}
              style={{ fontSize: '13px', padding: '9px 16px' }}
            >
              {current.cancelText ?? 'Cancel'}
            </button>
          )}
          <button
            ref={confirmBtnRef}
            className={confirmClass}
            onClick={() => close(true)}
            style={{ fontSize: '13px', padding: '9px 18px' }}
          >
            {current.confirmText ?? (isAlert ? 'OK' : 'Confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
