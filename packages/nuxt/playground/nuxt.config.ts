export default defineNuxtConfig({
  modules: ['../src/module', 'nuxt-auth-utils'],
  nimiqAuth: {
    nimiqHubOptions: {
      url: 'https://hub.nimiq.com',
    },
  },
  devtools: { enabled: true },
  compatibilityDate: '2025-01-29',
  future: {
    compatibilityVersion: 4,
  },

  watch: ['../src', '../../core/src'],
})
