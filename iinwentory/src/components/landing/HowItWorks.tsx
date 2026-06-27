import { Link } from 'react-router-dom';
import { registerUrl } from './links';

const steps = [
  {
    num: '01',
    title: 'Sign Up in Seconds',
    description: 'Create your free account — no credit card required. Start your 14-day trial of any plan, instantly.',
    icon: '🚀',
  },
  {
    num: '02',
    title: 'Add Your Inventory',
    description: 'Import existing inventory via CSV or add items manually. Attach photos, set custom fields, and organize into locations.',
    icon: '📋',
  },
  {
    num: '03',
    title: 'Label & Scan',
    description: 'Print QR code labels for your items. Scan them with any mobile device to instantly look up, update, or check out items.',
    icon: '🏷️',
  },
  {
    num: '04',
    title: 'Track & Report',
    description: 'Monitor stock levels in real time. Set low stock alerts, view activity history, and export reports whenever you need them.',
    icon: '📊',
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-white py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center reveal">
          <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
            Simple to start
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Up and running in an afternoon
          </h2>
          <p className="mt-5 text-lg text-gray-500">
            No demo call. No "implementation consultant." Just four straightforward steps from signup to scanning your first item.
          </p>
        </div>

        <div className="mt-20 grid gap-8 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={step.num} className={`relative reveal reveal-delay-${i + 1}`}>
              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="absolute left-full top-10 hidden w-full -translate-x-1/2 lg:block">
                  <div className="h-px w-full bg-gradient-to-r from-primary-300 to-primary-100" />
                </div>
              )}

              <div className="flex flex-col">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl shadow-lg shadow-primary-300/40 ring-1 ring-white/40">
                    {step.icon}
                  </div>
                  <span className="text-5xl font-black text-primary-100 tracking-tight">{step.num}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">{step.title}</h3>
                <p className="mt-2 text-gray-500 leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-16 text-center">
          <Link
            to={registerUrl()}
            className="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 hover:-translate-y-1 hover:shadow-xl"
          >
            Get Started Free
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <p className="mt-3 text-sm text-gray-400">No credit card required. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}
