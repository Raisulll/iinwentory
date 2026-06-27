import {
  AlertTriangle,
  BarChart3,
  Bell,
  Check,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  FlaskConical,
  FolderClosed,
  LayoutGrid,
  LogOut,
  MessageSquarePlus,
  Moon,
  Search,
  Settings,
  Shield,
  Sparkles,
  Sun,
  Waypoints,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../store/useAuthStore";
import { useSettings } from "../store/useSettingsStore";
import { useStore } from "../store/useStore";
import FeedbackModal from "./FeedbackModal";

interface CurrencyOption {
  value: string;
  code: string;
  name: string;
}

const CURRENCY_OPTIONS: ReadonlyArray<CurrencyOption> = [
  { value: "$", code: "USD", name: "US Dollar" },
  { value: "€", code: "EUR", name: "Euro" },
  { value: "£", code: "GBP", name: "British Pound" },
  { value: "¥", code: "JPY", name: "Japanese Yen" },
  { value: "₹", code: "INR", name: "Indian Rupee" },
  { value: "₩", code: "KRW", name: "Korean Won" },
  { value: "C$", code: "CAD", name: "Canadian Dollar" },
  { value: "A$", code: "AUD", name: "Australian Dollar" },
];

interface CurrencyPickerProps {
  value: string;
  onChange: (value: string) => void;
}

function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const selected =
    CURRENCY_OPTIONS.find((o) => o.value === value) ?? CURRENCY_OPTIONS[0];

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSelect = (next: string): void => {
    onChange(next);
    setOpen(false);
  };

  return (
    <div ref={wrapperRef} className="currency-picker">
      <button
        type="button"
        className="currency-trigger"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="currency-symbol">{selected.value}</span>
        <span className="currency-meta">
          <span className="currency-code">{selected.code}</span>
          <span className="currency-name">{selected.name}</span>
        </span>
        <ChevronDown
          size={14}
          className={`currency-chevron ${open ? "open" : ""}`}
        />
      </button>
      {open && (
        <div className="currency-menu" role="listbox">
          {CURRENCY_OPTIONS.map((opt) => {
            const isActive = opt.value === value;
            return (
              <button
                key={opt.code}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => handleSelect(opt.value)}
                className={`currency-option ${isActive ? "active" : ""}`}
              >
                <span className="currency-option-symbol">{opt.value}</span>
                <span className="currency-option-text">
                  <span className="currency-option-code">{opt.code}</span>
                  <span className="currency-option-name">{opt.name}</span>
                </span>
                {isActive && (
                  <Check size={14} className="currency-option-check" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const navItems = [
  { path: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { path: "/items", label: "Items", icon: FolderClosed },
  { path: "/search", label: "Search", icon: Search },
  { path: "/workflows", label: "Functions", icon: Waypoints, badge: "New" },
  { path: "/reports", label: "Reports", icon: BarChart3 },
  {
    path: "/labs",
    label: "Labs",
    icon: FlaskConical,
    badge: "Beta",
    disabled: true,
  },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ open = false, onClose }: SidebarProps) {
  const store = useStore();
  const { settings, updateSettings } = useSettings();
  const { user, plan, logout } = useAuth();
  const lowStockCount = settings.lowStockAlerts
    ? store.getLowStockItems().length
    : 0;
  const itemCount = store.items.length;
  const itemPct =
    plan.maxItems === Infinity
      ? 0
      : Math.min(100, Math.round((itemCount / plan.maxItems) * 100));

  // Collapsed (icons-only) mode. Persisted in localStorage and projected onto
  // <html data-sidebar="collapsed"> so the global --sidebar-w variable (and
  // therefore Layout's margin-left) follow without prop-drilling.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("iinw_sidebar_collapsed") === "1";
  });
  useEffect(() => {
    const html = document.documentElement;
    if (collapsed) html.setAttribute("data-sidebar", "collapsed");
    else html.removeAttribute("data-sidebar");
    try {
      localStorage.setItem("iinw_sidebar_collapsed", collapsed ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [collapsed]);
  const toggleCollapsed = () => setCollapsed((c) => !c);

  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const handleNavClick = () => {
    onClose?.();
  };

  const handleCurrencyChange = (value: string): void => {
    void updateSettings({ currency: value });
  };

  const toggleTheme = (): void => {
    const next = settings.theme === "dark" ? "light" : "dark";
    void updateSettings({ theme: next });
  };
  const isDark = settings.theme === "dark";

  return (
    <aside
      className={`sidebar ${open ? "open" : ""} ${collapsed ? "is-collapsed" : ""}`}
    >
      <div className="sidebar-grain" aria-hidden="true" />

      {/* Brand */}
      <div className="sidebar-brand">
        <div className="brand-row">
          <img
            className="brand-mark"
            src="/imperial-trends-logo.png"
            alt="iinwentory logo"
          />
          <div className="brand-text">
            <span className="brand-name">iinwentory</span>
            <span className="brand-tag" style={{ background: plan.color }}>
              {plan.name}
            </span>
          </div>
        </div>
        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={toggleCollapsed}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-pressed={collapsed}
        >
          {collapsed ? (
            <ChevronsRight size={14} strokeWidth={2.2} />
          ) : (
            <ChevronsLeft size={14} strokeWidth={2.2} />
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        <div className="nav-eyebrow">Workspace</div>
        <div className="nav-group">
          {navItems.map((n) => {
            if (n.disabled) {
              return (
                <div
                  key={n.label}
                  className="nav-link disabled"
                  aria-disabled="true"
                >
                  <span className="nav-link-icon">
                    <n.icon size={17} strokeWidth={1.85} />
                  </span>
                  <span className="nav-link-label">{n.label}</span>
                  {n.badge && <span className="nav-badge beta">{n.badge}</span>}
                </div>
              );
            }
            return (
              <NavLink
                key={n.label}
                to={n.path}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `nav-link ${isActive ? "active" : ""}`
                }
              >
                <span className="nav-link-rail" aria-hidden="true" />
                <span className="nav-link-icon">
                  <n.icon size={17} strokeWidth={1.85} />
                </span>
                <span className="nav-link-label">{n.label}</span>
                {n.badge && <span className="nav-badge">{n.badge}</span>}
              </NavLink>
            );
          })}
        </div>

        {user?.isSuperAdmin && (
          <>
            <div className="nav-eyebrow late">Operator</div>
            <div className="nav-group">
              <NavLink
                to="/admin"
                onClick={handleNavClick}
                className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
              >
                <span className="nav-link-rail" aria-hidden="true" />
                <span className="nav-link-icon">
                  <Shield size={17} strokeWidth={1.85} />
                </span>
                <span className="nav-link-label">Admin</span>
              </NavLink>
            </div>
          </>
        )}

        <div className="nav-eyebrow late">Account</div>
        <div className="nav-group">
          <NavLink
            to="/notifications"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-link-rail" aria-hidden="true" />
            <span className="nav-link-icon">
              <Bell size={17} strokeWidth={1.85} />
              {lowStockCount > 0 && (
                <span className="nav-icon-dot">
                  {lowStockCount > 9 ? "9+" : lowStockCount}
                </span>
              )}
            </span>
            <span className="nav-link-label">Notifications</span>
            {lowStockCount > 0 && (
              <span className="nav-link-meta">
                <AlertTriangle size={11} strokeWidth={2.2} /> {lowStockCount}
              </span>
            )}
          </NavLink>
          <NavLink
            to="/settings"
            onClick={handleNavClick}
            className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
          >
            <span className="nav-link-rail" aria-hidden="true" />
            <span className="nav-link-icon">
              <Settings size={17} strokeWidth={1.85} />
            </span>
            <span className="nav-link-label">Settings</span>
          </NavLink>
          <button
            type="button"
            className="nav-link"
            onClick={() => {
              onClose?.();
              setFeedbackOpen(true);
            }}
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              font: "inherit",
              textAlign: "left",
            }}
          >
            <span className="nav-link-rail" aria-hidden="true" />
            <span className="nav-link-icon">
              <MessageSquarePlus size={17} strokeWidth={1.85} />
            </span>
            <span className="nav-link-label">Feedback</span>
          </button>
        </div>
      </nav>

      <FeedbackModal open={feedbackOpen} onClose={() => setFeedbackOpen(false)} />

      {/* Footer cluster */}
      <div className="sidebar-foot">
        {/* Plan usage card — only when limited */}
        {plan.maxItems !== Infinity && (
          <div className="usage-card">
            <div className="usage-head">
              <Sparkles size={11} strokeWidth={2.2} />
              <span>Items used</span>
              <span className="usage-count">
                {itemCount} / {plan.maxItems}
              </span>
            </div>
            <div
              className="usage-bar"
              role="progressbar"
              aria-valuenow={itemPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span
                className="usage-fill"
                style={{
                  width: `${itemPct}%`,
                  background:
                    itemPct >= 90
                      ? "linear-gradient(90deg, #F87171, #EF4444)"
                      : itemPct >= 70
                        ? "linear-gradient(90deg, #FBBF24, #F59E0B)"
                        : "linear-gradient(90deg, #6EE7B7, #10B981)",
                }}
              />
            </div>
          </div>
        )}

        {/* Theme toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="theme-toggle"
          aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
          aria-pressed={isDark}
        >
          <span className="theme-toggle-track">
            <span className={`theme-toggle-thumb ${isDark ? "dark" : "light"}`}>
              {isDark ? <Moon size={11} /> : <Sun size={11} />}
            </span>
          </span>
          <span className="theme-toggle-label">
            {isDark ? "Dark mode" : "Light mode"}
          </span>
        </button>

        {/* Currency */}
        <CurrencyPicker
          value={settings.currency}
          onChange={handleCurrencyChange}
        />

        {/* User */}
        <div className="user-row">
          <div className="user-avatar">
            {(user?.name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="user-meta">
            <div className="user-name">{user?.name ?? "User"}</div>
            <div className="user-email">{user?.email ?? ""}</div>
          </div>
          <button
            onClick={logout}
            className="user-logout"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={15} strokeWidth={1.9} />
          </button>
        </div>
      </div>

      <style>{`
        /* ───────────────────────────  SIDEBAR  ─────────────────────────── */
        .sidebar {
          width: var(--sidebar-w);
          height: 100vh;
          height: 100dvh; /* dvh = visible viewport; 100vh extends behind mobile browser chrome and hides the footer */
          position: fixed;
          left: 0; top: 0;
          z-index: 100;
          display: flex;
          flex-direction: column;
          overflow: hidden; /* fixed sidebar — content fits, never scrolls */
          color: var(--sidebar-text);
          font-family: var(--font-sans);
          background:
            radial-gradient(140% 90% at 0% 0%, rgba(255, 255, 255, 0.10) 0%, transparent 55%),
            radial-gradient(120% 80% at 100% 0%, rgba(212, 160, 66, 0.10) 0%, transparent 55%),
            radial-gradient(130% 90% at 100% 100%, rgba(0, 0, 0, 0.32) 0%, transparent 65%),
            linear-gradient(170deg, var(--sidebar-bg) 0%, var(--sidebar-bg-end) 100%);
          border-right: 1px solid var(--sidebar-border);
          box-shadow:
            inset -1px 0 0 rgba(255, 255, 255, 0.04),
            0 0 0 1px rgba(0, 0, 0, 0.02);
        }
        /* Mobile slide-in drawer: pin to the viewport's top AND bottom edges so
           the drawer is exactly the visible height. Pinning via top/bottom is
           more reliable than height:100vh on mobile, where 100vh extends behind
           the browser chrome and hides the footer.
           Lives here (component <style>) so it wins over index.css's mobile rule. */
        @media (max-width: 900px) {
          .sidebar {
            top: 0;
            bottom: 0;
            height: auto;
            max-height: 100dvh;
            overflow: hidden;
          }
        }
        .sidebar-grain {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0.4;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.04 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          mix-blend-mode: overlay;
        }

        /* ───────────────────────────  BRAND  ─────────────────────────── */
        .sidebar-brand {
          padding: 22px 18px 18px;
          position: relative;
          flex-shrink: 0;
        }
        .brand-row {
          display: flex;
          align-items: center;
          gap: 11px;
        }
        .brand-mark {
          width: 36px;
          height: 36px;
          object-fit: contain;
          flex-shrink: 0;
          filter: drop-shadow(0 2px 6px rgba(0, 0, 0, 0.35));
        }
        .brand-text {
          display: flex;
          flex-direction: column;
          gap: 3px;
          min-width: 0;
        }
        .brand-name {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: -0.022em;
          color: #fff;
          line-height: 1;
        }
        .brand-tag {
          display: inline-flex;
          align-items: center;
          align-self: flex-start;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #fff;
          line-height: 1.4;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.25),
            inset 0 -1px 0 rgba(0, 0, 0, 0.18);
        }

        /* ───────────────────────────  NAV  ─────────────────────────── */
        /* Fixed sidebar — nothing scrolls. flex-grow lets the nav absorb spare
           height so the footer stays pinned to the bottom. */
        .sidebar-nav {
          flex: 1 1 auto;
          min-height: 0;
          padding: 4px 12px 8px;
          /* Allow the nav area to scroll when content overflows so the
             footer (sidebar-foot) stays pinned and items don't overlap. */
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .nav-eyebrow {
          padding: 14px 8px 8px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.36);
        }
        .nav-eyebrow.late {
          margin-top: 10px;
          padding-top: 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
        }

        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 9px 11px;
          border-radius: 10px;
          font-size: 13.5px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.70);
          letter-spacing: -0.005em;
          text-decoration: none;
          transition:
            background 200ms var(--ease),
            color 200ms var(--ease),
            transform 180ms var(--ease);
          cursor: pointer;
        }
        .nav-link-rail {
          position: absolute;
          left: -12px;
          top: 50%;
          transform: translateY(-50%);
          width: 3px;
          height: 18px;
          border-radius: 0 3px 3px 0;
          background: transparent;
          transition: background 200ms var(--ease), box-shadow 200ms var(--ease);
        }
        .nav-link-icon {
          position: relative;
          width: 22px;
          height: 22px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: rgba(255, 255, 255, 0.78);
          transition: color 200ms var(--ease);
        }
        .nav-link-label { flex: 1; }
        .nav-link:hover {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
        }
        .nav-link:hover .nav-link-icon { color: #fff; }
        .nav-link:active { transform: scale(0.985); }

        .nav-link.active {
          color: #fff;
          font-weight: 600;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 100%);
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.10),
            inset 0 -1px 0 rgba(0, 0, 0, 0.18),
            0 2px 6px rgba(0, 0, 0, 0.18);
        }
        .nav-link.active .nav-link-icon {
          color: #fff;
        }
        .nav-link.active .nav-link-rail {
          background: linear-gradient(180deg, #F5C56B 0%, #D4A042 100%);
          box-shadow: 0 0 14px rgba(212, 160, 66, 0.65);
        }

        .nav-link.disabled {
          color: rgba(255, 255, 255, 0.36);
          cursor: default;
        }
        .nav-link.disabled:hover { background: transparent; color: rgba(255, 255, 255, 0.36); }
        .nav-link.disabled .nav-link-icon { color: rgba(255, 255, 255, 0.36); }

        .nav-icon-dot {
          position: absolute;
          top: -3px; right: -5px;
          min-width: 14px;
          height: 14px;
          padding: 0 3px;
          border-radius: 999px;
          background: linear-gradient(180deg, #F87171, #EF4444);
          color: #fff;
          font-size: 9px;
          font-weight: 700;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px var(--sidebar-bg), 0 1px 4px rgba(239, 68, 68, 0.6);
        }

        .nav-badge {
          margin-left: auto;
          font-size: 9.5px;
          font-weight: 700;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 2.5px 8px;
          border-radius: 999px;
          background: linear-gradient(180deg, rgba(245, 197, 107, 0.96) 0%, rgba(212, 160, 66, 0.96) 100%);
          color: #4A2F0A;
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.30);
        }
        .nav-badge.beta {
          background: transparent;
          color: rgba(255, 255, 255, 0.55);
          box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
        }
        .nav-link-meta {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #FCA5A5;
        }

        /* ───────────────────────────  FOOTER  ─────────────────────────── */
        .sidebar-foot {
          padding: 14px 14px 16px;
          border-top: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          flex-direction: column;
          flex-shrink: 0;
          gap: 12px;
          background:
            linear-gradient(180deg, transparent 0%, rgba(0, 0, 0, 0.18) 100%);
        }

        .usage-card {
          padding: 11px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 10px;
        }
        .usage-head {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.50);
          margin-bottom: 6px;
        }
        .usage-head svg { color: #F5C56B; }
        .usage-count {
          margin-left: auto;
          font-family: var(--font-mono);
          font-feature-settings: 'tnum';
          font-size: 11px;
          color: rgba(255, 255, 255, 0.85);
          letter-spacing: 0;
          text-transform: none;
        }
        .usage-bar {
          height: 5px;
          background: rgba(255, 255, 255, 0.08);
          border-radius: 999px;
          overflow: hidden;
        }
        .usage-fill {
          display: block;
          height: 100%;
          border-radius: 999px;
          transition: width 0.5s var(--ease-out);
          box-shadow: 0 0 8px currentColor;
        }

        /* Theme toggle */
        .theme-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #fff;
          cursor: pointer;
          transition: all 0.18s var(--ease);
        }
        .theme-toggle:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .theme-toggle-track {
          position: relative;
          width: 38px;
          height: 20px;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          flex-shrink: 0;
          transition: background 0.18s var(--ease);
        }
        .theme-toggle[aria-pressed="true"] .theme-toggle-track {
          background: linear-gradient(180deg, #5C81D7, #1E3B8A);
        }
        .theme-toggle-thumb {
          position: absolute;
          top: 2px;
          left: 2px;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #fff;
          color: #F59E0B;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.24s var(--ease-spring), color 0.22s var(--ease);
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
        }
        .theme-toggle-thumb.dark {
          transform: translateX(18px);
          color: #1E3B8A;
        }
        .theme-toggle-label {
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
          letter-spacing: -0.005em;
        }

        /* Currency picker */
        .currency-picker { position: relative; }
        .currency-trigger {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 12px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          color: #fff;
          cursor: pointer;
          transition: all 0.18s var(--ease);
        }
        .currency-trigger:hover {
          background: rgba(255, 255, 255, 0.08);
          border-color: rgba(255, 255, 255, 0.16);
        }
        .currency-trigger[aria-expanded="true"] {
          background: rgba(255, 255, 255, 0.10);
          border-color: rgba(255, 255, 255, 0.22);
          box-shadow: 0 0 0 3px rgba(255, 255, 255, 0.06);
        }
        .currency-symbol {
          font-size: 16px;
          font-weight: 700;
          line-height: 1;
          width: 22px;
          text-align: center;
          color: #fff;
        }
        .currency-meta {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          flex: 1;
          min-width: 0;
        }
        .currency-code {
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          letter-spacing: 0.02em;
        }
        .currency-name {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.50);
          font-weight: 500;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          max-width: 100%;
        }
        .currency-chevron {
          color: rgba(255, 255, 255, 0.50);
          flex-shrink: 0;
          transition: transform 0.2s var(--ease);
        }
        .currency-chevron.open { transform: rotate(180deg); }

        .currency-menu {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 0;
          right: 0;
          background: linear-gradient(180deg, #1E3B8A 0%, #142A6B 100%);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 4px;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.06),
            0 18px 40px rgba(0, 0, 0, 0.55),
            0 6px 16px rgba(0, 0, 0, 0.30);
          max-height: 280px;
          overflow-y: auto;
          z-index: 200;
          animation: currencyFade 0.16s var(--ease-out);
        }
        @keyframes currencyFade {
          from { opacity: 0; transform: translateY(6px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .currency-option {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 9px 10px;
          background: transparent;
          border: none;
          border-radius: 8px;
          color: #fff;
          cursor: pointer;
          text-align: left;
          transition: background 0.14s var(--ease);
        }
        .currency-option:hover { background: rgba(255, 255, 255, 0.06); }
        .currency-option.active { background: rgba(255, 255, 255, 0.14); }
        .currency-option-symbol {
          font-size: 14px;
          font-weight: 700;
          width: 22px;
          text-align: center;
          color: #fff;
        }
        .currency-option-text {
          display: flex;
          flex-direction: column;
          flex: 1;
          min-width: 0;
        }
        .currency-option-code {
          font-size: 12px;
          font-weight: 700;
          color: #fff;
        }
        .currency-option-name {
          font-size: 10px;
          color: rgba(255, 255, 255, 0.45);
          font-weight: 500;
        }
        .currency-option-check {
          color: #6EE7B7;
          flex-shrink: 0;
        }

        /* User row */
        .user-row {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-top: 6px;
          margin-top: 2px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }
        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background:
            linear-gradient(135deg, #FFFFFF 0%, #F4F5F3 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 800;
          color: var(--primary);
          letter-spacing: -0.02em;
          flex-shrink: 0;
          box-shadow:
            inset 0 1px 0 rgba(255, 255, 255, 0.85),
            0 2px 8px rgba(0, 0, 0, 0.28);
        }
        .user-meta {
          flex: 1;
          min-width: 0;
        }
        .user-name {
          font-size: 12.5px;
          font-weight: 600;
          color: #fff;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          letter-spacing: -0.005em;
        }
        .user-email {
          font-size: 10.5px;
          color: rgba(255, 255, 255, 0.48);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .user-logout {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          background: transparent;
          color: rgba(255, 255, 255, 0.48);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.18s var(--ease);
        }
        .user-logout:hover {
          background: rgba(239, 68, 68, 0.16);
          color: #FCA5A5;
        }

        /* Compact layout for short viewports: reduce paddings and gaps so
           the nav and footer fit without showing a scrollbar. */
        @media (max-height: 720px) {
          .sidebar-brand { padding: 12px 12px 10px; }
          .brand-mark { width: 30px; height: 30px; }
          .brand-name { font-size: 15px; }

          .sidebar-nav { padding: 3px 8px 6px; }
          .nav-eyebrow { padding: 10px 6px 6px; font-size: 9px; }
          .nav-link { padding: 7px 8px; gap: 8px; font-size: 13px; }
          .nav-link-icon { width: 20px; height: 20px; }

          .sidebar-foot { padding: 10px 10px 12px; gap: 8px; }
          .usage-card { padding: 9px 10px; }
          .usage-head { margin-bottom: 4px; font-size: 9px; }

          .theme-toggle { padding: 8px 10px; }
          .currency-trigger { padding: 7px 10px; }

          .user-avatar { width: 28px; height: 28px; font-size: 12px; }
          .user-name { font-size: 12px; }
          .user-email { font-size: 10px; }
        }

        /* ───────────────────  LEGACY CLASS FALLBACKS  ─────────────────── */
        /* Keep old .sidebar-link/.sidebar-badge selectors mapped for any
           callers that still inspect them — but the visual weight comes
           from the new .nav-link styling above. */
        .sidebar-link {
          display: flex;
          align-items: center;
          gap: 11px;
          padding: 9px 11px;
          border-radius: 10px;
          color: rgba(255, 255, 255, 0.70);
          text-decoration: none;
        }
        .sidebar-link:hover { background: rgba(255, 255, 255, 0.06); color: #fff; }
        .sidebar-link.active {
          background: rgba(255, 255, 255, 0.10);
          color: #fff;
        }
      `}</style>
    </aside>
  );
}

