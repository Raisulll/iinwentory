const testimonials = [
  {
    quote: 'iinwentory completely transformed how we manage our warehouse. We went from spreadsheets to real-time tracking in a single afternoon. The QR code labels alone saved us hours every week.',
    name: 'Sarah Chen',
    role: 'Operations Manager',
    company: 'BuildRight Supply Co.',
    avatar: 'SC',
    rating: 5,
    plan: 'Ultra',
  },
  {
    quote: 'We tried three other inventory systems before iinwentory. Nothing else came close to the simplicity combined with actual power. Our team of 8 was fully onboarded in a day.',
    name: 'Marcus Johnson',
    role: 'Founder & CEO',
    company: 'TechParts Direct',
    avatar: 'MJ',
    rating: 5,
    plan: 'Premium',
  },
  {
    quote: 'The low stock alerts and reporting features have saved us from stockouts multiple times. The QuickBooks integration means our accounting is always accurate without double-entry.',
    name: 'Emma Rodriguez',
    role: 'Inventory Director',
    company: 'MegaStore Retail',
    avatar: 'ER',
    rating: 5,
    plan: 'Premium',
  },
  {
    quote: 'As a small business, I needed something affordable but powerful. The Free plan got me started, and I upgraded to Advanced within a week when I saw how much time it saved.',
    name: 'David Kim',
    role: 'Owner',
    company: "Kim's Electronics Repair",
    avatar: 'DK',
    rating: 5,
    plan: 'Advanced',
  },
  {
    quote: 'The offline mobile access is a game-changer for our fieldwork. We can update inventory in locations with no signal, and it syncs perfectly when we\'re back online.',
    name: 'Lisa Thompson',
    role: 'Field Operations Lead',
    company: 'Horizon Equipment',
    avatar: 'LT',
    rating: 5,
    plan: 'Ultra',
  },
  {
    quote: 'We manage 8,000+ items across 5 locations. The Enterprise plan with dedicated support and custom integrations was exactly what we needed. Setup was seamless.',
    name: 'Robert Park',
    role: 'Supply Chain VP',
    company: 'Global Distributions Inc.',
    avatar: 'RP',
    rating: 5,
    plan: 'Enterprise',
  },
];

const planColors: Record<string, string> = {
  Free: 'bg-gray-100 text-gray-600',
  Advanced: 'bg-blue-100 text-blue-700',
  Ultra: 'bg-primary-100 text-primary-700',
  Premium: 'bg-purple-100 text-purple-700',
  Enterprise: 'bg-gray-900 text-white',
};

export default function TestimonialsSection() {
  return (
    <section className="bg-white py-16 sm:py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center reveal">
          <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
            Customer Stories
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Used every day by operators
            <br />
            who count for a living
          </h2>
          <p className="mt-5 text-lg text-gray-500">
            From solo retailers to multi-location workshops, the operators on iinwentory don't just track inventory — they run their business on it.
          </p>
        </div>

        <div className="mt-12 sm:mt-16 grid gap-4 sm:gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <div
              key={t.name}
              className={`relative rounded-2xl bg-white border border-gray-100 p-5 sm:p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 break-words reveal reveal-delay-${(i % 3) + 1}`}
            >
              {/* Stars */}
              <div className="flex gap-0.5 mb-4">
                {Array.from({ length: t.rating }).map((_, s) => (
                  <svg key={s} className="size-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>

              <blockquote className="text-sm text-gray-600 leading-relaxed break-words">
                "{t.quote}"
              </blockquote>

              <div className="mt-5 flex items-center gap-3">
                <div className="flex size-9 sm:size-10 items-center justify-center rounded-full bg-primary-100 text-xs sm:text-sm font-bold text-primary-700 shrink-0">
                  {t.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">{t.name}</div>
                  <div className="text-xs text-gray-500 truncate">{t.role}, {t.company}</div>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold shrink-0 ${planColors[t.plan]}`}>
                  {t.plan}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
