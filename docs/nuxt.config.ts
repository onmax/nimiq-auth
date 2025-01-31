export default defineNuxtConfig({
  // https://github.com/nuxt-themes/docus
  extends: ['@nuxt-themes/docus'],
  devtools: { enabled: true },

  modules: [
    '@nuxthub/core',
  ],
  compatibilityDate: '2024-10-24',

  hub: {
    database: true,
    kv: true,
  },
})
