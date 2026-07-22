import { useEffect, useRef, useState } from 'react';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const GSI_SRC = 'https://accounts.google.com/gsi/client';

// Minimal shape of the Google Identity Services API we use.
interface GoogleIdApi {
  accounts: {
    id: {
      initialize: (config: {
        client_id: string;
        callback: (resp: { credential?: string }) => void;
        auto_select?: boolean;
        cancel_on_tap_outside?: boolean;
      }) => void;
      renderButton: (
        parent: HTMLElement,
        options: Record<string, unknown>,
      ) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdApi;
  }
}

let scriptPromise: Promise<void> | null = null;

/** Load the GIS client script exactly once, shared across mounts. */
function loadGsiScript(): Promise<void> {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GSI_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Google script')));
      return;
    }
    const script = document.createElement('script');
    script.src = GSI_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Google script'));
    document.head.appendChild(script);
  });
  return scriptPromise;
}

interface Props {
  onCredential: (credential: string) => void;
  onError?: (message: string) => void;
  /** Button label context — "signin_with" | "signup_with" | "continue_with". */
  text?: 'signin_with' | 'signup_with' | 'continue_with';
  disabled?: boolean;
}

/**
 * Renders Google's official "Sign in with Google" button. On success it hands
 * the ID-token credential back to the parent, which POSTs it to /api/auth/google.
 *
 * Renders nothing if VITE_GOOGLE_CLIENT_ID is not configured, so the rest of the
 * auth form keeps working without Google set up.
 */
export default function GoogleSignInButton({
  onCredential, onError, text = 'continue_with', disabled,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  // Keep the latest callback without re-initializing GIS on every render.
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) return;
    let cancelled = false;

    loadGsiScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (resp) => {
            if (resp.credential) cbRef.current(resp.credential);
            else onError?.('Google sign-in was cancelled.');
          },
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text,
          shape: 'rectangular',
          logo_alignment: 'left',
          width: 340,
        });
        setReady(true);
      })
      .catch(() => onError?.('Could not load Google sign-in. Check your connection.'));

    return () => { cancelled = true; };
  }, [text, onError]);

  if (!GOOGLE_CLIENT_ID) return null;

  return (
    <div className="google-btn-wrap">
      {!ready && <div className="google-btn-skeleton" aria-hidden="true" />}
      <div
        ref={containerRef}
        className="google-btn-host"
        style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      />
    </div>
  );
}
