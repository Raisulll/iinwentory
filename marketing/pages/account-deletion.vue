<script setup lang="ts">
useHead({
  title: "Delete Your Account — iinwentory",
  meta: [
    { name: "description", content: "How to permanently delete your iinwentory account and all associated data." },
    { name: "robots", content: "index,follow" },
  ],
});

const { isLoggedIn } = useAuth();
const { public: { appUrl } } = useRuntimeConfig();

const mailtoHref = (() => {
  const subject = encodeURIComponent("Account deletion request");
  const body = encodeURIComponent(
    "Please delete the iinwentory account associated with this email address.\n\n" +
    "Important: send this email FROM the address on the account so we can verify ownership. " +
    "Requests from other addresses will be ignored.\n\n" +
    "Reason (optional): \n\n" +
    "I confirm that I want all my personal data permanently deleted in accordance with iinwentory's Privacy Policy.",
  );
  return `mailto:hello@iinwentory.com?subject=${subject}&body=${body}`;
})();
</script>

<template>
  <div class="bg-white pt-24 pb-20">
    <article class="mx-auto max-w-3xl px-6 lg:px-8">
      <header class="mb-10 border-b border-gray-200 pb-8">
        <p class="text-sm font-semibold uppercase tracking-wider text-red-600">Account</p>
        <h1 class="mt-2 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
          Delete your account
        </h1>
        <p class="mt-3 text-base leading-7 text-gray-700">
          You can permanently delete your iinwentory account and every piece of data tied to it.
          Choose the option below that matches your situation.
        </p>
      </header>

      <!-- Primary path: signed-in deletion -->
      <section class="mb-10 rounded-2xl border border-primary-100 bg-primary-50 p-6">
        <p class="text-xs font-bold uppercase tracking-wider text-primary-700">Recommended</p>
        <h2 class="mt-1 text-lg font-bold text-primary-900">
          {{ isLoggedIn ? "Delete from inside the app" : "Sign in, then delete" }}
        </h2>
        <p class="mt-2 text-sm leading-6 text-primary-900/80">
          Account deletion only works while you're <strong>signed in</strong> — that's how we
          verify the person making the request actually owns the account. Open
          <em>Settings → Data Management → Danger Zone</em> and click
          <strong>Delete My Account</strong>. Deletion is processed immediately.
        </p>
        <a
          :href="isLoggedIn ? appUrl + '/settings' : appUrl + '/login'"
          class="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          {{ isLoggedIn ? "Open Settings → Danger Zone" : "Sign in to delete account" }}
        </a>
      </section>

      <!-- What gets deleted -->
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900">What gets deleted</h2>
        <p class="mt-2 text-base text-gray-700">
          When your deletion is processed, the following data is removed from our systems:
        </p>
        <ul class="mt-4 grid gap-2 text-sm text-gray-700 sm:grid-cols-2">
          <li class="flex items-start gap-2">
            <span class="mt-1 inline-block size-1.5 rounded-full bg-red-500" />
            Profile (name, email, photo)
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 inline-block size-1.5 rounded-full bg-red-500" />
            Inventory items, folders &amp; tags
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 inline-block size-1.5 rounded-full bg-red-500" />
            Pick lists, comments, issues
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 inline-block size-1.5 rounded-full bg-red-500" />
            Item photos &amp; uploaded files
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 inline-block size-1.5 rounded-full bg-red-500" />
            Authentication sessions &amp; tokens
          </li>
          <li class="flex items-start gap-2">
            <span class="mt-1 inline-block size-1.5 rounded-full bg-red-500" />
            Activity &amp; audit log entries
          </li>
        </ul>

        <div class="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Heads up:</strong> Deletion is permanent and cannot be undone. We recommend
          downloading a JSON backup from
          <em>Settings → Data Management → Export Data</em> first.
        </div>
      </section>

      <!-- How long it takes -->
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900">How long does it take?</h2>
        <ul class="mt-3 list-disc space-y-1.5 pl-6 text-sm text-gray-700">
          <li>In-app deletion is processed immediately.</li>
          <li>
            Email-based requests are processed within 30 days, as required by our
            <NuxtLink to="/privacy" class="text-primary-600 hover:text-primary-700">Privacy Policy</NuxtLink>.
          </li>
          <li>Encrypted backups roll off within 90 days.</li>
          <li>Some audit-log entries may be retained up to 12 months for legal &amp; security reasons.</li>
        </ul>
      </section>

      <!-- Locked-out path -->
      <section class="mb-10">
        <h2 class="text-2xl font-bold text-gray-900">Can't sign in?</h2>
        <p class="mt-2 text-base text-gray-700">
          If you've lost access to your account, email us
          <strong>from the email address on the account</strong>. We use the sender's address
          as proof of ownership — requests sent from a different address will be ignored.
        </p>

        <div class="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-6">
          <h3 class="text-sm font-bold text-gray-900">How verification works</h3>
          <ol class="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>
              You email
              <a href="mailto:hello@iinwentory.com" class="text-primary-600 hover:text-primary-700">hello@iinwentory.com</a>
              from the same address you used to register.
            </li>
            <li>
              We confirm the email matches an active account and reply within 30 days
              (typically 1–2 business days).
            </li>
            <li>
              On confirmation we permanently delete the account and all data listed above.
            </li>
          </ol>

          <a
            :href="mailtoHref"
            class="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-black hover:shadow-lg"
          >
            Open email with prefilled deletion request
          </a>

          <p class="mt-3 text-xs leading-5 text-gray-500">
            We don't accept deletion requests through public web forms because there's no way to
            verify the person filling them out actually owns the account. Email-from-account or
            in-app deletion are the only authenticated paths.
          </p>
        </div>
      </section>

      <!-- Contact -->
      <section class="rounded-2xl border border-gray-200 bg-white p-6">
        <h2 class="text-lg font-bold text-gray-900">Need help?</h2>
        <p class="mt-2 text-sm text-gray-700">
          Email <a href="mailto:hello@iinwentory.com" class="text-primary-600 hover:text-primary-700">hello@iinwentory.com</a>
          from the address on your account, or sign in and use the in-app deletion flow.
        </p>
      </section>
    </article>
  </div>
</template>
