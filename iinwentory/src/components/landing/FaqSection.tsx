import { useState } from 'react';

const faqs = [
  {
    q: 'How does the 14-day free trial work?',
    a: 'Start any paid plan with a full 14-day free trial — no credit card required. You get complete access to all features in your chosen plan. At the end of the trial, you can subscribe or downgrade to the Free plan.',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes! Upgrade or downgrade your plan at any time. When you upgrade, you get immediate access to new features. When you downgrade, your plan changes at the end of the current billing cycle.',
  },
  {
    q: 'What counts as a "unique item"?',
    a: 'A unique item is a distinct product or asset type in your inventory. For example, 10 units of the same laptop model counts as 1 unique item. The item limit applies to the number of different item types, not total units.',
  },
  {
    q: 'How does the yearly discount work?',
    a: "When you choose yearly billing, you save 50% in your first year (compared to monthly). After the first year, a 20% discount applies on renewal. You're billed once per year upfront.",
  },
  {
    q: 'Can I use iinwentory offline?',
    a: "Yes! iinwentory is a Progressive Web App (PWA) that works fully offline. Add it to your home screen on any mobile device and access, update, and scan items even without internet. Changes sync automatically when you're back online.",
  },
  {
    q: 'Does iinwentory work with barcode scanners?',
    a: 'Yes — iinwentory supports both the built-in camera scanner on mobile devices and third-party Bluetooth barcode scanners. Any USB or Bluetooth barcode scanner that acts as a keyboard works seamlessly.',
  },
  {
    q: 'Is my data secure?',
    a: 'Absolutely. Your data is encrypted in transit and at rest. We use industry-standard security practices and conduct regular security audits. Enterprise plans include SSO and advanced access controls.',
  },
  {
    q: 'What happens to my data if I cancel?',
    a: "If you downgrade to Free, your data is preserved but access may be limited based on the Free plan limits. If you cancel entirely, you have 30 days to export your data before it's deleted.",
  },
];

export default function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const toggle = (i: number) => setOpenIdx((cur) => (cur === i ? null : i));

  return (
    <section id="faq" className="bg-bg py-24 lg:py-32">
      <div className="mx-auto max-w-4xl px-6 lg:px-8">
        <div className="text-center reveal">
          <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
            FAQ
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Questions, answered honestly
          </h2>
          <p className="mt-5 text-lg text-gray-500">
            Everything you need to know — and the things competitors quietly don't tell you.
          </p>
        </div>

        <div className="mt-16 space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              className={`rounded-2xl bg-white border border-gray-100 overflow-hidden transition-all duration-200 reveal reveal-delay-${(i % 4) + 1} ${
                openIdx === i ? 'shadow-card-hover ring-1 ring-primary-100' : 'shadow-card hover:shadow-card-hover'
              }`}
            >
              <button
                type="button"
                className="flex w-full items-center justify-between px-6 py-5 text-left"
                onClick={() => toggle(i)}
              >
                <span className="text-base font-semibold text-gray-900">{faq.q}</span>
                <svg
                  className={`size-5 shrink-0 text-gray-400 transition-transform duration-200 ml-4 ${
                    openIdx === i ? 'rotate-180 text-primary-600' : ''
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {openIdx === i && (
                <div className="border-t border-gray-100 px-6 pb-5 pt-4">
                  <p className="text-gray-500 leading-relaxed">{faq.a}</p>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-12 text-center rounded-2xl bg-white border border-gray-100 p-8 shadow-sm">
          <p className="text-gray-600">Still have questions?</p>
          <p className="mt-1 text-lg font-semibold text-gray-900">We're here to help.</p>
          <a
            href="mailto:support@iinwentory.com"
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            Contact Support
          </a>
        </div>
      </div>
    </section>
  );
}
