<script setup lang="ts">
const { public: { appUrl } } = useRuntimeConfig();
const steps = [
  {
    num: "01",
    title: "Sign Up in Seconds",
    description: "Create your free account — no credit card required. Start your 14-day trial of any plan, instantly.",
    icon: "🚀",
  },
  {
    num: "02",
    title: "Add Your Inventory",
    description: "Import existing inventory via CSV or add items manually. Attach photos, set custom fields, and organize into locations.",
    icon: "📋",
  },
  {
    num: "03",
    title: "Label & Scan",
    description: "Print QR code labels for your items. Scan them with any mobile device to instantly look up, update, or check out items.",
    icon: "🏷️",
  },
  {
    num: "04",
    title: "Track & Report",
    description: "Monitor stock levels in real time. Set low stock alerts, view activity history, and export reports whenever you need them.",
    icon: "📊",
  },
];
</script>

<template>
  <section id="how-it-works" class="bg-white py-24 lg:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <div class="mx-auto max-w-2xl text-center reveal">
        <div class="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
          Simple to start
        </div>
        <h2 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Up and running in an afternoon
        </h2>
        <p class="mt-5 text-lg text-gray-500">
          No demo call. No "implementation consultant." Just four straightforward steps from signup to scanning your first item.
        </p>
      </div>

      <div class="mt-20 grid gap-8 lg:grid-cols-4">
        <div
          v-for="(step, i) in steps"
          :key="step.num"
          :class="['relative reveal', `reveal-delay-${i+1}`]"
        >
          <!-- Connector line -->
          <div
            v-if="i < steps.length - 1"
            class="absolute left-full top-10 hidden w-full -translate-x-1/2 lg:block"
          >
            <div class="h-px w-full bg-gradient-to-r from-primary-300 to-primary-100" />
          </div>

          <div class="flex flex-col">
            <div class="flex items-center gap-4 mb-4">
              <div class="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-2xl shadow-lg shadow-primary-300/40 ring-1 ring-white/40">
                {{ step.icon }}
              </div>
              <span class="text-5xl font-black text-primary-100 tracking-tight">{{ step.num }}</span>
            </div>
            <h3 class="text-xl font-bold text-gray-900 tracking-tight">{{ step.title }}</h3>
            <p class="mt-2 text-gray-500 leading-relaxed">{{ step.description }}</p>
          </div>
        </div>
      </div>

      <!-- CTA -->
      <div class="mt-16 text-center">
        <a
          :href="appUrl + '?register=1'"
          class="inline-flex items-center gap-2 rounded-2xl bg-primary-600 px-8 py-4 text-base font-bold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 hover:-translate-y-1 hover:shadow-xl"
        >
          Get Started Free
          <svg class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <p class="mt-3 text-sm text-gray-400">No credit card required. Cancel anytime.</p>
      </div>
    </div>
  </section>
</template>
