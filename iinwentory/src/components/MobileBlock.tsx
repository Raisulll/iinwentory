import { Smartphone, Monitor, Download, Apple } from 'lucide-react';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.iinwentory.app';
const APP_STORE_URL = 'https://apps.apple.com/app/iinwentory/id0000000000';
const MARKETING_URL = 'https://marketing-pink-tau.vercel.app';

export default function MobileBlock() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #294EA7 0%, #1e3b8a 50%, #0f1d4f 100%)',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 20px',
      textAlign: 'center',
    }}>
      <div style={{
        width: '72px', height: '72px', borderRadius: '20px',
        background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(10px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: '24px', border: '1px solid rgba(255,255,255,0.2)',
      }}>
        <Smartphone size={36} color="#fff" />
      </div>

      <h1 style={{
        fontSize: '28px', fontWeight: 800, marginBottom: '12px',
        letterSpacing: '-0.5px', lineHeight: 1.2,
      }}>
        Get the iinwentory app
      </h1>

      <p style={{
        fontSize: '15px', color: 'rgba(255,255,255,0.85)',
        maxWidth: '340px', lineHeight: 1.6, marginBottom: '32px',
      }}>
        The web app is built for desktop. For the best experience on your phone, install our native app — it's faster, works offline, and includes barcode scanning.
      </p>

      <div style={{
        display: 'flex', flexDirection: 'column', gap: '12px',
        width: '100%', maxWidth: '320px', marginBottom: '28px',
      }}>
        <a
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: '#fff', color: '#1a1a2e',
            padding: '14px 20px', borderRadius: '12px',
            fontSize: '15px', fontWeight: 700,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
        >
          <Download size={18} /> Get on Google Play
        </a>
        <a
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
            background: 'rgba(255,255,255,0.15)', color: '#fff',
            padding: '14px 20px', borderRadius: '12px',
            fontSize: '15px', fontWeight: 700,
            border: '1px solid rgba(255,255,255,0.25)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Apple size={18} /> Download on App Store
        </a>
      </div>

      <div style={{
        background: 'rgba(255,255,255,0.08)',
        border: '1px solid rgba(255,255,255,0.15)',
        borderRadius: '14px',
        padding: '16px 20px',
        maxWidth: '340px',
        width: '100%',
        marginBottom: '16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '6px' }}>
          <Monitor size={16} />
          <span style={{ fontSize: '13px', fontWeight: 700 }}>On a computer?</span>
        </div>
        <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5 }}>
          Open <b>iinwentory.vercel.app</b> on a desktop or laptop browser to use the full web experience.
        </p>
      </div>

      <a
        href={MARKETING_URL}
        style={{
          fontSize: '13px',
          color: 'rgba(255,255,255,0.7)',
          textDecoration: 'underline',
          textUnderlineOffset: '3px',
        }}
      >
        Learn more about iinwentory
      </a>

      <div style={{
        marginTop: '36px', fontSize: '11px',
        color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px',
      }}>
        © {new Date().getFullYear()} iinwentory
      </div>
    </div>
  );
}
