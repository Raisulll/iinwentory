import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useCtaLinks } from './links';

/**
 * Footer link to a section on the landing page. The footer also renders on
 * /terms and /privacy, where these sections don't exist — so when we're not on
 * the landing page we navigate there first, then scroll once the (lazy-loaded)
 * section has mounted.
 */
function SectionLink({ id, children }: { id: string; children: React.ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const scrollToSection = (attempts = 0) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    } else if (attempts < 40) {
      // Landing is lazy-loaded; poll briefly until its sections exist.
      setTimeout(() => scrollToSection(attempts + 1), 50);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // Let modified clicks (new tab, etc.) use the href fallback.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (pathname !== '/') navigate('/');
    scrollToSection();
  };

  return (
    <a
      href={`/#${id}`}
      onClick={handleClick}
      className="text-sm text-gray-300 hover:text-white transition-colors"
    >
      {children}
    </a>
  );
}

export default function MarketingFooter() {
  const year = new Date().getFullYear();
  const { launchApp } = useCtaLinks();

  return (
    <footer className="bg-gray-950 text-white">
      <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <img src="/imperial-trends-logo.png" alt="iinwentory" className="size-9 object-contain" />
              <span className="text-xl font-bold tracking-tight">iinwentory</span>
            </div>
            <p className="mt-4 text-sm text-gray-400 leading-relaxed">
              The smart inventory management solution for businesses of all sizes. Track, manage, and optimize your inventory with ease.
            </p>
            <div className="mt-6 flex gap-3">
              <Link to={launchApp} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold hover:bg-primary-500 transition-colors">
                Launch App
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Product</h3>
            <ul className="mt-4 space-y-3">
              <li><SectionLink id="features">Features</SectionLink></li>
              <li><SectionLink id="pricing">Pricing</SectionLink></li>
              <li><SectionLink id="how-it-works">How It Works</SectionLink></li>
              <li><SectionLink id="faq">FAQ</SectionLink></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Solutions</h3>
            <ul className="mt-4 space-y-3">
              <li><SectionLink id="features">Small Business</SectionLink></li>
              <li><SectionLink id="features">Enterprise</SectionLink></li>
              <li><SectionLink id="features">Warehousing</SectionLink></li>
              <li><SectionLink id="features">Retail</SectionLink></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Company</h3>
            <ul className="mt-4 space-y-3">
              <li><SectionLink id="features">About</SectionLink></li>
              <li><a href="mailto:support@iinwentory.com" className="text-sm text-gray-300 hover:text-white transition-colors">Support</a></li>
              <li><Link to="/privacy" className="text-sm text-gray-300 hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="text-sm text-gray-300 hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-sm text-gray-500">
            &copy; {year} iinwentory. All rights reserved.
          </p>
          <p className="text-sm text-gray-500">
            Inventory management, reimagined.
          </p>
        </div>
      </div>
    </footer>
  );
}
