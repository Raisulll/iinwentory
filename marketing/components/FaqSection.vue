<script setup lang="ts">
const faqs = [
  {
    q: "How does the 14-day free trial work?",
    a: "Start any paid plan with a full 14-day free trial — no credit card required. You get complete access to all features in your chosen plan. At the end of the trial, you can subscribe or downgrade to the Free plan.",
  },
  {
    q: "Can I switch plans at any time?",
    a: "Yes! Upgrade or downgrade your plan at any time. When you upgrade, you get immediate access to new features. When you downgrade, your plan changes at the end of the current billing cycle.",
  },
  {
    q: "What counts as a \"unique item\"?",
    a: "A unique item is a distinct product or asset type in your inventory. For example, 10 units of the same laptop model counts as 1 unique item. The item limit applies to the number of different item types, not total units.",
  },
  {
    q: "How does the yearly discount work?",
    a: "When you choose yearly billing, you save 50% in your first year (compared to monthly). After the first year, a 20% discount applies on renewal. You're billed once per year upfront.",
  },
  {
    q: "Can I use iinwentory offline?",
    a: "Yes! iinwentory is a Progressive Web App (PWA) that works fully offline. Add it to your home screen on any mobile device and access, update, and scan items even without internet. Changes sync automatically when you're back online.",
  },
  {
    q: "Does iinwentory work with barcode scanners?",
    a: "Yes — iinwentory supports both the built-in camera scanner on mobile devices and third-party Bluetooth barcode scanners. Any USB or Bluetooth barcode scanner that acts as a keyboard works seamlessly.",
  },
  {
    q: "Is my data secure?",
    a: "Absolutely. Your data is encrypted in transit and at rest. We use industry-standard security practices and conduct regular security audits. Enterprise plans include SSO and advanced access controls.",
  },
  {
    q: "What happens to my data if I cancel?",
    a: "If you downgrade to Free, your data is preserved but access may be limited based on the Free plan limits. If you cancel entirely, you have 30 days to export your data before it's deleted.",
  },
];

const openIdx = ref<number | null>(0);

function toggle(i: number) {
  openIdx.value = openIdx.value === i ? null : i;
}
</script>

<template>
  <section id="faq" class="bg-bg py-24 lg:py-32">
    <div class="mx-auto max-w-4xl px-6 lg:px-8">
      <div class="text-center reveal">
        <div class="mb-4 inline-flex items-center rounded-full border border-primary-200 bg-primary-50 px-4 py-1.5 text-sm font-semibold text-primary-700">
          FAQ
        </div>
        <h2 class="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Questions, answered honestly
        </h2>
        <p class="mt-5 text-lg text-gray-500">
          Everything you need to know — and the things competitors quietly don't tell you.
        </p>
      </div>

      <div class="mt-16 space-y-3">
        <div
          v-for="(faq, i) in faqs"
          :key="i"
          :class="['rounded-2xl bg-white border border-gray-100 overflow-hidden transition-all duration-200 reveal', `reveal-delay-${(i % 4) + 1}`, openIdx === i ? 'shadow-card-hover ring-1 ring-primary-100' : 'shadow-card hover:shadow-card-hover']"
        >
          <button
            class="flex w-full items-center justify-between px-6 py-5 text-left"
            @click="toggle(i)"
          >
            <span class="text-base font-semibold text-gray-900">{{ faq.q }}</span>
            <svg
              class="size-5 shrink-0 text-gray-400 transition-transform duration-200 ml-4"
              :class="openIdx === i ? 'rotate-180 text-primary-600' : ''"
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <Transition name="faq">
            <div v-if="openIdx === i" class="border-t border-gray-100 px-6 pb-5 pt-4">
              <p class="text-gray-500 leading-relaxed">{{ faq.a }}</p>
            </div>
          </Transition>
        </div>
      </div>

      <div class="mt-12 text-center rounded-2xl bg-white border border-gray-100 p-8 shadow-sm">
        <p class="text-gray-600">Still have questions?</p>
        <p class="mt-1 text-lg font-semibold text-gray-900">We're here to help.</p>
        <a
          href="mailto:support@iinwentory.com"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          Contact Support
        </a>
      </div>
    </div>
  </section>
</template>

<style scoped>
.faq-enter-active,
.faq-leave-active {
  transition: all 0.2s ease;
  max-height: 300px;
  overflow: hidden;
}
.faq-enter-from,
.faq-leave-to {
  max-height: 0;
  opacity: 0;
}
</style>
