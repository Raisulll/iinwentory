<script setup lang="ts">
const { public: { appUrl } } = useRuntimeConfig();
</script>

<template>
  <footer class="bg-gray-950 text-white">
    <div class="mx-auto max-w-7xl px-6 py-16 lg:px-8">
      <div class="grid gap-12 lg:grid-cols-4">
        <!-- Brand -->
        <div class="lg:col-span-1">
          <div class="flex items-center gap-2.5">
            <img src="/imperial-trends-logo.png" alt="iinwentory" class="size-9 object-contain" />
            <span class="text-xl font-bold tracking-tight">iinwentory</span>
          </div>
          <p class="mt-4 text-sm text-gray-400 leading-relaxed">
            The smart inventory management solution for businesses of all sizes. Track, manage, and optimize your inventory with ease.
          </p>
          <div class="mt-6 flex gap-3">
            <a :href="appUrl + '/dashboard'" class="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold hover:bg-primary-500 transition-colors">
              Launch App
            </a>
          </div>
        </div>

        <!-- Product -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Product</h3>
          <ul class="mt-4 space-y-3">
            <li><a href="#features" class="text-sm text-gray-300 hover:text-white transition-colors">Features</a></li>
            <li><a href="#pricing" class="text-sm text-gray-300 hover:text-white transition-colors">Pricing</a></li>
            <li><a href="#how-it-works" class="text-sm text-gray-300 hover:text-white transition-colors">How It Works</a></li>
            <li><a href="#faq" class="text-sm text-gray-300 hover:text-white transition-colors">FAQ</a></li>
          </ul>
        </div>

        <!-- Solutions -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Solutions</h3>
          <ul class="mt-4 space-y-3">
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Small Business</a></li>
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Enterprise</a></li>
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Warehousing</a></li>
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Retail</a></li>
          </ul>
        </div>

        <!-- Legal -->
        <div>
          <h3 class="text-sm font-semibold uppercase tracking-wider text-gray-400">Company</h3>
          <ul class="mt-4 space-y-3">
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">About</a></li>
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Blog</a></li>
            <li><NuxtLink to="/privacy" class="text-sm text-gray-300 hover:text-white transition-colors">Privacy Policy</NuxtLink></li>
            <li><a href="#" class="text-sm text-gray-300 hover:text-white transition-colors">Terms of Service</a></li>
            <li><NuxtLink to="/account-deletion" class="text-sm text-gray-300 hover:text-white transition-colors">Delete Account</NuxtLink></li>
          </ul>
        </div>
      </div>

      <div class="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
        <p class="text-sm text-gray-500">
          &copy; {{ new Date().getFullYear() }} iinwentory. All rights reserved.
        </p>
        <p class="text-sm text-gray-500">
          Inventory management, reimagined.
        </p>
      </div>
    </div>
  </footer>
</template>
