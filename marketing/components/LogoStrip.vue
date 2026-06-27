<template>
  <section class="bg-white py-14 border-y border-gray-100">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <p class="text-center text-sm font-semibold uppercase tracking-widest text-gray-400 mb-10">
        Built for the people on the floor
      </p>
      <div class="grid grid-cols-2 items-center gap-x-6 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
        <div
          v-for="(use, i) in [
            { name: 'Retailers', icon: '🛍️' },
            { name: 'Workshops', icon: '🔨' },
            { name: 'Field service', icon: '🚐' },
            { name: 'Restaurants', icon: '🍽️' },
            { name: 'Property mgrs', icon: '🏢' },
            { name: 'Studios', icon: '🎨' },
          ]"
          :key="use.name"
          :class="['flex items-center justify-center gap-2 text-gray-500 reveal', `reveal-delay-${i+1}`]"
        >
          <span class="text-xl leading-none">{{ use.icon }}</span>
          <span class="text-base font-bold tracking-tight">{{ use.name }}</span>
        </div>
      </div>
    </div>
  </section>
</template>
