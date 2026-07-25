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

// Genuine iinwentory advantages. VERIFY the `them: false` rows against Sortly.
const STANDOUT: Row[] = [
  {
    feature: 'Dedicated pick & fulfilment mode',
    detail: 'Turn stock into order pick lists your team checks off item by item.',
    us: true,
    them: false,
  },
  {
    feature: 'Custom workflows',
    detail: 'Model your own multi-step processes instead of fixed screens.',
    us: true,
    them: false,
  },
  {
    feature: '50% discount in your first year',
    detail: 'On annual billing — then transparent renewal pricing.',
    us: true,
    them: '—',
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
  { feature: 'Custom fields', us: true, them: true },
  { feature: 'Search across every folder', us: true, them: true },
  { feature: 'Team roles & permissions', us: true, them: true },
  { feature: 'Activity history & reports', us: true, them: true },
  { feature: 'Free plan to start', us: true, them: true },
];

// Plan-level value comparison. iinwentory numbers come straight from plans.ts;
// the Sortly column is a general, verify-before-publish description.
const PRICING = [
  {
    tier: 'Free',
    us: {
      price: '$0',
      line: `${PLANS.free.maxItems} items · ${PLANS.free.maxUsers} user · barcode scanning`,
    },
    them: 'Free tier with entry & scanning limits',
  },
  {
    tier: 'Growing team',
    us: {
      price: `$${PLANS.advanced.yearlyPrice}/mo`,
      line: `${PLANS.advanced.maxItems} items · ${PLANS.advanced.maxUsers} users · billed yearly`,
    },
    them: 'Advanced tier, typically ~$49/mo',
  },
  {
    tier: 'Scaling business',
    us: {
      price: `$${PLANS.ultra.yearlyPrice}/mo`,
      line: `${PLANS.ultra.maxItems.toLocaleString()} items · ${PLANS.ultra.maxUsers} users · billed yearly`,
    },
    them: 'Ultra tier, typically ~$149/mo',
  },
];

const REASONS = [
  {
    title: 'Built for picking, not just counting',
    body: 'A dedicated Pick Mode turns your inventory into order-fulfilment pick lists your team works through item by item — so dispatch and warehousing aren’t bolted-on afterthoughts.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  },
  {
    title: 'Workflows that match how you work',
    body: 'Model your own multi-step processes with custom workflows instead of forcing your operation into fixed screens. Add the fields, tags and steps your business actually uses.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    ),
  },
  {
    title: 'Honest, transparent pricing',
    body: 'A genuinely usable free plan, clear tiers, and a 50% discount in your first year on annual billing. Start a 14-day trial with no credit card and no sales call.',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    a: 'iinwentory is a modern, full-featured Sortly alternative built for the same job — folder-based inventory with photos, custom fields and barcode/QR scanning — while adding a dedicated pick-and-fulfilment mode and custom workflows. It runs on web and mobile with transparent pricing and a genuinely free plan.',
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
    a: 'iinwentory’s tiers are priced competitively with Sortly’s, and annual billing includes a 50% discount in your first year. There’s also a genuinely usable free plan and a 14-day trial with no credit card, so you can compare the value on your own inventory before paying anything. (Compare current pricing on both sites — plans change.)',
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
  return <span className="text-base font-medium text-gray-300">{value}</span>;
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
    const title = 'Best Sortly Alternative (2026) — iinwentory vs Sortly Compared';
    const description =
      'Looking for a Sortly alternative? Compare iinwentory vs Sortly on features and pricing — dedicated pick mode, custom workflows, a free plan and easy migration. No credit card.';
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
              The Sortly alternative your
              <br className="hidden sm:block" />{' '}
              team will <span className="font-accent font-semibold text-gradient-white">actually stick with</span>
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80 leading-relaxed reveal reveal-delay-2">
              Everything you rely on in Sortly — folders, photos, custom fields and barcode scanning —
              plus a dedicated pick-and-fulfilment mode and custom workflows, on web and mobile. Import
              your data and switch in an afternoon.
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
              {['✓ Free plan', '✓ Import from Sortly', '✓ Web & mobile app', '✓ 14-day trial'].map((pill) => (
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
                    <GroupRow label="Where iinwentory pulls ahead" />
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
                Comparable power, transparent pricing
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-lg text-gray-500">
                iinwentory&rsquo;s plans line up with Sortly&rsquo;s tiers — with a 50% first-year discount on annual
                billing and a free plan you can actually run on.
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
