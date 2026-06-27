import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/useAuthStore';
import { registerUrl, SIGN_IN_URL, APP_URL } from './links';

const navLinks = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Pricing', href: '#pricing' },
  { label: 'FAQ', href: '#faq' },
];

export default function MarketingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { isLoggedIn } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'
      }`}
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img
            src="/imperial-trends-logo.png"
            alt="iinwentory"
            className="size-9 object-contain transition-transform group-hover:scale-105"
          />
          <span
            className={`text-xl font-bold tracking-tight transition-colors ${
              scrolled ? 'text-primary-700' : 'text-white'
            }`}
          >
            iinwentory
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-8 lg:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className={`text-sm font-medium transition-colors duration-200 ${
                scrolled ? 'text-gray-600 hover:text-primary-600' : 'text-white/80 hover:text-white'
              }`}
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden items-center gap-3 lg:flex">
          {!isLoggedIn ? (
            <>
              <Link
                to={SIGN_IN_URL}
                className={`text-sm font-medium transition-colors duration-200 ${
                  scrolled ? 'text-gray-600 hover:text-primary-600' : 'text-white/80 hover:text-white'
                }`}
              >
                Sign In
              </Link>
              <Link
                to={registerUrl()}
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ring-1 hover:-translate-y-0.5 ${
                  scrolled
                    ? 'bg-primary-600 text-white hover:bg-primary-700 ring-primary-700/20 hover:shadow-lg hover:shadow-primary-300/40'
                    : 'bg-white text-primary-700 hover:bg-white/95 ring-white/40 hover:shadow-lg hover:shadow-primary-900/40'
                }`}
              >
                Start Free Trial
              </Link>
            </>
          ) : (
            <>
              <Link
                to={APP_URL}
                className={`text-sm font-medium transition-colors duration-200 ${
                  scrolled ? 'text-gray-600 hover:text-primary-600' : 'text-white/80 hover:text-white'
                }`}
              >
                Go to App
              </Link>
              <a
                href="#pricing"
                className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ring-1 hover:-translate-y-0.5 ${
                  scrolled
                    ? 'bg-primary-600 text-white hover:bg-primary-700 ring-primary-700/20 hover:shadow-lg'
                    : 'bg-white text-primary-700 hover:bg-white/95 ring-white/40 hover:shadow-lg'
                }`}
              >
                Upgrade Plan
              </a>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          type="button"
          className={`flex size-9 items-center justify-center rounded-lg lg:hidden ${
            scrolled ? 'text-gray-700' : 'text-white'
          }`}
          onClick={() => setMobileOpen((o) => !o)}
          aria-label="Toggle menu"
        >
          {!mobileOpen ? (
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="border-t border-white/10 bg-primary-700 lg:hidden">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
                onClick={() => setMobileOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
              {!isLoggedIn ? (
                <>
                  <Link
                    to={SIGN_IN_URL}
                    className="rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white/80 hover:bg-white/10"
                    onClick={() => setMobileOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    to={registerUrl()}
                    className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-primary-700"
                    onClick={() => setMobileOpen(false)}
                  >
                    Start Free Trial
                  </Link>
                </>
              ) : (
                <Link
                  to={APP_URL}
                  className="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-primary-700"
                  onClick={() => setMobileOpen(false)}
                >
                  Go to App
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
