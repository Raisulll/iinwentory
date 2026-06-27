import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../../components/landing/landing.css';
import MarketingFooter from '../../components/landing/MarketingFooter';

interface LegalLayoutProps {
  title: string;
  updated: string;
  children: React.ReactNode;
}

/**
 * Shared chrome for the static legal pages (/terms, /privacy). Wrapped in
 * `.landing-page` so the marketing cascade-layer fix applies and Tailwind
 * utilities render correctly, exactly like the landing page.
 */
export default function LegalLayout({ title, updated, children }: LegalLayoutProps) {
  useEffect(() => {
    document.title = `${title} — iinwentory`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="landing-page min-h-screen bg-bg">
      <style>{legalStyles}</style>

      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4 lg:px-8">
          <Link to="/" className="group flex items-center gap-2.5">
            <img
              src="/imperial-trends-logo.png"
              alt="iinwentory"
              className="size-9 object-contain transition-transform group-hover:scale-105"
            />
            <span className="text-xl font-bold tracking-tight text-primary-700">iinwentory</span>
          </Link>
          <Link
            to="/"
            className="text-sm font-medium text-gray-600 transition-colors hover:text-primary-600"
          >
            ← Back to home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16 lg:px-8">
        <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-gray-500">Last updated: {updated}</p>
        <div className="legal-prose mt-10">{children}</div>
      </main>

      <MarketingFooter />
    </div>
  );
}

const legalStyles = `
  .legal-prose h2 {
    font-size: 1.35rem;
    font-weight: 700;
    color: #1E3B7E;
    margin-top: 2.25rem;
    margin-bottom: 0.75rem;
    letter-spacing: -0.01em;
  }
  .legal-prose p {
    color: #475569;
    line-height: 1.75;
    margin-bottom: 1rem;
    font-size: 0.975rem;
  }
  .legal-prose ul {
    list-style: disc;
    padding-left: 1.4rem;
    margin-bottom: 1.25rem;
    color: #475569;
  }
  .legal-prose li {
    margin-bottom: 0.5rem;
    line-height: 1.65;
    font-size: 0.975rem;
  }
  .legal-prose a {
    color: #294EA7;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
  .legal-prose a:hover { color: #1E3B7E; }
  .legal-prose strong { color: #0f172a; font-weight: 600; }
`;
