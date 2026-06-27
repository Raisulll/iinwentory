import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { Camera, Check, AlertCircle, Plus, Search as SearchIcon, X, RotateCcw } from 'lucide-react';

// Local typing for BarcodeDetector (not yet in lib.dom.d.ts in all TS versions).
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorLike {
  detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]>;
}
interface BarcodeDetectorCtor {
  new (opts?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats?: () => Promise<string[]>;
}

const FORMATS = [
  'aztec', 'code_128', 'code_39', 'code_93', 'codabar', 'data_matrix',
  'ean_13', 'ean_8', 'itf', 'pdf417', 'qr_code', 'upc_a', 'upc_e',
];

export default function Scanner() {
  const navigate = useNavigate();
  const store = useStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const rafRef = useRef<number | null>(null);
  const lockedRef = useRef(false);

  const [status, setStatus] = useState<'init' | 'asking' | 'running' | 'denied' | 'unsupported' | 'error'>('init');
  const [error, setError] = useState<string | null>(null);
  const [scannedSku, setScannedSku] = useState<string | null>(null);

  // Look up whether the scanned SKU matches any item
  const matchedItem = scannedSku
    ? store.items.find(i => (i.sku ?? '').trim().toLowerCase() === scannedSku.toLowerCase())
    : null;

  useEffect(() => {
    const ctor = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    if (!ctor) {
      setStatus('unsupported');
      return;
    }
    try {
      detectorRef.current = new ctor({ formats: FORMATS });
    } catch {
      detectorRef.current = new ctor();
    }
    startCamera();

    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopCamera = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
  };

  const startCamera = async () => {
    setError(null);
    setStatus('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setStatus('running');
      lockedRef.current = false;
      tick();
    } catch (err) {
      const name = (err as Error).name;
      if (name === 'NotAllowedError' || name === 'SecurityError') {
        setStatus('denied');
      } else {
        setStatus('error');
        setError((err as Error).message);
      }
    }
  };

  const tick = async () => {
    if (lockedRef.current) return;
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!video || !detector || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    try {
      const results = await detector.detect(video);
      if (results.length > 0 && !lockedRef.current) {
        const value = results[0].rawValue.trim();
        if (value) {
          lockedRef.current = true;
          setScannedSku(value);
          stopCamera();
          // gentle haptic feedback on supported devices
          try { navigator.vibrate?.(40); } catch { /* ignore */ }
          return;
        }
      }
    } catch {
      // detector throws on some frames; ignore and continue
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const restart = () => {
    setScannedSku(null);
    startCamera();
  };

  const goFind = () => {
    if (matchedItem) {
      navigate(`/items/detail/${matchedItem.id}`);
    } else {
      navigate(`/search?q=${encodeURIComponent(scannedSku ?? '')}`);
    }
  };

  const goAddNew = () => {
    navigate(`/items?addWithSku=${encodeURIComponent(scannedSku ?? '')}`);
  };

  return (
    <div className="scanner-page">
      <header className="scanner-header">
        <button className="icon-btn" onClick={() => navigate(-1)} title="Back" aria-label="Back">
          <X size={18} strokeWidth={2.1} />
        </button>
        <div>
          <div className="scanner-eyebrow"><Camera size={11} strokeWidth={2.4} /> Scanner</div>
          <h1 className="scanner-title">Scan a barcode</h1>
        </div>
      </header>

      <div className="scanner-stage">
        {status === 'unsupported' && (
          <div className="scanner-message">
            <AlertCircle size={28} />
            <h3>Browser doesn't support barcode scanning</h3>
            <p>
              Use the latest Chrome, Edge, or Brave to scan. Firefox and Safari
              don't ship the BarcodeDetector API yet. On those, type the SKU
              into search instead.
            </p>
            <button className="btn-primary" onClick={() => navigate('/search')}>Go to Search</button>
          </div>
        )}

        {status === 'denied' && (
          <div className="scanner-message">
            <AlertCircle size={28} />
            <h3>Camera permission denied</h3>
            <p>Allow camera access in your browser's site settings, then try again.</p>
            <button className="btn-primary" onClick={startCamera}>Retry</button>
          </div>
        )}

        {status === 'error' && (
          <div className="scanner-message">
            <AlertCircle size={28} />
            <h3>Couldn't start the camera</h3>
            <p>{error}</p>
            <button className="btn-primary" onClick={startCamera}>Retry</button>
          </div>
        )}

        {(status === 'asking' || status === 'init') && (
          <div className="scanner-message">
            <Camera size={28} />
            <h3>Waiting for camera…</h3>
            <p>If your browser asks for permission, choose Allow.</p>
          </div>
        )}

        {(status === 'running' || scannedSku) && (
          <div className={`scanner-video-wrap${scannedSku ? ' has-result' : ''}`}>
            <video ref={videoRef} playsInline muted className="scanner-video" />
            <div className="scanner-reticle" aria-hidden>
              <span /><span /><span /><span />
            </div>
            {!scannedSku && (
              <div className="scanner-hint">Point at a barcode…</div>
            )}
          </div>
        )}
      </div>

      {scannedSku && (
        <div className="scanner-result">
          <div className="scanner-result-eyebrow">
            <Check size={12} strokeWidth={2.6} /> Scanned
          </div>
          <div className="scanner-result-sku">{scannedSku}</div>
          {matchedItem ? (
            <div className="scanner-result-matched">
              Matched: <b>{matchedItem.name}</b>
            </div>
          ) : (
            <div className="scanner-result-matched scanner-result-unknown">
              No item with this SKU yet.
            </div>
          )}
          <div className="scanner-actions">
            <button className="btn-outline" onClick={restart}>
              <RotateCcw size={14} strokeWidth={2.1} /> Scan again
            </button>
            {matchedItem ? (
              <button className="btn-primary" onClick={goFind}>
                <SearchIcon size={14} strokeWidth={2.1} /> Open item
              </button>
            ) : (
              <>
                <button className="btn-outline" onClick={goFind}>
                  <SearchIcon size={14} strokeWidth={2.1} /> Search
                </button>
                <button className="btn-primary" onClick={goAddNew}>
                  <Plus size={14} strokeWidth={2.2} /> Add new
                </button>
              </>
            )}
          </div>
        </div>
      )}

      <style>{`
        .scanner-page {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-color);
        }
        .scanner-header {
          padding: 22px 28px 14px;
          display: flex;
          align-items: center;
          gap: 14px;
        }
        .scanner-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: var(--text-faint);
        }
        .scanner-title {
          margin: 4px 0 0;
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.018em;
        }

        .scanner-stage {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 8px 28px 24px;
          min-height: 0;
        }

        .scanner-video-wrap {
          position: relative;
          width: min(640px, 100%);
          aspect-ratio: 4/3;
          background: #000;
          border-radius: 18px;
          overflow: hidden;
          box-shadow: 0 24px 60px -24px rgba(15, 23, 42, 0.4);
          transition: transform .35s var(--ease), box-shadow .35s var(--ease);
        }
        .scanner-video-wrap.has-result {
          transform: scale(0.96);
          opacity: 0.85;
        }
        .scanner-video { width: 100%; height: 100%; object-fit: cover; display: block; }

        .scanner-reticle {
          position: absolute; inset: 18%;
          border-radius: 14px;
          pointer-events: none;
        }
        .scanner-reticle span {
          position: absolute;
          width: 28px; height: 28px;
          border: 3px solid rgba(255,255,255,0.92);
        }
        .scanner-reticle span:nth-child(1) { top: 0;    left: 0;    border-right: 0; border-bottom: 0; border-top-left-radius: 12px; }
        .scanner-reticle span:nth-child(2) { top: 0;    right: 0;   border-left: 0;  border-bottom: 0; border-top-right-radius: 12px; }
        .scanner-reticle span:nth-child(3) { bottom: 0; left: 0;    border-right: 0; border-top: 0;    border-bottom-left-radius: 12px; }
        .scanner-reticle span:nth-child(4) { bottom: 0; right: 0;   border-left: 0;  border-top: 0;    border-bottom-right-radius: 12px; }

        .scanner-hint {
          position: absolute;
          bottom: 18px; left: 50%;
          transform: translateX(-50%);
          padding: 6px 12px;
          border-radius: 999px;
          background: rgba(0,0,0,0.55);
          backdrop-filter: blur(8px);
          color: #fff;
          font-size: 12.5px;
          font-weight: 500;
          letter-spacing: 0.005em;
        }

        .scanner-message {
          max-width: 420px;
          text-align: center;
          padding: 28px;
          color: var(--text-medium);
        }
        .scanner-message h3 { margin: 14px 0 8px; font-size: 17px; font-weight: 700; }
        .scanner-message p { color: var(--text-muted); font-size: 13.5px; line-height: 1.55; margin-bottom: 16px; }

        .scanner-result {
          margin: 0 28px 28px;
          padding: 22px 24px;
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 16px;
          box-shadow: 0 14px 40px -18px rgba(15, 23, 42, 0.22);
          animation: scanner-result-in .32s var(--ease-spring);
        }
        @keyframes scanner-result-in {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .scanner-result-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #16a34a;
        }
        .scanner-result-sku {
          margin-top: 6px;
          font-family: var(--font-mono, ui-monospace, "SF Mono", Menlo, monospace);
          font-size: 28px;
          font-weight: 800;
          letter-spacing: -0.01em;
          color: var(--text-dark);
          word-break: break-all;
        }
        .scanner-result-matched {
          margin-top: 6px;
          font-size: 13px;
          color: var(--text-muted);
        }
        .scanner-result-unknown { color: var(--text-faint); }
        .scanner-actions {
          margin-top: 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
        }

        @media (max-width: 720px) {
          .scanner-header { padding: 16px 16px 8px; }
          .scanner-stage { padding: 4px 12px 16px; }
          .scanner-result { margin: 0 12px 16px; padding: 18px; }
          .scanner-result-sku { font-size: 22px; }
        }
      `}</style>
    </div>
  );
}
