const uses = [
  { name: 'Retailers', icon: '🛍️' },
  { name: 'Workshops', icon: '🔨' },
  { name: 'Field service', icon: '🚐' },
  { name: 'Restaurants', icon: '🍽️' },
  { name: 'Property mgrs', icon: '🏢' },
  { name: 'Studios', icon: '🎨' },
];

export default function LogoStrip() {
  return (
    <section className="bg-white py-14 border-y border-gray-100">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <p className="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-10">
          Built for the people on the floor
        </p>
        <div className="grid grid-cols-2 items-center gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {uses.map((use, i) => (
            <div
              key={use.name}
              className={`flex items-center justify-center gap-2 text-gray-500 reveal reveal-delay-${i + 1}`}
            >
              <span className="text-xl leading-none">{use.icon}</span>
              <span className="text-base font-bold tracking-tight">{use.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
