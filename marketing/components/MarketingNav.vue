<script setup lang="ts">
const scrolled = ref(false);
const mobileOpen = ref(false);
const { isLoggedIn } = useAuth();
const { public: { appUrl } } = useRuntimeConfig();

onMounted(() => {
  const handleScroll = () => {
    scrolled.value = window.scrollY > 20;
  };
  window.addEventListener("scroll", handleScroll, { passive: true });
  onUnmounted(() => window.removeEventListener("scroll", handleScroll));
});

const navLinks = [
  { label: "Features", href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-all duration-300"
    :class="scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-transparent'"
  >
    <nav class="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
      <!-- Logo -->
      <a href="/" class="flex items-center gap-2.5 group">
        <img
          src="/imperial-trends-logo.png"
          alt="iinwentory"
          class="size-9 object-contain transition-transform group-hover:scale-105"
        />
        <span
          class="text-xl font-bold tracking-tight transition-colors"
          :class="scrolled ? 'text-primary-700' : 'text-white'"
        >
          iinwentory
        </span>
      </a>

      <!-- Desktop nav links -->
      <div class="hidden items-center gap-8 lg:flex">
        <a
          v-for="link in navLinks"
          :key="link.href"
          :href="link.href"
          class="text-sm font-medium transition-colors duration-200"
          :class="scrolled ? 'text-gray-600 hover:text-primary-600' : 'text-white/80 hover:text-white'"
        >
          {{ link.label }}
        </a>
      </div>

      <!-- CTA buttons -->
      <div class="hidden items-center gap-3 lg:flex">
        <a
          v-if="!isLoggedIn"
          :href="appUrl + '/login'"
          class="text-sm font-medium transition-colors duration-200"
          :class="scrolled ? 'text-gray-600 hover:text-primary-600' : 'text-white/80 hover:text-white'"
        >
          Sign In
        </a>
        <a
          v-if="isLoggedIn"
          :href="appUrl + '/dashboard'"
          class="text-sm font-medium transition-colors duration-200"
          :class="scrolled ? 'text-gray-600 hover:text-primary-600' : 'text-white/80 hover:text-white'"
        >
          Go to App
        </a>
        <a
          v-if="!isLoggedIn"
          :href="appUrl + '?register=1'"
          class="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ring-1 hover:-translate-y-0.5"
          :class="scrolled ? 'bg-primary-600 text-white hover:bg-primary-700 ring-primary-700/20 hover:shadow-lg hover:shadow-primary-300/40' : 'bg-white text-primary-700 hover:bg-white/95 ring-white/40 hover:shadow-lg hover:shadow-primary-900/40'"
        >
          Start Free Trial
        </a>
        <a
          v-if="isLoggedIn"
          href="#pricing"
          class="rounded-xl px-5 py-2.5 text-sm font-semibold transition-all duration-200 ring-1 hover:-translate-y-0.5"
          :class="scrolled ? 'bg-primary-600 text-white hover:bg-primary-700 ring-primary-700/20 hover:shadow-lg' : 'bg-white text-primary-700 hover:bg-white/95 ring-white/40 hover:shadow-lg'"
        >
          Upgrade Plan
        </a>
      </div>

      <!-- Mobile hamburger -->
      <button
        class="flex size-9 items-center justify-center rounded-lg lg:hidden"
        :class="scrolled ? 'text-gray-700' : 'text-white'"
        @click="mobileOpen = !mobileOpen"
      >
        <svg v-if="!mobileOpen" class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
        <svg v-else class="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </nav>

    <!-- Mobile menu -->
    <Transition name="mobile-menu">
      <div v-if="mobileOpen" class="border-t border-white/10 bg-primary-700 lg:hidden">
        <div class="flex flex-col gap-1 px-4 py-4">
          <a
            v-for="link in navLinks"
            :key="link.href"
            :href="link.href"
            class="rounded-lg px-3 py-2.5 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white"
            @click="mobileOpen = false"
          >
            {{ link.label }}
          </a>
          <div class="mt-3 flex flex-col gap-2 border-t border-white/10 pt-3">
            <a
              :href="appUrl + '/login'"
              class="rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white/80 hover:bg-white/10"
            >
              Sign In
            </a>
            <a
              :href="appUrl + '?register=1'"
              class="rounded-xl bg-white px-4 py-2.5 text-center text-sm font-semibold text-primary-700"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
.mobile-menu-enter-active,
.mobile-menu-leave-active {
  transition: all 0.2s ease;
}
.mobile-menu-enter-from,
.mobile-menu-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
