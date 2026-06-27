/**
 * Skeleton layout shown while auth is being verified or the first bootstrap
 * fetch is in flight. Mirrors the real Layout shape (sidebar + main) so
 * there is no large jump when content arrives.
 */
export default function LoadingShell() {
  return (
    <div className="loading-shell">
      <aside className="ls-sidebar">
        <div className="ls-logo" />
        <div className="ls-nav-section">
          {[42, 56, 48, 52, 44, 60, 50, 46].map((w, i) => (
            <div key={i} className="ls-nav-item">
              <div className="ls-nav-icon" />
              <div className="ls-nav-label" style={{ width: w + '%' }} />
            </div>
          ))}
        </div>
        <div className="ls-spacer" />
        <div className="ls-currency" />
      </aside>
      <main className="ls-main">
        <div className="ls-hero">
          <div className="ls-eyebrow" />
          <div className="ls-title" />
          <div className="ls-sub" />
        </div>
        <div className="ls-toolbar" />
        <div className="ls-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="ls-card" style={{ animationDelay: (i * 40) + 'ms' }}>
              <div className="ls-thumb" />
              <div className="ls-card-body">
                <div className="ls-line ls-line-name" />
                <div className="ls-line ls-line-meta" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <style>{`
        .loading-shell {
          display: flex;
          height: 100vh;
          background: var(--bg-color);
          overflow: hidden;
        }
        .ls-sidebar {
          width: var(--sidebar-w, 236px);
          flex-shrink: 0;
          padding: 18px 14px;
          border-right: 1px solid var(--border-color);
          background: var(--card-bg);
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .ls-logo {
          height: 32px;
          width: 60%;
          border-radius: 8px;
        }
        .ls-nav-section {
          margin-top: 16px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .ls-nav-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
        }
        .ls-nav-icon {
          width: 16px; height: 16px;
          border-radius: 4px;
          flex-shrink: 0;
        }
        .ls-nav-label {
          height: 9px;
          border-radius: 999px;
        }
        .ls-spacer { flex: 1; }
        .ls-currency {
          height: 44px;
          border-radius: 10px;
        }

        .ls-main {
          flex: 1;
          padding: 28px 36px;
          overflow: hidden;
        }
        .ls-hero { display: flex; flex-direction: column; gap: 9px; margin-bottom: 24px; }
        .ls-eyebrow { width: 72px;  height: 10px; border-radius: 999px; }
        .ls-title   { width: 36%; height: 22px; border-radius: 8px; }
        .ls-sub     { width: 52%; height: 12px; border-radius: 999px; }
        .ls-toolbar {
          height: 52px;
          margin-bottom: 20px;
          border-radius: 12px;
        }
        .ls-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(204px, 1fr));
          gap: 16px;
        }
        .ls-card {
          background: var(--card-bg);
          border: 1px solid var(--border-color);
          border-radius: 14px;
          overflow: hidden;
          animation: ls-card-in .35s var(--ease) both;
        }
        .ls-thumb { aspect-ratio: 1; }
        .ls-card-body { padding: 12px 14px 16px; display: flex; flex-direction: column; gap: 8px; }
        .ls-line { height: 10px; border-radius: 999px; }
        .ls-line-name { width: 70%; }
        .ls-line-meta { width: 44%; }

        /* shimmer */
        .ls-logo, .ls-nav-icon, .ls-nav-label, .ls-currency,
        .ls-eyebrow, .ls-title, .ls-sub, .ls-toolbar,
        .ls-thumb, .ls-line {
          background: linear-gradient(
            90deg,
            color-mix(in srgb, var(--text-faint) 16%, transparent) 0%,
            color-mix(in srgb, var(--text-faint) 26%, transparent) 50%,
            color-mix(in srgb, var(--text-faint) 16%, transparent) 100%
          );
          background-size: 200% 100%;
          animation: ls-shimmer 1.4s ease-in-out infinite;
        }
        @keyframes ls-shimmer {
          0%   { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }
        @keyframes ls-card-in {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
          .ls-sidebar { display: none; }
          .ls-main { padding: 18px 14px; }
        }
      `}</style>
    </div>
  );
}
