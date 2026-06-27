import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../store/useAuthStore';
import { apiPost } from '../lib/api';
import { getPlan, PLANS, type PlanId } from '../plans';
import {
  ArrowRight, Eye, EyeOff, Check, AlertCircle, Sparkles,
  ShieldCheck, Boxes, ScanLine, Layers,
} from 'lucide-react';

const PLAN_ORDER: PlanId[] = ['free', 'advanced', 'ultra', 'premium'];

type LoginMode = 'login' | 'register' | 'forgot' | 'reset';

export default function Login() {
  const { login, register, isLoggedIn } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  const isRegister = params.get('register') === '1';
  const preselectedPlan = (params.get('plan') ?? 'free') as PlanId;
  const presetInvite = (params.get('invite') ?? '').trim().toUpperCase();
  const resetToken = params.get('token') ?? '';

  const [mode, setMode] = useState<LoginMode>(() => {
    if (resetToken) return 'reset';
    if (isRegister || presetInvite) return 'register';
    return 'login';
  });
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [planId, setPlanId] = useState<PlanId>(
    PLAN_ORDER.includes(preselectedPlan) ? preselectedPlan : 'free'
  );
  const [inviteCode, setInviteCode] = useState(presetInvite);
  const [showInviteField, setShowInviteField] = useState(presetInvite.length > 0);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const [resetSucceeded, setResetSucceeded] = useState(false);

  useEffect(() => {
    if (!isLoggedIn || mode === 'reset') return;
    // Fresh registrations always go through onboarding (collects company,
    // industry, usage, then tier picker). Existing users skip to dashboard.
    if (mode === 'register') {
      if (localStorage.getItem('iinw_onboarded') === '1') {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/onboarding', { replace: true, state: { planId, inviteCode } });
      }
      return;
    }
    navigate('/dashboard', { replace: true });
  }, [isLoggedIn, mode, navigate, planId, inviteCode]);

  function switchMode(next: LoginMode) {
    setMode(next);
    setError('');
    setPassword('');
    setConfirmPassword('');
    setForgotSent(false);
    setResetSucceeded(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        const result = await login(email, password);
        if (!result.ok) setError(result.error);
      } else if (mode === 'register') {
        if (!name.trim()) { setError('Name is required.'); return; }
        if (!email.includes('@')) { setError('Enter a valid email.'); return; }
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        await register(
          name.trim(),
          email.trim(),
          password,
          planId,
          inviteCode.trim() || undefined,
        );
      } else if (mode === 'forgot') {
        if (!email.includes('@')) { setError('Enter a valid email.'); return; }
        await apiPost('/api/auth/forgot-password', { email: email.trim() });
        setForgotSent(true);
      } else if (mode === 'reset') {
        if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
        if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
        await apiPost('/api/auth/reset-password', { token: resetToken, password });
        setResetSucceeded(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const plan = getPlan(planId);

  const subtitle =
    mode === 'login'   ? 'Welcome back. Sign in to manage your inventory.'
    : mode === 'register' ? 'Get started in under a minute. No credit card required.'
    : mode === 'forgot'   ? 'Enter your email — we\'ll send you a secure reset link.'
    : 'Choose a new password to regain access.';

  return (
    <div className="auth-shell">
      <style>{authStyles}</style>

      {/* ─────────  EDITORIAL BRAND PANEL (left)  ───────── */}
      <aside className="auth-brand">
        <div className="auth-brand-grain" aria-hidden="true" />
        <div className="auth-brand-orbs" aria-hidden="true">
          <span className="orb orb-1" />
          <span className="orb orb-2" />
          <span className="orb orb-3" />
        </div>

        <div className="auth-brand-inner">
          <div className="auth-logo">
            <img
              className="auth-logo-mark"
              src="/imperial-trends-logo.png"
              alt="iinwentory logo"
            />
            <span className="auth-logo-name">iinwentory</span>
          </div>

          <div className="auth-headline">
            <span className="auth-eyebrow">
              <Sparkles size={12} strokeWidth={2.4} /> Inventory, refined.
            </span>
            <h1 className="auth-headline-title">
              <span className="display">Track every item.</span>
              <br />
              <span className="display italic">Lose nothing.</span>
            </h1>
            <p className="auth-headline-body">
              Folders, photos, QR codes, pick lists, low‑stock alerts — and a
              clean web app that mirrors your offline‑capable Android app.
            </p>
          </div>

          <ul className="auth-feature-list">
            <li><span className="feat-ico"><Boxes size={14} strokeWidth={2.1} /></span>Nested folders &amp; tags</li>
            <li><span className="feat-ico"><ScanLine size={14} strokeWidth={2.1} /></span>QR codes &amp; scanner support</li>
            <li><span className="feat-ico"><Layers size={14} strokeWidth={2.1} /></span>Pick lists, POs, stock counts</li>
            <li><span className="feat-ico"><ShieldCheck size={14} strokeWidth={2.1} /></span>Encrypted, role‑scoped data</li>
          </ul>

          <div className="auth-quote">
            <p>
              "We went from spreadsheets to real‑time tracking in a single
              afternoon. The QR labels alone saved us hours every week."
            </p>
            <div className="auth-quote-meta">
              <span className="auth-quote-avatar">SC</span>
              <div>
                <strong>Sarah Chen</strong>
                <span>Operations Manager · BuildRight Supply Co.</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ─────────  FORM PANEL (right)  ───────── */}
      <main className="auth-form-wrap">
        <div className="auth-form">
          <div className="auth-form-header">
            <span className="auth-form-eyebrow">
              {mode === 'login'   && 'Sign in'}
              {mode === 'register'&& 'Create account'}
              {mode === 'forgot'  && 'Reset password'}
              {mode === 'reset'   && 'New password'}
            </span>
            <h2 className="auth-form-title">
              {mode === 'login'   && (<>Welcome <span className="display italic">back</span>.</>)}
              {mode === 'register'&& (<>Start your <span className="display italic">free</span> trial.</>)}
              {mode === 'forgot'  && (<>Forgot <span className="display italic">password</span>?</>)}
              {mode === 'reset'   && (<>Choose a <span className="display italic">new</span> one.</>)}
            </h2>
            <p className="auth-form-sub">{subtitle}</p>
          </div>

          {(mode === 'login' || mode === 'register') && (
            <div className="seg-tabs">
              {(['login', 'register'] as const).map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`seg-tab ${mode === m ? 'active' : ''}`}
                >
                  {m === 'login' ? 'Sign In' : 'Register'}
                </button>
              ))}
              <span className={`seg-tab-pill ${mode === 'register' ? 'right' : ''}`} aria-hidden="true" />
            </div>
          )}

          {mode === 'forgot' && forgotSent && (
            <div className="auth-success">
              <div className="auth-success-ico"><Check size={18} strokeWidth={2.2} /></div>
              <p>
                If an account exists for <b>{email}</b>, we just sent it a reset link.
                Check your inbox (and spam) — it expires in 1 hour.
              </p>
              <button type="button" onClick={() => switchMode('login')} className="auth-link-btn">
                ← Back to Sign In
              </button>
            </div>
          )}

          {mode === 'reset' && resetSucceeded && (
            <div className="auth-success">
              <div className="auth-success-ico"><Check size={18} strokeWidth={2.2} /></div>
              <p>Password updated. You can now sign in with your new password.</p>
              <button
                type="button"
                onClick={() => { switchMode('login'); navigate('/login', { replace: true }); }}
                className="submit-btn"
              >
                Sign In <ArrowRight size={15} strokeWidth={2.2} />
              </button>
            </div>
          )}

          {!(forgotSent || resetSucceeded) && (
            <form onSubmit={handleSubmit} className="auth-fields">
              {mode === 'register' && (
                <div className="field">
                  <label className="field-label">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="field-input"
                    required
                  />
                </div>
              )}

              {mode !== 'reset' && (
                <div className="field">
                  <label className="field-label">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    className="field-input"
                    autoComplete="email"
                    required
                  />
                  {mode === 'forgot' && (
                    <p className="field-hint">We'll email you a secure link to set a new password.</p>
                  )}
                </div>
              )}

              {mode !== 'forgot' && (
                <div className="field">
                  <div className="field-label-row">
                    <label className="field-label">
                      {mode === 'reset' ? 'New password' : 'Password'}
                    </label>
                    {mode === 'login' && (
                      <button type="button" onClick={() => switchMode('forgot')} className="auth-link-btn small">
                        Forgot?
                      </button>
                    )}
                  </div>
                  <div className="field-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="field-input"
                      required
                      minLength={mode === 'register' || mode === 'reset' ? 6 : undefined}
                      autoComplete={mode === 'reset' ? 'new-password' : 'current-password'}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(v => !v)}
                      className="field-input-toggle"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === 'reset' && (
                <div className="field">
                  <label className="field-label">Confirm new password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="field-input"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              )}

              {mode === 'register' && (
                <div className="field">
                  {!showInviteField ? (
                    <button
                      type="button"
                      onClick={() => setShowInviteField(true)}
                      className="auth-link-btn"
                    >
                      Have an invite code?
                    </button>
                  ) : (
                    <>
                      <label className="field-label">
                        Invite code <span className="field-label-meta">(optional)</span>
                      </label>
                      <input
                        type="text"
                        value={inviteCode}
                        onChange={e => setInviteCode(e.target.value.toUpperCase())}
                        placeholder="ABC123"
                        autoComplete="off"
                        maxLength={32}
                        className="field-input mono"
                      />
                      <p className="field-hint">You'll join the inviter's team instead of creating your own.</p>
                    </>
                  )}
                </div>
              )}

              {mode === 'register' && !inviteCode.trim() && (
                <div className="field">
                  <label className="field-label">Choose a plan</label>
                  <div className="plan-grid">
                    {PLAN_ORDER.map(pid => {
                      const p = PLANS[pid];
                      const selected = planId === pid;
                      return (
                        <button
                          key={pid}
                          type="button"
                          onClick={() => setPlanId(pid)}
                          className={`plan-card ${selected ? 'selected' : ''}`}
                          style={selected ? ({ '--plan-color': p.color } as React.CSSProperties) : undefined}
                        >
                          <span className="plan-card-name">{p.name}</span>
                          <span className="plan-card-price">
                            {p.monthlyPrice === 0 ? 'Free' : `$${p.monthlyPrice}/mo`}
                          </span>
                          {selected && <span className="plan-card-check"><Check size={11} strokeWidth={3} /></span>}
                        </button>
                      );
                    })}
                  </div>
                  {planId !== 'free' && (
                    <p className="field-hint">14‑day free trial · No credit card required</p>
                  )}
                </div>
              )}

              {error && (
                <div className="auth-error">
                  <AlertCircle size={15} strokeWidth={2.2} />
                  <span>{error}</span>
                </div>
              )}

              <button type="submit" disabled={submitting} className="submit-btn">
                {submitting ? (
                  <span className="submit-loading">
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                    <span className="loading-dot" />
                  </span>
                ) : (
                  <>
                    <span>
                      {mode === 'login' ? 'Sign in'
                        : mode === 'forgot' ? 'Send reset link'
                        : mode === 'reset' ? 'Set new password'
                        : inviteCode.trim()
                          ? 'Create account & join team'
                          : planId === 'free'
                            ? 'Create free account'
                            : `Start free trial — ${plan.name}`}
                    </span>
                    <ArrowRight size={15} strokeWidth={2.2} />
                  </>
                )}
              </button>

              {(mode === 'forgot' || mode === 'reset') && (
                <div className="auth-form-footer">
                  <button type="button" onClick={() => switchMode('login')} className="auth-link-btn">
                    ← Back to Sign In
                  </button>
                </div>
              )}
            </form>
          )}

          {mode === 'register' && !forgotSent && !resetSucceeded && (
            <p className="auth-fineprint">
              By creating an account you agree to our Terms of Service and{' '}
              <a href="https://iinwentory.com/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
            </p>
          )}
        </div>

        <p className="auth-footer-mark">
          iinwentory · Inventory management, simplified.
        </p>
      </main>
    </div>
  );
}

const authStyles = `
  /* ────────────────  SHELL  ──────────────── */
  .auth-shell {
    min-height: 100vh;
    display: grid;
    grid-template-columns: 1.05fr 1fr;
    background: var(--bg-color);
    font-family: var(--font-sans);
    color: var(--text-dark);
  }
  @media (max-width: 960px) {
    .auth-shell { grid-template-columns: 1fr; }
    .auth-brand { display: none; }
  }

  /* ────────────────  BRAND PANEL  ──────────────── */
  .auth-brand {
    position: relative;
    overflow: hidden;
    background:
      radial-gradient(120% 90% at 0% 0%, rgba(110, 134, 255, 0.20) 0%, transparent 55%),
      radial-gradient(110% 70% at 100% 100%, rgba(245, 158, 11, 0.10) 0%, transparent 55%),
      linear-gradient(165deg, #0E1730 0%, #050912 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 56px 72px;
    box-shadow: inset -1px 0 0 rgba(255, 255, 255, 0.04);
  }
  @media (max-width: 1280px) {
    .auth-brand { padding: 48px 56px; }
  }

  .auth-brand-grain {
    position: absolute;
    inset: 0;
    opacity: 0.5;
    pointer-events: none;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 0.05 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
    mix-blend-mode: overlay;
  }
  .auth-brand-orbs { position: absolute; inset: 0; pointer-events: none; }
  .orb { position: absolute; border-radius: 50%; filter: blur(80px); }
  .orb-1 { width: 500px; height: 500px; top: -160px; right: -120px; background: radial-gradient(circle, rgba(110, 134, 255, 0.45) 0%, transparent 70%); animation: floatY 14s ease-in-out infinite; }
  .orb-2 { width: 360px; height: 360px; bottom: 80px; left: -90px; background: radial-gradient(circle, rgba(245, 158, 11, 0.30) 0%, transparent 70%); animation: floatY 18s ease-in-out infinite reverse; }
  .orb-3 { width: 280px; height: 280px; top: 40%; left: 30%; background: radial-gradient(circle, rgba(244, 63, 94, 0.20) 0%, transparent 70%); animation: floatY 22s ease-in-out infinite; }

  .auth-brand-inner {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    flex: 1;
    max-width: 520px;
  }

  .auth-logo {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .auth-logo-mark {
    position: relative;
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: linear-gradient(135deg, #4D6BFF 0%, #2541C7 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 700;
    font-size: 22px;
    color: #fff;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.30),
      0 6px 18px -4px rgba(54, 81, 220, 0.55);
  }
  .auth-logo-dot {
    position: absolute;
    top: 8px; right: 8px;
    width: 6px; height: 6px;
    border-radius: 50%;
    background: #FBBF24;
    box-shadow: 0 0 10px rgba(251, 191, 36, 0.8);
  }
  .auth-logo-name {
    font-size: 20px;
    font-weight: 700;
    letter-spacing: -0.022em;
    color: #fff;
  }

  .auth-headline { margin-top: 64px; }
  .auth-eyebrow {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.10);
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
  }
  .auth-eyebrow svg { color: #FBBF24; }

  .auth-headline-title {
    margin-top: 22px;
    font-family: var(--font-display);
    font-size: 56px;
    line-height: 1.04;
    letter-spacing: -0.030em;
    color: #fff;
    font-weight: 500;
  }
  .auth-headline-title .italic { font-style: italic; color: #FBBF24; }
  @media (max-width: 1280px) {
    .auth-headline-title { font-size: 46px; }
  }

  .auth-headline-body {
    margin-top: 18px;
    color: rgba(255, 255, 255, 0.70);
    font-size: 15px;
    line-height: 1.65;
    max-width: 440px;
  }

  .auth-feature-list {
    list-style: none;
    margin: 36px 0 0;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px 24px;
  }
  .auth-feature-list li {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: 13.5px;
    color: rgba(255, 255, 255, 0.82);
    font-weight: 500;
  }
  .feat-ico {
    width: 24px;
    height: 24px;
    border-radius: 7px;
    background: rgba(110, 134, 255, 0.16);
    border: 1px solid rgba(110, 134, 255, 0.24);
    color: #A8B7FF;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .auth-quote {
    margin-top: 48px;
    padding: 22px 24px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: var(--radius-lg);
    backdrop-filter: blur(18px);
    -webkit-backdrop-filter: blur(18px);
  }
  .auth-quote p {
    font-family: var(--font-display);
    font-size: 17px;
    font-weight: 400;
    line-height: 1.45;
    color: rgba(255, 255, 255, 0.92);
    letter-spacing: -0.012em;
  }
  .auth-quote-meta {
    margin-top: 16px;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .auth-quote-avatar {
    width: 38px; height: 38px;
    border-radius: 12px;
    background: linear-gradient(135deg, #FBBF24, #F59E0B);
    color: #422006;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.30);
  }
  .auth-quote-meta div { display: flex; flex-direction: column; }
  .auth-quote-meta strong {
    color: #fff;
    font-size: 13.5px;
    font-weight: 600;
    letter-spacing: -0.005em;
  }
  .auth-quote-meta span {
    color: rgba(255, 255, 255, 0.55);
    font-size: 11.5px;
    font-weight: 500;
  }

  /* ────────────────  FORM PANEL  ──────────────── */
  .auth-form-wrap {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 32px;
    background: var(--bg-color);
  }
  .auth-form {
    width: 100%;
    max-width: 440px;
    background: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 36px 36px 32px;
    box-shadow: var(--shadow-lg);
  }
  @media (max-width: 480px) {
    .auth-form-wrap { padding: 32px 16px; }
    .auth-form { padding: 28px 24px; }
  }

  .auth-form-header { margin-bottom: 24px; }
  .auth-form-eyebrow {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 999px;
    background: var(--primary-light);
    color: var(--primary);
    font-size: 10.5px;
    font-weight: 700;
    letter-spacing: 0.10em;
    text-transform: uppercase;
    margin-bottom: 10px;
  }
  .auth-form-title {
    font-family: var(--font-sans);
    font-size: 30px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.030em;
    color: var(--text-dark);
  }
  .auth-form-title .display.italic {
    font-family: var(--font-display);
    font-style: italic;
    font-weight: 500;
    color: var(--primary);
    letter-spacing: -0.020em;
  }
  .auth-form-sub {
    margin-top: 8px;
    font-size: 14px;
    color: var(--text-medium);
    line-height: 1.55;
  }

  /* ────────────────  TAB SEGMENT  ──────────────── */
  .seg-tabs {
    position: relative;
    display: grid;
    grid-template-columns: 1fr 1fr;
    background: var(--surface-tint);
    padding: 4px;
    border-radius: 12px;
    margin-bottom: 24px;
  }
  .seg-tab {
    position: relative;
    z-index: 2;
    padding: 9px 12px;
    background: transparent;
    border: none;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-muted);
    letter-spacing: -0.005em;
    transition: color 0.22s var(--ease);
    border-radius: 8px;
  }
  .seg-tab.active { color: var(--primary); }
  .seg-tab-pill {
    position: absolute;
    top: 4px; bottom: 4px;
    left: 4px;
    width: calc(50% - 4px);
    background: var(--card-bg);
    border-radius: 8px;
    box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06), 0 4px 10px -2px rgba(15, 23, 42, 0.06);
    transition: transform 0.32s var(--ease-spring);
    z-index: 1;
  }
  .seg-tab-pill.right { transform: translateX(100%); }

  /* ────────────────  FIELDS  ──────────────── */
  .auth-fields {
    display: flex;
    flex-direction: column;
    gap: 18px;
  }
  .field { display: flex; flex-direction: column; }
  .field-label-row { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 7px; }
  .field-label {
    display: block;
    font-size: 12.5px;
    font-weight: 600;
    color: var(--text-dark);
    letter-spacing: -0.005em;
    margin-bottom: 7px;
  }
  .field-label-meta { font-weight: 500; color: var(--text-muted); }
  .field-label-row .field-label { margin-bottom: 0; }
  .field-input {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid var(--border-strong);
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-dark);
    background: var(--card-bg);
    outline: none;
    transition: border-color 0.18s var(--ease), box-shadow 0.18s var(--ease), background 0.18s var(--ease);
  }
  .field-input:hover { border-color: rgba(15, 23, 42, 0.18); }
  .field-input:focus { border-color: var(--primary); box-shadow: var(--ring-primary); }
  .field-input::placeholder { color: var(--text-faint); font-weight: 400; }
  .field-input.mono {
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.10em;
    font-weight: 600;
  }
  .field-hint {
    margin-top: 7px;
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.45;
  }
  .field-input-wrap { position: relative; }
  .field-input-wrap .field-input { padding-right: 42px; }
  .field-input-toggle {
    position: absolute;
    right: 8px; top: 50%;
    transform: translateY(-50%);
    width: 30px; height: 30px;
    border-radius: 8px;
    color: var(--text-muted);
    display: flex; align-items: center; justify-content: center;
    transition: all 0.16s var(--ease);
  }
  .field-input-toggle:hover { background: var(--hover-bg); color: var(--text-dark); }

  /* ────────────────  PLAN GRID  ──────────────── */
  .plan-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
  .plan-card {
    position: relative;
    text-align: left;
    padding: 12px 14px;
    border: 1px solid var(--border-strong);
    border-radius: 12px;
    background: var(--surface-raised);
    cursor: pointer;
    transition: all 0.18s var(--ease);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .plan-card:hover { border-color: var(--primary); transform: translateY(-1px); box-shadow: var(--shadow-sm); }
  .plan-card.selected {
    border-color: var(--plan-color, var(--primary));
    background: color-mix(in srgb, var(--plan-color, var(--primary)) 6%, var(--card-bg));
    box-shadow:
      0 0 0 3px color-mix(in srgb, var(--plan-color, var(--primary)) 16%, transparent),
      var(--shadow-sm);
  }
  .plan-card-name {
    font-size: 13px;
    font-weight: 700;
    color: var(--text-dark);
    letter-spacing: -0.010em;
  }
  .plan-card.selected .plan-card-name { color: var(--plan-color, var(--primary)); }
  .plan-card-price {
    font-size: 11.5px;
    color: var(--text-muted);
    font-weight: 500;
    font-variant-numeric: tabular-nums;
  }
  .plan-card-check {
    position: absolute;
    top: 8px; right: 8px;
    width: 16px; height: 16px;
    border-radius: 999px;
    background: var(--plan-color, var(--primary));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* ────────────────  ERROR / SUCCESS  ──────────────── */
  .auth-error {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 11px 13px;
    background: linear-gradient(180deg, #FFF5F5 0%, #FFE4E4 100%);
    border: 1px solid rgba(239, 68, 68, 0.22);
    color: #B91C1C;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 500;
    line-height: 1.45;
  }
  .auth-error svg { flex-shrink: 0; margin-top: 1px; }

  .auth-success {
    text-align: center;
    padding: 8px 0 12px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }
  .auth-success-ico {
    width: 48px;
    height: 48px;
    border-radius: 16px;
    background: linear-gradient(135deg, #6EE7B7, #10B981);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 8px 20px -4px rgba(16, 185, 129, 0.4);
  }
  .auth-success p {
    color: var(--text-medium);
    font-size: 14px;
    line-height: 1.55;
    max-width: 340px;
  }
  .auth-success p b { color: var(--text-dark); }

  /* ────────────────  SUBMIT  ──────────────── */
  .submit-btn {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    padding: 13px 20px;
    background: linear-gradient(180deg, color-mix(in srgb, var(--primary) 90%, white) 0%, var(--primary) 100%);
    color: #fff;
    border: none;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.005em;
    cursor: pointer;
    overflow: hidden;
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.24),
      inset 0 -1px 0 rgba(15, 23, 42, 0.18),
      0 6px 20px -6px var(--primary-glow),
      0 1px 2px rgba(15, 23, 42, 0.10);
    transition: all 0.24s var(--ease);
    margin-top: 4px;
  }
  .submit-btn::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(255, 255, 255, 0.20) 50%, transparent 70%);
    transform: translateX(-100%);
    transition: transform 0.6s var(--ease-out);
    pointer-events: none;
  }
  .submit-btn:hover {
    transform: translateY(-1px);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.28),
      0 10px 28px -6px var(--primary-glow),
      0 1px 3px rgba(15, 23, 42, 0.12);
  }
  .submit-btn:hover::after { transform: translateX(100%); }
  .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
  .submit-btn:active:not(:disabled) { transform: translateY(0) scale(0.99); }

  .submit-loading { display: inline-flex; gap: 5px; align-items: center; height: 18px; }
  .loading-dot {
    width: 6px; height: 6px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.85);
    animation: pulseSoft 1.4s var(--ease-out) infinite;
  }
  .loading-dot:nth-child(2) { animation-delay: 0.18s; }
  .loading-dot:nth-child(3) { animation-delay: 0.36s; }

  /* ────────────────  LINKS  ──────────────── */
  .auth-link-btn {
    background: transparent;
    border: none;
    color: var(--primary);
    font-size: 12.5px;
    font-weight: 600;
    cursor: pointer;
    padding: 0;
    transition: color 0.16s var(--ease);
    align-self: flex-start;
  }
  .auth-link-btn:hover { color: var(--primary-hover); text-decoration: underline; }
  .auth-link-btn.small { font-size: 11.5px; }

  .auth-form-footer { text-align: center; margin-top: 4px; }

  .auth-fineprint {
    margin-top: 18px;
    text-align: center;
    font-size: 11.5px;
    color: var(--text-muted);
    line-height: 1.55;
  }
  .auth-fineprint a { color: var(--text-medium); text-decoration: underline; }
  .auth-fineprint a:hover { color: var(--text-dark); }

  .auth-footer-mark {
    margin-top: 28px;
    text-align: center;
    font-size: 12px;
    color: var(--text-muted);
    letter-spacing: -0.005em;
  }
`;
