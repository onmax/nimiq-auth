export default defineNuxtConfig({
  // https://github.com/nuxt-themes/docus
  extends: ['@nuxt-themes/docus'],
  devtools: { enabled: true },

  modules: [
    '@nuxthub/core',
  ],
  components: [{
    path: '~/components',
    pathPrefix: false,
    global: true,
  }],

  imports: {
    dirs: ['~/composables'],
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2024-10-24',

  future: {
    compatibilityVersion: 4,
  },

  nitro: {
    experimental: {
      wasm: true,
    },
  },

  hub: {
    database: true,
    kv: true,
  },
})
