const features = [
  {
    icon: '📦',
    title: 'Smart Item Tracking',
    description: 'Track thousands of unique items with photos, custom fields, serial numbers, and QR/barcode labels. Find anything in seconds.',
    color: 'from-blue-500 to-primary-600',
    highlights: ['Custom fields & tags', 'Photo attachments', 'Asset ID system'],
  },
  {
    icon: '📍',
    title: 'Location Management',
    description: 'Organize inventory across unlimited locations, warehouses, and sub-locations with a visual hierarchy that mirrors your real-world setup.',
    color: 'from-purple-500 to-violet-600',
    highlights: ['Nested locations', 'Location labels', 'Quick moves'],
  },
  {
    icon: '📊',
    title: 'Powerful Reports',
    description: 'Get instant insights with activity history, inventory summaries, low stock alerts, and move reports — exportable in seconds.',
    color: 'from-emerald-500 to-teal-600',
    highlights: ['Inventory summaries', 'Activity history', 'Low stock alerts'],
  },
  {
    icon: '🏷️',
    title: 'QR & Barcode Labels',
    description: 'Generate professional QR code and barcode labels to print and attach to your items. Scan with any device, even offline.',
    color: 'from-orange-500 to-red-500',
    highlights: ['QR code generation', 'Barcode scanning', 'Bulk label printing'],
  },
  {
    icon: '🔔',
    title: 'Smart Alerts',
    description: 'Never run out of stock or miss a date-based event. Get notified via email, in-app notifications, or Slack when items need attention.',
    color: 'from-yellow-500 to-amber-600',
    highlights: ['Low stock alerts', 'Date reminders', 'Slack integration'],
  },
  {
    icon: '📱',
    title: 'Mobile-First & Offline',
    description: 'Use iinwentory on any device. The progressive web app works fully offline and syncs automatically when back online.',
    color: 'from-pink-500 to-rose-600',
    highlights: ['Works offline', 'Auto sync', 'Native-like PWA'],
  },
  {
    icon: '👥',
    title: 'Team Collaboration',
    description: 'Invite team members, assign roles, and control permissions. Everyone sees the same real-time inventory view.',
    color: 'from-cyan-500 to-blue-600',
    highlights: ['Role permissions', 'Multiple users', 'Activity logs'],
  },
  {
    icon: '🔗',
    title: 'Integrations',
    description: 'Connect with the tools you already use. QuickBooks, Slack, Amazon Business, and more — or build your own via API.',
    color: 'from-indigo-500 to-primary-700',
    highlights: ['QuickBooks Online', 'Slack & Teams', 'REST API & Webhooks'],
  },
];

export default function FeaturesSection() {
  return (
    <section id="features" className="bg-bg py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center reveal">
          <div className="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
            Everything you need
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
            Every feature your
            <br />
            inventory actually needs
          </h2>
          <p className="mt-5 text-lg text-gray-500 leading-relaxed">
            No filler. Each feature here is shipped, in production, and used every day by the operators on iinwentory.
          </p>
        </div>

        {/* Feature grid */}
        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, i) => (
            <div
              key={feature.title}
              className={`group relative rounded-2xl bg-white p-6 border border-gray-100 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 reveal reveal-delay-${(i % 4) + 1}`}
            >
              <div className={`mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br ${feature.color} text-2xl shadow-lg ring-1 ring-white/20 transition-transform group-hover:scale-110 group-hover:rotate-3`}>
                {feature.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">{feature.title}</h3>
              <p className="mt-2 text-sm text-gray-500 leading-relaxed">{feature.description}</p>
              <ul className="mt-4 space-y-1.5 pt-4 border-t border-gray-100">
                {feature.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-2 text-xs font-medium text-gray-600">
                    <svg className="size-3.5 shrink-0 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
