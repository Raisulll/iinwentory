export default defineNuxtConfig({
  ssr: true,
  modules: ["@nuxtjs/tailwindcss", "@vueuse/nuxt"],
  css: ["~/assets/css/main.css"],
  runtimeConfig: {
    public: {
      appUrl: process.env.NUXT_PUBLIC_APP_URL || "http://localhost:5173",
    },
  },
  nitro: {
    devProxy: {
      "/api": {
        target: process.env.NUXT_API_TARGET || "http://localhost:7745/api",
        changeOrigin: true,
      },
    },
  },
  app: {
    head: {
      title: "iinwentory — Smart Inventory Management",
      meta: [
        { name: "description", content: "Transform how your business does inventory with iinwentory's powerful, easy-to-use solution." },
        { name: "viewport", content: "width=device-width, initial-scale=1" },
      ],
      link: [
        { rel: "icon", type: "image/png", href: "/imperial-trends-logo.png" },
        { rel: "apple-touch-icon", href: "/imperial-trends-logo.png" },
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Fraunces:ital,opsz,wght@1,9..144,500;1,9..144,600&display=swap" },
      ],
    },
  },
  compatibilityDate: "2024-11-29",
});
