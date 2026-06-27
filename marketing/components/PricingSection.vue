<script setup lang="ts">
const billing = ref<"yearly" | "monthly">("yearly");
const { public: { appUrl } } = useRuntimeConfig();

const plans = computed(() => [
  {
    id: "free",
    name: "Free",
    tagline: "Best for getting started.",
    badge: null,
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlySavings: null,
    yearlyBilled: null,
    cta: "Sign Up",
    ctaVariant: "outline",
    ctaHref: appUrl + "?register=1",
    color: "gray",
    features: [
      { label: "100 Unique Items" },
      { label: "1 User License" },
      { label: "In-app QR Code Scanning" },
      { label: "Item Photos" },
      { label: "Inventory Lists" },
      { label: "Low Stock Alerts" },
      { label: "1 Month Activity History" },
      { label: "Mobile App (PWA)" },
    ],
  },
  {
    id: "advanced",
    name: "Advanced",
    tagline: "Best for maintaining optimal inventory levels.",
    badge: null,
    monthlyPrice: 49,
    yearlyPrice: 24,
    yearlySavings: "Save $300",
    yearlyBilled: "Billed at $288/yr",
    cta: "Start Free Trial",
    ctaVariant: "outline",
    ctaHref: appUrl + "?register=1&plan=advanced",
    color: "blue",
    features: [
      { label: "500 Unique Items" },
      { label: "2 User Licenses" },
      { label: "Unlimited QR Code Labels" },
      { label: "Unlimited Barcode Scanning" },
      { label: "Custom Fields (5)" },
      { label: "Custom Tags & Folders" },
      { label: "Item Check-in/Check-out" },
      { label: "1 Year Activity History" },
      { label: "Slack Notifications" },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    tagline: "Best for simplifying day-to-day inventory tasks.",
    badge: "Most Popular",
    monthlyPrice: 149,
    yearlyPrice: 74,
    yearlySavings: "Save $900",
    yearlyBilled: "Billed at $888/yr",
    cta: "Start Free Trial",
    ctaVariant: "primary",
    ctaHref: appUrl + "?register=1&plan=ultra",
    color: "primary",
    features: [
      { label: "2,000 Unique Items" },
      { label: "5 User Licenses" },
      { label: "Unlimited QR & Barcode Labels" },
      { label: "Purchase Orders" },
      { label: "Pick Lists" },
      { label: "Stock Counts" },
      { label: "Custom Fields (10)" },
      { label: "3 Years Activity History" },
      { label: "Slack & Microsoft Teams" },
      { label: "Amazon Business US" },
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Best for streamlining inventory processes and oversight.",
    badge: null,
    monthlyPrice: 299,
    yearlyPrice: 149,
    yearlySavings: "Save $1800",
    yearlyBilled: "Billed at $1,788/yr",
    cta: "Start Free Trial",
    ctaVariant: "outline",
    ctaHref: appUrl + "?register=1&plan=premium",
    color: "purple",
    features: [
      { label: "5,000 Unique Items" },
      { label: "8 User Licenses" },
      { label: "Customizable Role Permissions" },
      { label: "QuickBooks Online Integration" },
      { label: "Custom Fields (20)" },
      { label: "Online Orders" },
      { label: "Unlimited Activity History" },
      { label: "Saved Reports & Subscriptions" },
      { label: "Limited Access Seats" },
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Best for customized inventory processes and control.",
    badge: null,
    monthlyPrice: null,
    yearlyPrice: null,
    yearlySavings: null,
    yearlyBilled: null,
    cta: "Talk to Sales",
    ctaVariant: "outline",
    ctaHref: "mailto:sales@iinwentory.com",
    color: "dark",
    features: [
      { label: "10,000+ Unique Items" },
      { label: "12+ User Licenses" },
      { label: "API & Webhooks" },
      { label: "SSO Integration" },
      { label: "Dedicated Customer Success Manager" },
      { label: "Unlimited Custom Fields" },
      { label: "Multi-account Access" },
      { label: "Custom Integrations" },
      { label: "SLA & Priority Support" },
    ],
  },
]);

function getDisplayPrice(plan: ReturnType<typeof plans.value[0]>) {
  if (plan.monthlyPrice === null) return null;
  return billing.value === "yearly" ? plan.yearlyPrice : plan.monthlyPrice;
}

// Comparison table data
const compareCategories = [
  {
    name: "ORGANIZE",
    rows: [
      { label: "Unique Items", values: ["100", "500", "2,000", "5,000", "10,000+"] },
      { label: "User Licenses", values: ["1", "2", "5", "8", "12+"] },
      { label: "Inventory Import", values: [true, true, true, true, true] },
      { label: "Item Photos", values: [true, true, true, true, true] },
      { label: "Inventory Lists", values: [true, true, true, true, true] },
    ],
  },
  {
    name: "CUSTOMIZE",
    rows: [
      { label: "Custom Fields", values: ["1", "5", "10", "20", "Unlimited"] },
      { label: "Custom Folders", values: [true, true, true, true, true] },
      { label: "Custom Tags", values: [true, true, true, true, true] },
      { label: "Custom Units of Measurement", values: [false, true, true, true, true] },
      { label: "Customizable User Access", values: [false, false, true, true, true] },
      { label: "Customizable Role Permissions", values: [false, false, false, true, true] },
      { label: "Limited Access Seats", values: [false, true, true, true, true] },
      { label: "Multi-account Access (MAA)", values: [false, false, false, true, true] },
    ],
  },
  {
    name: "MANAGE",
    rows: [
      { label: "In-app Barcode & QR Code Scanning", values: [true, true, true, true, true] },
      { label: "3rd-party Scanner Support", values: [true, true, true, true, true] },
      { label: "QR Code Label Creation", values: [true, true, true, true, true] },
      { label: "Barcode Label Creation", values: [false, true, true, true, true] },
      { label: "Item Check-in/Check-out", values: [false, true, true, true, true] },
      { label: "Purchase Orders", values: [false, false, true, true, true] },
      { label: "Pick Lists", values: [false, false, true, true, true] },
      { label: "Stock Counts", values: [false, false, true, true, true] },
      { label: "Online Orders", values: [false, false, false, true, true] },
    ],
  },
  {
    name: "TRACK AND UPDATE",
    rows: [
      { label: "Low Stock Alerts", values: [true, true, true, true, true] },
      { label: "Date-based Alerts", values: [true, true, true, true, true] },
      { label: "Offline Mobile Access", values: [true, true, true, true, true] },
      { label: "Automatic Sync", values: [true, true, true, true, true] },
      { label: "In-app Alerts", values: [true, true, true, true, true] },
      { label: "Email Alerts", values: [true, true, true, true, true] },
    ],
  },
  {
    name: "REPORT",
    rows: [
      { label: "Activity History", values: ["1 month", "1 year", "3 years", "Unlimited", "Unlimited"] },
      { label: "Transaction Reports", values: ["1-month limit", "1-year limit", "3-year limit", "Unlimited", "Unlimited"] },
      { label: "Activity History Reports", values: [true, true, true, true, true] },
      { label: "Inventory Summary Reports", values: [true, true, true, true, true] },
      { label: "Low Stock Reports", values: [true, true, true, true, true] },
      { label: "Move Summary Reports", values: [false, true, true, true, true] },
      { label: "Item Flow Reports", values: [false, true, true, true, true] },
      { label: "Saved Reports", values: [false, false, true, true, true] },
      { label: "Report Subscriptions", values: [false, false, true, true, true] },
    ],
  },
  {
    name: "INTEGRATIONS",
    rows: [
      { label: "Slack", values: [false, true, true, true, true] },
      { label: "Microsoft Teams", values: [false, false, true, true, true] },
      { label: "Amazon Business US", values: [false, false, true, true, true] },
      { label: "QuickBooks Online", values: [false, false, false, true, true] },
      { label: "Webhooks", values: [false, false, false, false, true] },
      { label: "API", values: [false, false, false, false, true] },
      { label: "SSO", values: [false, false, false, false, true] },
    ],
  },
];

const showCompare = ref(false);
const planNames = ["Free", "Advanced", "Ultra", "Premium", "Enterprise"];
</script>

<template>
  <section id="pricing" class="bg-bg py-24 lg:py-32">
    <div class="mx-auto max-w-7xl px-6 lg:px-8">
      <!-- Header -->
      <div class="mx-auto max-w-3xl text-center reveal">
        <div class="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
          Honest pricing
        </div>
        <h2 class="font-display text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Half the price of Sortly.<br /><span class="font-accent text-primary-700 font-semibold">Same scope of work.</span>
        </h2>
        <p class="mt-5 text-lg text-gray-500">
          Start with 14 days of any plan, free. No card required. Cancel in a click. We update this page every time a competitor changes their pricing.
        </p>

        <!-- Billing toggle (sliding pill with floating Save 50% chip) -->
        <div class="mt-8 relative inline-block">
          <!-- Floating Save 50% chip pointing at Yearly -->
          <span
            class="pointer-events-none absolute -top-3 left-[28%] -translate-x-1/2 z-20 rounded-full bg-emerald-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white shadow-md shadow-emerald-500/40 ring-2 ring-bg"
          >
            Save 50%
          </span>
          <div class="relative inline-flex items-center rounded-2xl bg-white border border-gray-200 p-1.5 shadow-sm">
            <!-- Sliding indicator -->
            <span
              aria-hidden="true"
              class="absolute top-1.5 bottom-1.5 rounded-xl bg-primary-600 shadow-lg shadow-primary-600/30 transition-all duration-300 ease-out"
              :style="billing === 'yearly'
                ? { left: '6px', width: 'calc(50% - 6px)' }
                : { left: 'calc(50% + 0px)', width: 'calc(50% - 6px)' }"
            />
            <button
              class="relative z-10 rounded-xl px-8 py-2.5 text-sm font-semibold transition-colors duration-200 min-w-[120px] text-center"
              :class="billing === 'yearly' ? 'text-white' : 'text-gray-500 hover:text-gray-900'"
              @click="billing = 'yearly'"
            >
              Yearly
            </button>
            <button
              class="relative z-10 rounded-xl px-8 py-2.5 text-sm font-semibold transition-colors duration-200 min-w-[120px] text-center"
              :class="billing === 'monthly' ? 'text-white' : 'text-gray-500 hover:text-gray-900'"
              @click="billing = 'monthly'"
            >
              Monthly
            </button>
          </div>
        </div>

        <p v-if="billing === 'yearly'" class="mt-3 text-xs text-gray-400">
          * 50% discount applies only to first year of new customer subscriptions. After the first year, a 20% discount applies to all yearly plans.
        </p>
      </div>

      <!-- Pricing cards -->
      <div class="mt-16 grid gap-6 lg:grid-cols-5">
        <div
          v-for="(plan, i) in plans"
          :key="plan.id"
          :class="[
            'relative flex flex-col rounded-3xl border transition-all duration-300 reveal',
            `reveal-delay-${i+1}`,
            plan.id === 'ultra'
              ? 'border-primary-400 bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-300/40 -mt-4 lg:scale-105 ring-1 ring-primary-400/50'
              : 'border-gray-200 bg-white shadow-card hover:shadow-card-hover hover:-translate-y-1',
          ]"
        >
          <!-- Halo glow behind featured plan -->
          <div
            v-if="plan.id === 'ultra'"
            aria-hidden="true"
            class="halo-pulse pointer-events-none absolute -inset-6 -z-10 rounded-[2.5rem] blur-2xl"
            style="background: radial-gradient(60% 60% at 50% 50%, rgba(74,125,212,0.55) 0%, rgba(41,78,167,0.25) 45%, transparent 75%);"
          />
          <!-- Most popular badge -->
          <div v-if="plan.badge" class="absolute -top-4 inset-x-0 flex justify-center">
            <span class="rounded-full bg-amber-400 px-4 py-1 text-xs font-bold text-amber-900 shadow-lg">
              ★ {{ plan.badge }}
            </span>
          </div>

          <div class="flex flex-1 flex-col p-6">
            <!-- Plan name -->
            <div>
              <h3 class="text-lg font-bold" :class="plan.id === 'ultra' ? 'text-white' : 'text-gray-900'">
                {{ plan.name }}
              </h3>
              <p class="mt-1 text-xs" :class="plan.id === 'ultra' ? 'text-white/70' : 'text-gray-500'">
                {{ plan.tagline }}
              </p>
            </div>

            <!-- Price -->
            <div class="mt-5">
              <template v-if="plan.monthlyPrice !== null">
                <div class="relative flex items-end gap-1 h-12">
                  <Transition name="price-flip" mode="out-in">
                    <span
                      :key="getDisplayPrice(plan)"
                      class="text-4xl font-extrabold tabular-nums"
                      :class="plan.id === 'ultra' ? 'text-white' : 'text-gray-900'"
                    >
                      ${{ getDisplayPrice(plan) }}
                    </span>
                  </Transition>
                  <span class="mb-1 text-sm" :class="plan.id === 'ultra' ? 'text-white/70' : 'text-gray-500'">
                    USD/mo
                  </span>
                </div>
                <div v-if="billing === 'yearly' && plan.yearlySavings" class="mt-1">
                  <span class="text-xs font-semibold" :class="plan.id === 'ultra' ? 'text-emerald-300' : 'text-emerald-600'">
                    {{ plan.yearlySavings }}!
                  </span>
                  <span class="ml-1 text-xs" :class="plan.id === 'ultra' ? 'text-white/60' : 'text-gray-400'">
                    {{ plan.yearlyBilled }}.
                  </span>
                </div>
              </template>
              <template v-else>
                <div class="text-2xl font-bold" :class="plan.id === 'ultra' ? 'text-white' : 'text-gray-900'">
                  Get a Quote
                </div>
                <div class="mt-1 text-xs" :class="plan.id === 'ultra' ? 'text-white/70' : 'text-gray-500'">
                  Custom pricing for large teams
                </div>
              </template>
            </div>

            <!-- CTA -->
            <a
              :href="plan.ctaHref"
              class="mt-6 block rounded-xl px-4 py-3 text-center text-sm font-bold transition-all duration-200"
              :class="[
                plan.id === 'ultra'
                  ? 'bg-white text-primary-700 hover:bg-white/90 shadow-lg'
                  : 'border border-primary-600 text-primary-600 hover:bg-primary-600 hover:text-white',
              ]"
            >
              {{ plan.cta }}
            </a>

            <!-- Features -->
            <ul class="mt-6 flex-1 space-y-2.5">
              <li
                v-for="feature in plan.features"
                :key="feature.label"
                class="flex items-start gap-2.5 text-sm"
                :class="plan.id === 'ultra' ? 'text-white/85' : 'text-gray-600'"
              >
                <svg class="mt-0.5 size-4 shrink-0" :class="plan.id === 'ultra' ? 'text-emerald-300' : 'text-emerald-500'" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                </svg>
                {{ feature.label }}
              </li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Compare plans toggle -->
      <div class="mt-16 text-center">
        <button
          class="inline-flex items-center gap-2 text-sm font-semibold text-primary-600 hover:text-primary-700 transition-colors"
          @click="showCompare = !showCompare"
        >
          <span>{{ showCompare ? 'Hide' : 'Compare' }} Plans</span>
          <svg
            class="size-4 transition-transform duration-200"
            :class="showCompare ? 'rotate-180' : ''"
            fill="none" viewBox="0 0 24 24" stroke="currentColor"
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      <!-- Comparison table -->
      <Transition name="compare">
        <div v-if="showCompare" class="mt-8 overflow-x-auto rounded-3xl border border-gray-200 bg-white shadow-sm">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-100">
                <th class="py-4 pl-6 pr-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-400 w-48">
                  Feature
                </th>
                <th
                  v-for="name in planNames"
                  :key="name"
                  class="px-4 py-4 text-center text-xs font-bold"
                  :class="name === 'Ultra' ? 'text-primary-600 bg-primary-50' : 'text-gray-700'"
                >
                  {{ name }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-for="cat in compareCategories" :key="cat.name">
                <tr>
                  <td colspan="6" class="bg-gray-50 px-6 py-2.5">
                    <span class="text-xs font-bold uppercase tracking-wider text-gray-400">{{ cat.name }}</span>
                  </td>
                </tr>
                <tr
                  v-for="row in cat.rows"
                  :key="row.label"
                  class="border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                >
                  <td class="py-3 pl-6 pr-4 text-gray-600">{{ row.label }}</td>
                  <td
                    v-for="(val, i) in row.values"
                    :key="i"
                    class="px-4 py-3 text-center"
                    :class="i === 2 ? 'bg-primary-50/50' : ''"
                  >
                    <template v-if="typeof val === 'boolean'">
                      <svg v-if="val" class="mx-auto size-4 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      <svg v-else class="mx-auto size-4 text-gray-200" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                    </template>
                    <template v-else>
                      <span class="font-medium text-gray-700">{{ val }}</span>
                    </template>
                  </td>
                </tr>
              </template>
            </tbody>
            <!-- Footer row with CTAs -->
            <tfoot>
              <tr class="border-t-2 border-gray-100">
                <td class="py-4 pl-6" />
                <td v-for="(plan, i) in plans" :key="plan.id" class="px-3 py-4 text-center" :class="i === 2 ? 'bg-primary-50/50' : ''">
                  <a
                    :href="plan.ctaHref"
                    class="inline-block rounded-xl px-3 py-2 text-xs font-bold transition-all"
                    :class="plan.id === 'ultra' ? 'bg-primary-600 text-white hover:bg-primary-700' : 'border border-primary-500 text-primary-600 hover:bg-primary-50'"
                  >
                    {{ plan.cta }}
                  </a>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Transition>
    </div>
  </section>
</template>

<style scoped>
.compare-enter-active,
.compare-leave-active {
  transition: all 0.3s ease;
}
.compare-enter-from,
.compare-leave-to {
  opacity: 0;
  transform: translateY(-16px);
}
</style>
