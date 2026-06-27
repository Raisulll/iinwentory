import { Link } from 'react-router-dom';
import { APP_URL } from './links';

export default function MarketingFooter() {
  const year = new Date().getFullYear();

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
              <Link to={APP_URL} className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold hover:bg-primary-500 transition-colors">
                Launch App
              </Link>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Product</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Features</a></li>
              <li><a href="#pricing" className="text-sm text-gray-300 hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#how-it-works" className="text-sm text-gray-300 hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#faq" className="text-sm text-gray-300 hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Solutions */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Solutions</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Small Business</a></li>
              <li><a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Enterprise</a></li>
              <li><a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Warehousing</a></li>
              <li><a href="#features" className="text-sm text-gray-300 hover:text-white transition-colors">Retail</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Company</h3>
            <ul className="mt-4 space-y-3">
              <li><a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">About</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Blog</a></li>
              <li><a href="mailto:support@iinwentory.com" className="text-sm text-gray-300 hover:text-white transition-colors">Support</a></li>
              <li><a href="#" className="text-sm text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
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
