import { Link } from 'react-router-dom';
import { useCtaLinks } from './links';

const pills = [
  '✓ Free 14-day trial',
  '✓ No credit card needed',
  '✓ Cancel anytime',
  '✓ Import existing data',
  '✓ Setup in minutes',
];

export default function CtaSection() {
  const { getStarted } = useCtaLinks();
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-24 lg:py-32">
      {/* Background orbs */}
      <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary-400/30 blur-3xl animate-float" />
      <div className="absolute -bottom-32 -left-32 size-96 rounded-full bg-primary-800/60 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

      <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8 reveal">
        <div className="mb-4 inline-flex items-center rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-sm">
          <span className="flex size-2 rounded-full bg-emerald-400 animate-pulse mr-2" />
          14-Day Free Trial · No Card · Cancel Anytime
        </div>

        <h2 className="font-display text-4xl font-extrabold text-white sm:text-5xl lg:text-6xl leading-[1.02] tracking-tight">
          Stop counting with
          <br />
          <span className="font-accent font-semibold text-gradient-white">spreadsheets.</span>
        </h2>

        <p className="mt-6 text-xl text-white/80 leading-relaxed max-w-2xl mx-auto">
          Begin a 14-day trial. No credit card. No sales call. If it doesn't work, leave with all your data — we'll never know you were here.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            to={getStarted}
            className="btn-shine group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-primary-700 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/40 transition-all duration-300 hover:bg-white hover:-translate-y-1 hover:ring-white/80 hover:shadow-[0_24px_60px_-12px_rgba(0,0,0,0.6)]"
          >
            Start Your Free Trial
            <svg className="size-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="#pricing"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/20 transition-all duration-300 hover:-translate-y-1 hover:border-white/50"
          >
            View Pricing
          </a>
        </div>

        {/* Feature pills */}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          {pills.map((feat, i) => (
            <div
              key={feat}
              className={`reveal rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80 transition-all duration-300 hover:-translate-y-0.5 hover:bg-white/20 hover:border-white/30 hover:text-white reveal-delay-${i + 1}`}
            >
              {feat}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
