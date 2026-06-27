import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUrl } from './links';

const dashboardStats = [
  { label: 'Total Items', value: '2,847', change: '+12%', icon: '📦' },
  { label: 'Locations', value: '24', change: '+3', icon: '📍' },
  { label: 'Low Stock', value: '7', change: '-2', icon: '⚠️' },
  { label: 'Total Value', value: '$84,320', change: '+8%', icon: '💰' },
];

const recentItems = [
  { name: 'MacBook Pro 16in', location: 'Office Storage', qty: 5, value: '$15,995' },
  { name: 'Standing Desk', location: 'Warehouse A', qty: 12, value: '$4,788' },
  { name: 'Office Chair', location: 'Floor 2', qty: 8, value: '$2,392' },
  { name: 'Monitor 27in', location: 'IT Room', qty: 15, value: '$5,985' },
];

const gridSvg = `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`;

export default function HeroSection() {
  // When IntersectionObserver isn't available we can't trigger the count-up,
  // so start at the final value (14) instead of animating from 0.
  const [trialDays, setTrialDays] = useState(() =>
    typeof IntersectionObserver === 'undefined' ? 14 : 0
  );
  const statsRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries[0].isIntersecting) return;
        io.disconnect();
        const target = 14;
        const start = performance.now();
        const dur = 1400;
        const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
        const tick = (now: number) => {
          const p = Math.min(1, (now - start) / dur);
          setTrialDays(Math.round(target * easeOut(p)));
          if (p < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stats = [
    { value: `${trialDays} days`, label: 'Free trial' },
    { value: 'No card', label: 'To start' },
    { value: '~½ price', label: 'vs. Sortly' },
    { value: 'Yours', label: 'Export anytime' },
  ];

  return (
    <>
      <section className="relative min-h-screen overflow-hidden">
        {/* Hero gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800">
          {/* Animated orbs */}
          <div className="absolute -top-40 -right-40 size-[600px] rounded-full bg-primary-500/30 blur-3xl animate-float" />
          <div className="absolute top-1/2 -left-20 size-[400px] rounded-full bg-blue-400/20 blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute bottom-0 right-1/3 size-[300px] rounded-full bg-primary-400/20 blur-3xl animate-float" style={{ animationDelay: '4s' }} />

          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: gridSvg }} />
          {/* Film grain */}
          <div className="grain" />
        </div>

        {/* Content */}
        <div className="relative z-10 mx-auto max-w-7xl px-6 pt-32 pb-20 lg:px-8 lg:pt-40">
          <div className="flex flex-col items-center text-center animate-fade-up">
            {/* Badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur-sm border border-white/20 shadow-lg shadow-primary-900/20">
              <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse" />
              14-Day Free Trial · No Credit Card · Cancel Anytime
            </div>

            {/* Headline */}
            <h1 className="font-display max-w-4xl text-5xl font-extrabold leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Inventory management,
              <br />
              <span className="font-accent text-gradient-white font-semibold">finally done right.</span>
            </h1>

            <p className="mt-6 max-w-2xl text-lg text-white/80 leading-relaxed sm:text-xl">
              Track every item, fold every location, and ship every order from one calm dashboard. Half the price of Sortly, twice as fast to set up.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
              <Link
                to={registerUrl()}
                className="btn-shine group relative inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-primary-700 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/40 transition-all duration-300 hover:bg-white hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)] hover:-translate-y-1 hover:ring-white/80"
              >
                <span>Start Free Trial</span>
                <svg className="size-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20 hover:-translate-y-1 hover:border-white/50"
              >
                View Pricing
              </a>
            </div>

            {/* Honest sub-line */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/70">
              <span className="flex items-center gap-1.5">
                <svg className="size-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" strokeLinecap="round" strokeLinejoin="round" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 7v5l3 2" />
                </svg>
                Set up in an afternoon
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="size-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 3l18 18M8.5 16.5a5 5 0 017 0M5 13a9 9 0 0111.6-1.1M2 8.8A14 14 0 0119 7.3M12 20h.01" />
                </svg>
                Offline Android app
              </span>
              <span className="flex items-center gap-1.5">
                <svg className="size-4 text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v12m0 0l-4-4m4 4l4-4M4 20h16" />
                </svg>
                Export your data anytime
              </span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="relative mx-auto mt-20 max-w-5xl animate-fade-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/5 to-primary-900/60 blur-3xl scale-110 -z-10" />
            <div className="relative rounded-3xl border border-white/20 bg-gradient-to-b from-white/[0.08] to-white/[0.04] backdrop-blur-md shadow-[0_30px_80px_-20px_rgba(0,0,0,0.6)] overflow-hidden ring-1 ring-white/10">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b border-white/10 bg-white/[0.04] px-5 py-3">
                <div className="flex gap-1.5">
                  <div className="size-3 rounded-full bg-red-400/70" />
                  <div className="size-3 rounded-full bg-yellow-400/70" />
                  <div className="size-3 rounded-full bg-green-400/70" />
                </div>
                <div className="mx-auto flex items-center gap-2 rounded-md bg-white/10 px-3 py-1 text-xs text-white/70">
                  <svg className="size-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  app.iinwentory.com/home
                </div>
                <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-300 font-medium">
                  <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> live
                </span>
              </div>

              {/* App preview content */}
              <div className="p-6 lg:p-8">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-6">
                  {dashboardStats.map((stat, i) => (
                    <div
                      key={stat.label}
                      className="rounded-2xl bg-white/[0.07] border border-white/10 p-4 transition-all hover:bg-white/[0.10] hover:-translate-y-0.5"
                      style={{ animationDelay: `${0.3 + i * 0.08}s` }}
                    >
                      <div className="flex items-start justify-between">
                        <span className="text-lg">{stat.icon}</span>
                        <span className="text-[10px] text-emerald-300 font-bold tracking-wide bg-emerald-400/10 px-1.5 py-0.5 rounded-md">{stat.change}</span>
                      </div>
                      <div className="mt-3 text-2xl font-extrabold text-white tracking-tight">{stat.value}</div>
                      <div className="mt-0.5 text-xs text-white/60 font-medium">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="rounded-2xl bg-white/[0.04] border border-white/10 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white/85">Recent items</span>
                      <span className="flex items-center gap-1 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-300 ring-1 ring-emerald-400/30">
                        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        live sync
                      </span>
                    </div>
                    <span className="rounded-full bg-primary-500/30 px-2.5 py-0.5 text-[11px] font-medium text-primary-100 ring-1 ring-primary-400/30">View all →</span>
                  </div>
                  <div className="divide-y divide-white/5">
                    {recentItems.map((item) => (
                      <div key={item.name} className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03] transition-colors">
                        <div className="size-9 rounded-lg bg-gradient-to-br from-primary-400/40 to-primary-600/40 ring-1 ring-white/10 flex items-center justify-center text-sm">📦</div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{item.name}</div>
                          <div className="text-xs text-white/55 mt-0.5">{item.location}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-white">{item.value}</div>
                          <div className="text-[11px] text-white/55 mt-0.5">qty: {item.qty}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute inset-x-0 leading-none" style={{ bottom: '-1px' }}>
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="block w-full fill-bg" preserveAspectRatio="none" style={{ display: 'block' }}>
            <path d="M0 80L60 72C120 64 240 48 360 40C480 32 600 32 720 37.3C840 43 960 53 1080 56C1200 59 1320 56 1380 54.7L1440 53V80H1380C1320 80 1200 80 1080 80C960 80 840 80 720 80C600 80 480 80 360 80C240 80 120 80 60 80H0V80Z" />
          </svg>
        </div>
      </section>

      {/* Stats bar */}
      <section ref={statsRef} className="bg-bg py-14 border-b border-gray-100">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-y-8 gap-x-6 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="font-display text-3xl sm:text-4xl font-extrabold text-primary-600 tracking-tight tabular-nums">{stat.value}</div>
                <div className="mt-1.5 text-xs font-semibold uppercase tracking-widest text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
