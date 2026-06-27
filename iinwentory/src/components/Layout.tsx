import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Sidebar from './Sidebar';
import AnnouncementBanner from './AnnouncementBanner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  useEffect(() => { setNavOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!navOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setNavOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [navOpen]);

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        backgroundColor: 'var(--bg-color)',
        backgroundImage:
          'radial-gradient(circle at 14% 0%, rgba(54, 81, 220, 0.04) 0%, transparent 38%), radial-gradient(circle at 100% 100%, rgba(245, 158, 11, 0.025) 0%, transparent 38%)',
        backgroundAttachment: 'fixed',
        overflow: 'hidden',
      }}
    >
      <button
        type="button"
        className={`mobile-nav-toggle ${navOpen ? 'open' : ''}`}
        onClick={() => setNavOpen(o => !o)}
        aria-label={navOpen ? 'Close menu' : 'Open menu'}
      >
        {navOpen ? <X size={20} /> : <Menu size={20} />}
      </button>
      <Sidebar open={navOpen} onClose={() => setNavOpen(false)} />
      {navOpen && (
        <div
          className="mobile-nav-backdrop"
          style={{ display: 'block' }}
          onClick={() => setNavOpen(false)}
          aria-hidden="true"
        />
      )}
      <main
        className="layout-main"
        style={{
          marginLeft: 'var(--sidebar-w)',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: '100vh',
          overflow: 'hidden',
        }}
      >
        <AnnouncementBanner />
        {children}
      </main>
    </div>
  );
};

export default Layout;
