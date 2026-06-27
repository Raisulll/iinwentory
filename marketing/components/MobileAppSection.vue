<script setup lang="ts">
type PreviewTheme = "light" | "dark";
const currentTheme = ref<PreviewTheme>("light");
</script>

<template>
  <section id="mobile-app" class="relative bg-gradient-to-b from-white via-bg to-white py-24 lg:py-32">
    <div class="relative mx-auto max-w-7xl px-6 lg:px-8">
      <!-- Header -->
      <div class="mx-auto max-w-2xl text-center">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
          <svg class="size-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M17 2H7a3 3 0 00-3 3v14a3 3 0 003 3h10a3 3 0 003-3V5a3 3 0 00-3-3zm-5 19a1.25 1.25 0 110-2.5 1.25 1.25 0 010 2.5zm6-4H6V5h12v12z"/></svg>
          Available on Android
        </div>
        <h2 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Your inventory, in your pocket
        </h2>
        <p class="mt-5 text-lg text-gray-500">
          Tap, swipe, and scan from anywhere. Try the live mobile preview below — it's the real app, right in your browser.
        </p>
      </div>

      <!-- Phone preview -->
      <div class="mt-14 flex flex-col items-center">
        <!-- Light / Dark toggle -->
        <div
          class="mb-8 inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white p-1 shadow-sm"
          role="tablist"
          aria-label="Preview theme"
        >
          <button
            type="button"
            role="tab"
            :aria-selected="currentTheme === 'light'"
            class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
            :class="currentTheme === 'light' ? 'bg-primary-600 text-white shadow' : 'text-gray-600 hover:text-gray-900'"
            @click="currentTheme = 'light'"
          >
            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path stroke-linecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
            Light
          </button>
          <button
            type="button"
            role="tab"
            :aria-selected="currentTheme === 'dark'"
            class="flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all"
            :class="currentTheme === 'dark' ? 'bg-gray-900 text-white shadow' : 'text-gray-600 hover:text-gray-900'"
            @click="currentTheme = 'dark'"
          >
            <svg class="size-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
            Dark
          </button>
        </div>

        <!-- Native Vue interactive phone -->
        <InteractivePhone :theme="currentTheme" />

        <!-- App store badge -->
        <div class="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#"
            class="group flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-white transition-all hover:-translate-y-0.5 hover:bg-gray-800 hover:shadow-lg"
          >
            <svg class="size-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.199l2.302 2.302-2.302 1.303-2.302-2.302 2.302-1.303zM5.864 1.469L16.8 7.802l-2.302 2.302L5.864 1.47z" />
            </svg>
            <div class="text-left leading-tight">
              <div class="text-[10px] uppercase tracking-wide text-white/70">Get it on</div>
              <div class="text-base font-semibold">Google Play</div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
</template>
