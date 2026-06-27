import { Fragment, useState } from 'react';
import { Link } from 'react-router-dom';
import { registerUrl } from './links';

type Billing = 'yearly' | 'monthly';

interface Plan {
  id: string;
  name: string;
  tagline: string;
  badge: string | null;
  monthlyPrice: number | null;
  yearlyPrice: number | null;
  yearlySavings: string | null;
  yearlyBilled: string | null;
  cta: string;
  ctaHref: string;
  features: string[];
}

const plans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    tagline: 'Best for getting started.',
    badge: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlySavings: null,
    yearlyBilled: null,
    cta: 'Sign Up',
    ctaHref: registerUrl(),
    features: [
      '100 Unique Items',
      '1 User License',
      'In-app QR Code Scanning',
      'Item Photos',
      'Inventory Lists',
      'Low Stock Alerts',
      '1 Month Activity History',
      'Mobile App (PWA)',
    ],
  },
  {
    id: 'advanced',
    name: 'Advanced',
    tagline: 'Best for maintaining optimal inventory levels.',
    badge: null,
    monthlyPrice: 49,
    yearlyPrice: 24,
    yearlySavings: 'Save $300',
    yearlyBilled: 'Billed at $288/yr',
    cta: 'Start Free Trial',
    ctaHref: registerUrl('advanced'),
    features: [
      '500 Unique Items',
      '2 User Licenses',
      'Unlimited QR Code Labels',
      'Unlimited Barcode Scanning',
      'Custom Fields (5)',
      'Custom Tags & Folders',
      'Item Check-in/Check-out',
      '1 Year Activity History',
      'Slack Notifications',
    ],
  },
  {
    id: 'ultra',
    name: 'Ultra',
    tagline: 'Best for simplifying day-to-day inventory tasks.',
    badge: 'Most Popular',
    monthlyPrice: 149,
    yearlyPrice: 74,
    yearlySavings: 'Save $900',
    yearlyBilled: 'Billed at $888/yr',
    cta: 'Start Free Trial',
    ctaHref: registerUrl('ultra'),
    features: [
      '2,000 Unique Items',
      '5 User Licenses',
      'Unlimited QR & Barcode Labels',
      'Purchase Orders',
      'Pick Lists',
      'Stock Counts',
      'Custom Fields (10)',
      '3 Years Activity History',
      'Slack & Microsoft Teams',
      'Amazon Business US',
    ],
  },
  {
    id: 'premium',
    name: 'Premium',
    tagline: 'Best for streamlining inventory processes and oversight.',
    badge: null,
    monthlyPrice: 299,
    yearlyPrice: 149,
    yearlySavings: 'Save $1800',
    yearlyBilled: 'Billed at $1,788/yr',
    cta: 'Start Free Trial',
    ctaHref: registerUrl('premium'),
    features: [
      '5,000 Unique Items',
      '8 User Licenses',
      'Customizable Role Permissions',
      'QuickBooks Online Integration',
      'Custom Fields (20)',
      'Online Orders',
      'Unlimited Activity History',
      'Saved Reports & Subscriptions',
      'Limited Access Seats',
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    tagline: 'Best for customized inventory processes and control.',
    badge: null,
    monthlyPrice: null,
    yearlyPrice: null,
    yearlySavings: null,
    yearlyBilled: null,
    cta: 'Talk to Sales',
    ctaHref: 'mailto:sales@iinwentory.com',
    features: [
      '10,000+ Unique Items',
      '12+ User Licenses',
      'API & Webhooks',
      'SSO Integration',
      'Dedicated Customer Success Manager',
      'Unlimited Custom Fields',
      'Multi-account Access',
      'Custom Integrations',
      'SLA & Priority Support',
    ],
  },
];

const planNames = ['Free', 'Advanced', 'Ultra', 'Premium', 'Enterprise'];

type CellValue = string | boolean;
interface CompareCategory {
  name: string;
  rows: { label: string; values: CellValue[] }[];
}

const compareCategories: CompareCategory[] = [
  {
    name: 'ORGANIZE',
    rows: [
      { label: 'Unique Items', values: ['100', '500', '2,000', '5,000', '10,000+'] },
      { label: 'User Licenses', values: ['1', '2', '5', '8', '12+'] },
      { label: 'Inventory Import', values: [true, true, true, true, true] },
      { label: 'Item Photos', values: [true, true, true, true, true] },
      { label: 'Inventory Lists', values: [true, true, true, true, true] },
    ],
  },
  {
    name: 'CUSTOMIZE',
    rows: [
      { label: 'Custom Fields', values: ['1', '5', '10', '20', 'Unlimited'] },
      { label: 'Custom Folders', values: [true, true, true, true, true] },
      { label: 'Custom Tags', values: [true, true, true, true, true] },
      { label: 'Custom Units of Measurement', values: [false, true, true, true, true] },
      { label: 'Customizable User Access', values: [false, false, true, true, true] },
      { label: 'Customizable Role Permissions', values: [false, false, false, true, true] },
      { label: 'Limited Access Seats', values: [false, true, true, true, true] },
      { label: 'Multi-account Access (MAA)', values: [false, false, false, true, true] },
    ],
  },
  {
    name: 'MANAGE',
    rows: [
      { label: 'In-app Barcode & QR Code Scanning', values: [true, true, true, true, true] },
      { label: '3rd-party Scanner Support', values: [true, true, true, true, true] },
      { label: 'QR Code Label Creation', values: [true, true, true, true, true] },
      { label: 'Barcode Label Creation', values: [false, true, true, true, true] },
      { label: 'Item Check-in/Check-out', values: [false, true, true, true, true] },
      { label: 'Purchase Orders', values: [false, false, true, true, true] },
      { label: 'Pick Lists', values: [false, false, true, true, true] },
      { label: 'Stock Counts', values: [false, false, true, true, true] },
      { label: 'Online Orders', values: [false, false, false, true, true] },
    ],
  },
  {
    name: 'TRACK AND UPDATE',
    rows: [
      { label: 'Low Stock Alerts', values: [true, true, true, true, true] },
      { label: 'Date-based Alerts', values: [true, true, true, true, true] },
      { label: 'Offline Mobile Access', values: [true, true, true, true, true] },
      { label: 'Automatic Sync', values: [true, true, true, true, true] },
      { label: 'In-app Alerts', values: [true, true, true, true, true] },
      { label: 'Email Alerts', values: [true, true, true, true, true] },
    ],
  },
  {
    name: 'REPORT',
    rows: [
      { label: 'Activity History', values: ['1 month', '1 year', '3 years', 'Unlimited', 'Unlimited'] },
      { label: 'Transaction Reports', values: ['1-month limit', '1-year limit', '3-year limit', 'Unlimited', 'Unlimited'] },
      { label: 'Activity History Reports', values: [true, true, true, true, true] },
      { label: 'Inventory Summary Reports', values: [true, true, true, true, true] },
      { label: 'Low Stock Reports', values: [true, true, true, true, true] },
      { label: 'Move Summary Reports', values: [false, true, true, true, true] },
      { label: 'Item Flow Reports', values: [false, true, true, true, true] },
      { label: 'Saved Reports', values: [false, false, true, true, true] },
      { label: 'Report Subscriptions', values: [false, false, true, true, true] },
    ],
  },
  {
    name: 'INTEGRATIONS',
    rows: [
      { label: 'Slack', values: [false, true, true, true, true] },
      { label: 'Microsoft Teams', values: [false, false, true, true, true] },
      { label: 'Amazon Business US', values: [false, false, true, true, true] },
      { label: 'QuickBooks Online', values: [false, false, false, true, true] },
      { label: 'Webhooks', values: [false, false, false, false, true] },
      { label: 'API', values: [false, false, false, false, true] },
      { label: 'SSO', values: [false, false, false, false, true] },
    ],
  },
];

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function CtaLink({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  // External (mailto) links use a plain anchor; internal routes use react-router.
  if (href.startsWith('mailto:') || href.startsWith('http')) {
    return <a href={href} className={className}>{children}</a>;
  }
  return <Link to={href} className={className}>{children}</Link>;
}

export default function PricingSection() {
  const [billing, setBilling] = useState<Billing>('yearly');
  const [showCompare, setShowCompare] = useState(false);

  const displayPrice = (plan: Plan) =>
    plan.monthlyPrice === null ? null : billing === 'yearly' ? plan.yearlyPrice : plan.monthlyPrice;

  return (
    <section id="pricing" className="bg-bg py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Header */}
        <div className="mx-auto max-w-3xl text-center reveal">
          <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
            Honest pricing
          </div>
          <h2 className="font-display text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Half the price of Sortly.
            <br />
            <span className="font-accent text-primary-700 font-semibold">Same scope of work.</span>
          </h2>
          <p className="mt-5 text-lg text-gray-500">
            Start with 14 days of any plan, free. No card required. Cancel in a click. We update this page every time a competitor changes their pricing.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 relative inline-block">
            <span className="pointer-events-none absolute -top-3 left-[28%] -translate-x-1/2 z-20 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-500/40 ring-2 ring-bg">
              Save 50%
            </span>
            <div className="relative inline-flex items-center rounded-2xl bg-white border border-gray-200 p-1.5 shadow-sm">
              <span
                aria-hidden="true"
                className="absolute top-1.5 bottom-1.5 rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30 transition-all duration-300 ease-out"
                style={
                  billing === 'yearly'
                    ? { left: '6px', width: 'calc(50% - 6px)' }
                    : { left: 'calc(50% + 0px)', width: 'calc(50% - 6px)' }
                }
              />
              <button
                type="button"
                className={`relative z-10 rounded-xl px-8 py-2.5 text-sm font-semibold transition-colors duration-200 min-w-[120px] text-center ${
                  billing === 'yearly' ? 'text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setBilling('yearly')}
              >
                Yearly
              </button>
              <button
                type="button"
                className={`relative z-10 rounded-xl px-8 py-2.5 text-sm font-semibold transition-colors duration-200 min-w-[120px] text-center ${
                  billing === 'monthly' ? 'text-white' : 'text-gray-500 hover:text-gray-900'
                }`}
                onClick={() => setBilling('monthly')}
              >
                Monthly
              </button>
            </div>
          </div>

          {billing === 'yearly' && (
            <p className="mt-3 text-xs text-gray-400">
              * 50% discount applies only to first year of new customer subscriptions. After the first year, a 20% discount applies to all yearly plans.
            </p>
          )}
        </div>

        {/* Pricing cards */}
        <div className="mt-16 grid gap-6 lg:grid-cols-5">
          {plans.map((plan, i) => {
            const isUltra = plan.id === 'ultra';
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-3xl border transition-all duration-300 reveal reveal-delay-${i + 1} ${
                  isUltra
                    ? 'border-primary-400 bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-300/40 -mt-4 lg:scale-105 ring-1 ring-primary-400/50'
                    : 'border-gray-200 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-1'
                }`}
              >
                {isUltra && (
                  <div
                    aria-hidden="true"
                    className="halo-pulse pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] blur-2xl"
                    style={{ background: 'radial-gradient(60% 60% at 50% 50%, rgba(74,125,212,0.55) 0%, rgba(41,78,167,0.25) 45%, transparent 75%)' }}
                  />
                )}
                {plan.badge && (
                  <div className="absolute -top-4 inset-x-0 flex justify-center">
                    <span className="rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow-lg">
                      ★ {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex flex-1 flex-col p-6">
                  <div>
                    <h3 className={`text-lg font-bold ${isUltra ? 'text-white' : 'text-gray-900'}`}>{plan.name}</h3>
                    <p className={`mt-1 text-xs ${isUltra ? 'text-white/70' : 'text-gray-500'}`}>{plan.tagline}</p>
                  </div>

                  {/* Price */}
                  <div className="mt-5">
                    {plan.monthlyPrice !== null ? (
                      <>
                        <div className="relative flex items-end gap-1 h-12">
                          <span className={`text-4xl font-extrabold tabular-nums ${isUltra ? 'text-white' : 'text-gray-900'}`}>
                            ${displayPrice(plan)}
                          </span>
                          <span className={`mb-1 text-sm ${isUltra ? 'text-white/70' : 'text-gray-500'}`}>USD/mo</span>
                        </div>
                        {billing === 'yearly' && plan.yearlySavings && (
                          <div className="mt-1">
                            <span className={`text-xs font-semibold ${isUltra ? 'text-emerald-300' : 'text-emerald-600'}`}>
                              {plan.yearlySavings}!
                            </span>
                            <span className={`ml-1 text-xs ${isUltra ? 'text-white/60' : 'text-gray-400'}`}>
                              {plan.yearlyBilled}.
                            </span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className={`text-2xl font-bold ${isUltra ? 'text-white' : 'text-gray-900'}`}>Get a Quote</div>
                        <div className={`mt-1 text-xs ${isUltra ? 'text-white/70' : 'text-gray-500'}`}>Custom pricing for large teams</div>
                      </>
                    )}
                  </div>

                  {/* CTA */}
                  <CtaLink
                    href={plan.ctaHref}
                    className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-bold transition-all duration-200 ${
                      isUltra
                        ? 'bg-white text-primary-700 hover:bg-white/90 shadow-lg'
                        : 'border border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white'
                    }`}
                  >
                    {plan.cta}
                  </CtaLink>

                  {/* Features */}
                  <ul className="mt-6 flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className={`flex items-start gap-2.5 text-sm ${isUltra ? 'text-white/85' : 'text-gray-600'}`}>
                        <CheckIcon className={`mt-0.5 size-4 shrink-0 ${isUltra ? 'text-emerald-300' : 'text-emerald-500'}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* Compare plans toggle */}
        <div className="mt-16 text-center">
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
            onClick={() => setShowCompare((s) => !s)}
          >
            <span>{showCompare ? 'Hide' : 'Compare'} Plans</span>
            <svg className={`size-4 transition-transform duration-200 ${showCompare ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {/* Comparison table */}
        {showCompare && (
          <div className="mt-8 overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="py-4 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-48">Feature</th>
                  {planNames.map((name) => (
                    <th key={name} className={`px-4 py-4 text-center text-xs font-bold ${name === 'Ultra' ? 'text-primary-600 bg-primary-50' : 'text-gray-700'}`}>
                      {name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {compareCategories.map((cat) => (
                  <Fragment key={cat.name}>
                    <tr>
                      <td colSpan={6} className="bg-gray-50 px-6 py-2.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">{cat.name}</span>
                      </td>
                    </tr>
                    {cat.rows.map((row) => (
                      <tr key={row.label} className="border-t border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 pl-6 pr-4 text-gray-600">{row.label}</td>
                        {row.values.map((val, idx) => (
                          <td key={idx} className={`px-4 py-3 text-center ${idx === 2 ? 'bg-primary-50/50' : ''}`}>
                            {typeof val === 'boolean' ? (
                              val ? (
                                <CheckIcon className="mx-auto size-4 text-emerald-500" />
                              ) : (
                                <svg className="mx-auto size-4 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              )
                            ) : (
                              <span className="font-medium text-gray-700">{val}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-100">
                  <td className="py-4 pl-6" />
                  {plans.map((plan, idx) => (
                    <td key={plan.id} className={`px-3 py-4 text-center ${idx === 2 ? 'bg-primary-50/50' : ''}`}>
                      <CtaLink
                        href={plan.ctaHref}
                        className={`inline-block rounded-xl px-3 py-2 text-xs font-bold transition-all ${
                          plan.id === 'ultra' ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-primary-500 text-primary-600 hover:bg-primary-50'
                        }`}
                      >
                        {plan.cta}
                      </CtaLink>
                    </td>
                  ))}
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
