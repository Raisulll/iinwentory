import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import '../components/landing/landing.css';
import { useReveal } from '../components/landing/useReveal';
import MarketingNav from '../components/landing/MarketingNav';
import MarketingFooter from '../components/landing/MarketingFooter';
import { useCtaLinks } from '../components/landing/links';
import { PLANS } from '../plans';

/* ═══════════════════════════════════════════════════════════════════════════
   "Sortly alternative" comparison landing page  (route: /sortly-alternative)

   Targets the high-intent, low-competition search term "Sortly alternative".
   Structure, palette and chrome mirror the main landing page so it inherits the
   marketing cascade-layer fix (.landing-page) and the shared nav/footer.

   POSITIONING — honest & defensible only.
   iinwentory ships a web app + a native mobile app (like Sortly). We do NOT
   claim offline operation or "installs from the browser / no app store" — the
   web app is online, and offline is not an edge over Sortly anyway. Real
   differentiators we lead on: a dedicated pick & fulfilment mode, custom
   workflows, and transparent pricing (free plan + first-year discount).

   ⚠️  COMPETITOR CLAIMS — VERIFY BEFORE PUBLISHING
   Everything in the `Sortly` column of `STANDOUT` / `PARITY` / `PRICING` is a
   factual claim about a competitor. Feature availability and pricing change and
   vary by plan. Confirm each against sortly.com before going live —
   inaccurate comparative advertising is a legal risk. All such data is isolated
   in the arrays below so it's easy to review and update.
   ═══════════════════════════════════════════════════════════════════════════ */

type Cell = boolean | 'partial' | string;

interface Row {
  feature: string;
  detail?: string;
  us: Cell;
  them: Cell;
}

// Where iinwentory wins — all price/access facts, verified against sortly.com
// (Sortly Advanced $24/mo & Ultra $74/mo billed yearly; free tier 100 items;
// pick lists gated to Ultra; 14-day trial requires a credit card).
const STANDOUT: Row[] = [
  {
    feature: 'Entry paid plan',
    detail: 'iinwentory Advanced vs Sortly Advanced, billed yearly.',
    us: `$${PLANS.advanced.yearlyPrice}/mo`,
    them: '$24/mo',
  },
  {
    feature: 'Next tier up',
    detail: 'iinwentory Premium vs Sortly Ultra, billed yearly.',
    us: `$${PLANS.premium.yearlyPrice}/mo`,
    them: '$74/mo',
  },
  {
    feature: 'Items on the free plan',
    detail: 'Twice the free headroom to get started.',
    us: `${PLANS.free.maxItems}`,
    them: '100',
  },
  {
    feature: 'Free trial without a credit card',
    detail: 'Sortly requires a card and auto-charges when the trial ends.',
    us: true,
    them: false,
  },
  {
    feature: 'Unlimited pick lists from the entry plan',
    detail: 'Sortly reserves pick lists for its $74/mo Ultra tier.',
    us: true,
    them: 'Ultra only',
  },
];

// Parity features — both tools do these well. Being fair here makes the
// STANDOUT rows credible instead of reading as hype.
const PARITY: Row[] = [
  { feature: 'Web app + native mobile app', us: true, them: true },
  { feature: 'Folder organisation with item photos', us: true, them: true },
  {
    feature: 'Barcode & QR scanning',
    detail: 'Camera scanning plus Bluetooth/USB scanner support.',
    us: true,
    them: true,
  },
  { feature: 'Generate QR & barcode labels', us: true, them: true },
  { feature: 'Pick lists & fulfilment', us: true, them: true },
  { feature: 'Custom fields', us: true, them: true },
  { feature: 'Team roles & permissions', us: true, them: true },
  { feature: 'Activity history & reports', us: true, them: true },
];

// Plan-level value comparison. iinwentory numbers come straight from plans.ts;
// the Sortly column is a general, verify-before-publish description.
const PRICING = [
  {
    tier: 'Free',
    us: {
      price: '$0',
      line: `${PLANS.free.maxItems} items · ${PLANS.free.maxUsers} user · pick lists & scanning`,
    },
    them: '100 items · 1 user',
  },
  {
    tier: 'Advanced',
    us: {
      price: `$${PLANS.advanced.yearlyPrice}/mo`,
      line: `${PLANS.advanced.maxItems.toLocaleString()} items · ${PLANS.advanced.maxUsers} users · billed yearly`,
    },
    them: '$24/mo · 500 items · 2 users',
  },
  {
    tier: 'Premium',
    us: {
      price: `$${PLANS.premium.yearlyPrice}/mo`,
      line: `${PLANS.premium.maxItems.toLocaleString()} items · ${PLANS.premium.maxUsers} users · billed yearly`,
    },
    them: 'Ultra: $74/mo · 2,000 items · 5 users',
  },
];

const REASONS = [
  {
    title: 'Up to half the price of Sortly',
    body: `Advanced is $${PLANS.advanced.yearlyPrice}/mo billed yearly ($${PLANS.advanced.monthlyPrice} monthly) against Sortly's $24/$49, and Premium is $${PLANS.premium.yearlyPrice}/mo ($${PLANS.premium.monthlyPrice} monthly) against Sortly's Ultra at $74/$149 — comparable capability for a lot less every month.`,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: 'Start free — no credit card',
    body: 'Try any plan free for 14 days without entering a card. Sortly asks for a credit card up front and auto-charges you when the trial ends. Here, you only pay when you decide to.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M2.25 8.25h19.5M2.25 9V6.75A2.25 2.25 0 014.5 4.5h15a2.25 2.25 0 012.25 2.25v10.5A2.25 2.25 0 0119.5 19.5h-15a2.25 2.25 0 01-2.25-2.25V9z" />
    ),
  },
  {
    title: 'A free plan that does real work',
    body: `${PLANS.free.maxItems} items — twice Sortly's 100 — plus pick lists, barcode and QR scanning, item photos and the mobile app, all at $0. Upgrade only when you actually outgrow it.`,
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H5.25a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12M4.5 7.5h15a.75.75 0 01.75.75v2.25a.75.75 0 01-.75.75h-15a.75.75 0 01-.75-.75V8.25a.75.75 0 01.75-.75z" />
    ),
  },
  {
    title: 'Your data is never locked in',
    body: 'Import from Sortly in minutes and export everything out of iinwentory any time. No hostage data, no per-entry surprises — just your inventory, on web and mobile, wherever your team works.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    ),
  },
];

const STEPS = [
  {
    n: '1',
    title: 'Export from Sortly',
    body: 'Download your items to CSV from your existing Sortly account — quantities, custom fields and all.',
  },
  {
    n: '2',
    title: 'Bring your data into iinwentory',
    body: 'Import your folders and items, then invite your team. Most catalogues are up and running the same afternoon.',
  },
  {
    n: '3',
    title: 'Scan, pick and go',
    body: 'Put iinwentory on your team’s phones and desktop, print fresh QR labels if you need them, and pick up right where you left off.',
  },
];

const FAQS = [
  {
    q: 'What is the best Sortly alternative?',
    a: `iinwentory is a modern, full-featured Sortly alternative built for the same job — folder-based inventory with photos, custom fields, barcode/QR scanning and pick lists — for up to half the price. It runs on web and mobile, starts free with no credit card, and gives you ${PLANS.free.maxItems} items on the free plan (twice Sortly's 100).`,
  },
  {
    q: 'Is there a free Sortly alternative?',
    a: `Yes. iinwentory has a free plan that includes up to ${PLANS.free.maxItems} items, barcode and QR scanning, and folder organisation — no credit card required. Paid plans start at $${PLANS.advanced.yearlyPrice}/month (billed yearly) when you need more items, users or history.`,
  },
  {
    q: 'Can I import my data from Sortly?',
    a: 'Yes. Export your inventory from Sortly to CSV, then import it into iinwentory — folders, quantities and custom fields included. Most teams migrate in an afternoon, and you can export your data out of iinwentory any time too, so there’s no lock-in.',
  },
  {
    q: 'Is iinwentory cheaper than Sortly?',
    a: `Yes. Billed yearly, iinwentory Advanced is $${PLANS.advanced.yearlyPrice}/mo versus Sortly Advanced at $24/mo, and iinwentory Premium is $${PLANS.premium.yearlyPrice}/mo versus Sortly Ultra at $74/mo. On monthly billing it's $${PLANS.advanced.monthlyPrice}/$${PLANS.premium.monthlyPrice} versus Sortly's $49/$149. You also get a free plan and a 14-day trial with no credit card, so you can compare on your own inventory before paying anything.`,
  },
  {
    q: 'Can I use iinwentory on my phone?',
    a: 'Yes. iinwentory has a native mobile app for scanning barcodes, picking orders and updating stock on the go, plus a full web app for managing everything from the desktop — so your team can work from the warehouse floor or the office.',
  },
  {
    q: 'Does iinwentory support barcode and QR scanning?',
    a: 'Yes. Scan barcodes and QR codes in-app with your device camera, connect a Bluetooth or USB scanner, and generate your own QR/barcode labels for items and locations.',
  },
];

/** Green check / grey cross / muted text used in the comparison table. */
function CellMark({ value }: { value: Cell }) {
  if (value === true) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="inline-flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-400 ring-1 ring-gray-200">
        <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </span>
    );
  }
  if (value === 'partial') {
    return <span className="text-sm font-medium text-amber-600">Limited</span>;
  }
  return <span className="text-sm font-semibold text-gray-700">{value}</span>;
}

/** A comparison table body row. iinwentory column carries a persistent tint. */
function CompareRow({ row }: { row: Row }) {
  return (
    <tr className="border-t border-gray-100 transition-colors hover:bg-gray-50/60">
      <td className="px-6 py-4 align-top">
        <div className="text-[15px] font-semibold text-gray-900">{row.feature}</div>
        {row.detail && <div className="mt-0.5 text-sm text-gray-500">{row.detail}</div>}
      </td>
      <td className="bg-primary-50/60 px-6 py-4 text-center align-middle">
        <div className="flex justify-center">
          <CellMark value={row.us} />
        </div>
      </td>
      <td className="px-6 py-4 text-center align-middle">
        <div className="flex justify-center">
          <CellMark value={row.them} />
        </div>
      </td>
    </tr>
  );
}

/** Sub-header row that labels a group of features inside the table. */
function GroupRow({ label }: { label: string }) {
  return (
    <tr>
      <td colSpan={3} className="border-t border-gray-100 bg-gray-50/80 px-6 py-3">
        <span className="text-xs font-bold uppercase tracking-wider text-primary-700">{label}</span>
      </td>
    </tr>
  );
}

export default function SortlyAlternative() {
  useReveal();
  const { getStarted } = useCtaLinks();

  // Per-page SEO head: override the global <title>, meta description and
  // canonical (index.html points them at "/"), and inject FAQPage structured
  // data for rich results. Everything is restored on unmount so navigating back
  // to the app doesn't leak this page's tags.
  useEffect(() => {
    const title = 'Best Sortly Alternative (2026) — Up to Half the Price | iinwentory';
    const description =
      "Looking for a Sortly alternative? iinwentory matches Sortly's features for up to half the price — from $15/mo, a free plan with 200 items, and a 14-day trial with no credit card.";
    const canonicalHref = 'https://iinwentory.com/sortly-alternative';

    const prevTitle = document.title;
    document.title = title;

    const setMeta = (selector: string, attr: 'name' | 'property', key: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      return { el, prev: el.getAttribute('content') };
    };

    const desc = setMeta('meta[name="description"]', 'name', 'description');
    desc.el.setAttribute('content', description);
    const ogTitle = setMeta('meta[property="og:title"]', 'property', 'og:title');
    ogTitle.el.setAttribute('content', title);
    const ogDesc = setMeta('meta[property="og:description"]', 'property', 'og:description');
    ogDesc.el.setAttribute('content', description);
    const ogUrl = setMeta('meta[property="og:url"]', 'property', 'og:url');
    ogUrl.el.setAttribute('content', canonicalHref);

    // Canonical
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    const prevCanonical = canonical?.getAttribute('href') ?? null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalHref);

    // FAQPage structured data
    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.setAttribute('data-page', 'sortly-alternative');
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: FAQS.map((f) => ({
        '@type': 'Question',
        name: f.q,
        acceptedAnswer: { '@type': 'Answer', text: f.a },
      })),
    });
    document.head.appendChild(ld);

    window.scrollTo(0, 0);

    return () => {
      document.title = prevTitle;
      desc.el.setAttribute('content', desc.prev ?? '');
      ogTitle.el.setAttribute('content', ogTitle.prev ?? '');
      ogDesc.el.setAttribute('content', ogDesc.prev ?? '');
      ogUrl.el.setAttribute('content', ogUrl.prev ?? '');
      if (prevCanonical !== null) canonical?.setAttribute('href', prevCanonical);
      ld.remove();
    };
  }, []);

  return (
    <div className="landing-page min-h-screen bg-bg">
      <MarketingNav />

      <main>
        {/* ─────────────  Hero  ───────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 pt-32 pb-24 lg:pt-40 lg:pb-32">
          <div className="grain" />
          <div className="absolute -top-32 -right-24 size-96 rounded-full bg-primary-400/30 blur-3xl animate-float" />
          <div className="absolute -bottom-40 -left-24 size-96 rounded-full bg-primary-900/50 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

          <div className="relative mx-auto max-w-4xl px-6 text-center lg:px-8">
            <div className="mb-5 inline-flex items-center rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-sm font-semibold text-white/90 backdrop-blur-sm reveal">
              <span className="mr-2 flex size-2 rounded-full bg-emerald-400 animate-pulse" />
              Sortly alternative · Compared side by side
            </div>

            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl lg:text-6xl reveal reveal-delay-1">
              The Sortly alternative at
              <br className="hidden sm:block" />{' '}
              <span className="font-accent font-semibold text-gradient-white">up to half the price</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 leading-relaxed reveal reveal-delay-2">
              Everything you rely on in Sortly — folders, photos, custom fields, barcode scanning and pick
              lists — from ${PLANS.advanced.yearlyPrice}/month instead of $24. Start free with no credit card,
              import your data, and switch in an afternoon.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center reveal reveal-delay-3">
              <Link
                to={getStarted}
                className="btn-shine group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-primary-700 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/40 transition-all duration-300 hover:-translate-y-1 hover:ring-white/80"
              >
                Start Free — No Card
                <svg className="size-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#comparison"
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-8 py-4 text-base font-semibold text-white backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-white/50 hover:bg-white/20"
              >
                See the comparison
              </a>
            </div>

            <div className="mt-10 flex flex-wrap justify-center gap-3 reveal reveal-delay-4">
              {[`✓ From $${PLANS.advanced.yearlyPrice}/mo`, '✓ No credit card', `✓ ${PLANS.free.maxItems} free items`, '✓ Import from Sortly'].map((pill) => (
                <div key={pill} className="rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/80">
                  {pill}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────  Comparison table  ───────────── */}
        <section id="comparison" className="bg-bg py-24 lg:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center reveal">
              <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
                iinwentory vs Sortly
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                A feature-by-feature comparison
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
                Both cover the inventory basics well. Here&rsquo;s where iinwentory pulls ahead — and where
                we&rsquo;re happy to call it even.
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-card reveal">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] border-collapse text-left">
                  <thead>
                    <tr>
                      <th className="px-6 pt-7 pb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
                        Compare
                      </th>
                      <th className="bg-primary-50/60 px-6 pt-7 pb-4 text-center align-bottom">
                        <div className="mx-auto inline-flex flex-col items-center gap-1">
                          <span className="text-lg font-extrabold text-primary-700">iinwentory</span>
                          <span className="rounded-full bg-primary-600 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                            Recommended
                          </span>
                        </div>
                      </th>
                      <th className="px-6 pt-7 pb-4 text-center align-bottom text-lg font-bold text-gray-500">
                        Sortly
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <GroupRow label="Where iinwentory wins" />
                    {STANDOUT.map((row) => (
                      <CompareRow key={row.feature} row={row} />
                    ))}
                    <GroupRow label="Core inventory features — in both" />
                    {PARITY.map((row) => (
                      <CompareRow key={row.feature} row={row} />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* In-card CTA bar */}
              <div className="flex flex-col items-center justify-between gap-4 border-t border-gray-100 bg-bg px-6 py-6 sm:flex-row">
                <p className="text-sm text-gray-600">
                  Same inventory basics — plus a few things worth switching for.
                </p>
                <Link
                  to={getStarted}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  Switch free — no card
                  <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>

            <p className="mt-6 text-center text-xs text-gray-400">
              Comparison reflects publicly available information and is provided in good faith; verify current
              Sortly features and pricing at sortly.com. Sortly is a trademark of its respective owner and is not
              affiliated with iinwentory.
            </p>
          </div>
        </section>

        {/* ─────────────  Why teams switch  ───────────── */}
        <section id="features" className="bg-white py-24 lg:py-32">
          <div className="mx-auto max-w-6xl px-6 lg:px-8">
            <div className="text-center reveal">
              <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
                Why teams switch
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Four reasons people move off Sortly
              </h2>
            </div>

            <div className="mt-16 grid gap-6 md:grid-cols-2">
              {REASONS.map((r, i) => (
                <div
                  key={r.title}
                  className={`group rounded-2xl border border-gray-100 bg-bg p-8 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover reveal reveal-delay-${(i % 4) + 1}`}
                >
                  <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-300/40 transition-transform group-hover:scale-105">
                    <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      {r.icon}
                    </svg>
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-gray-900">{r.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray-500">{r.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────  Pricing comparison  ───────────── */}
        <section id="pricing" className="bg-bg py-24 lg:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center reveal">
              <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
                Pricing
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Same tiers, up to half the price
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
                iinwentory&rsquo;s plans line up with Sortly&rsquo;s tiers — for less every month, with a free plan
                you can actually run on and no credit card to start.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-3">
              {PRICING.map((p, i) => (
                <div
                  key={p.tier}
                  className={`rounded-2xl border bg-white p-7 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover reveal reveal-delay-${i + 1} ${
                    i === 1 ? 'border-primary-300 ring-1 ring-primary-200' : 'border-gray-100'
                  }`}
                >
                  <div className="text-sm font-semibold uppercase tracking-wider text-gray-400">{p.tier}</div>
                  <div className="mt-4 flex items-baseline gap-1.5">
                    <span className="text-3xl font-extrabold text-gray-900">{p.us.price}</span>
                    <span className="text-sm font-semibold text-primary-600">iinwentory</span>
                  </div>
                  <p className="mt-2 text-sm text-gray-500">{p.us.line}</p>
                  <div className="my-5 border-t border-dashed border-gray-200" />
                  <div className="text-sm text-gray-400">
                    <span className="font-semibold text-gray-500">Sortly:</span> {p.them}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-8 text-center text-sm text-gray-500">
              Enterprise plans with unlimited items and SSO are available on both.{' '}
              <Link to={getStarted} className="font-semibold text-primary-600 hover:text-primary-700">
                Start your free trial →
              </Link>
            </p>
          </div>
        </section>

        {/* ─────────────  Migration steps  ───────────── */}
        <section id="how-it-works" className="bg-white py-24 lg:py-32">
          <div className="mx-auto max-w-5xl px-6 lg:px-8">
            <div className="text-center reveal">
              <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
                Switching is easy
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Move from Sortly in an afternoon
              </h2>
            </div>

            <div className="relative mt-16 grid gap-8 md:grid-cols-3">
              {/* Connector line on desktop */}
              <div className="pointer-events-none absolute left-0 right-0 top-6 hidden h-px bg-gradient-to-r from-transparent via-primary-200 to-transparent md:block" />
              {STEPS.map((s, i) => (
                <div key={s.n} className={`relative reveal reveal-delay-${i + 1}`}>
                  <div className="relative flex size-12 items-center justify-center rounded-2xl bg-primary-600 text-lg font-bold text-white shadow-card ring-4 ring-bg">
                    {s.n}
                  </div>
                  <h3 className="mt-5 text-xl font-bold text-gray-900">{s.title}</h3>
                  <p className="mt-2 leading-relaxed text-gray-500">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────  FAQ  ───────────── */}
        <section id="faq" className="bg-bg py-24 lg:py-32">
          <div className="mx-auto max-w-4xl px-6 lg:px-8">
            <div className="text-center reveal">
              <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
                FAQ
              </div>
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Sortly alternative — your questions
              </h2>
            </div>

            <div className="mt-14 space-y-4">
              {FAQS.map((f, i) => (
                <div
                  key={f.q}
                  className={`rounded-2xl border border-gray-100 bg-white p-6 shadow-card transition-shadow hover:shadow-card-hover reveal reveal-delay-${(i % 4) + 1}`}
                >
                  <h3 className="flex items-start gap-3 text-lg font-semibold text-gray-900">
                    <span className="mt-0.5 text-primary-500">Q.</span>
                    {f.q}
                  </h3>
                  <p className="mt-2 pl-7 leading-relaxed text-gray-500">{f.a}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─────────────  Final CTA  ───────────── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 py-24 lg:py-32">
          <div className="grain" />
          <div className="absolute -top-32 -right-32 size-96 rounded-full bg-primary-400/30 blur-3xl animate-float" />
          <div className="relative mx-auto max-w-3xl px-6 text-center lg:px-8 reveal">
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Give the Sortly alternative a try
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
              Start a 14-day trial with no credit card. Import your inventory, put it on your team&rsquo;s
              devices, and see the difference on your own stock. Leave any time with all your data.
            </p>
            <div className="mt-10">
              <Link
                to={getStarted}
                className="btn-shine group inline-flex items-center gap-2 rounded-2xl bg-white px-8 py-4 text-base font-bold text-primary-700 shadow-[0_20px_50px_-12px_rgba(0,0,0,0.5)] ring-1 ring-white/40 transition-all duration-300 hover:-translate-y-1 hover:ring-white/80"
              >
                Start Your Free Trial
                <svg className="size-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <MarketingFooter />
    </div>
  );
}
