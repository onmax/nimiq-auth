import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

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

  vite: {
    build: { target: 'esnext' },
    plugins: [
      wasm(),
      topLevelAwait(),
    ],
    worker: {
      plugins: () => [
        wasm(),
        topLevelAwait(),
      ],
    },

    optimizeDeps: {
      exclude: ['@nimiq/core', 'comlink'],
    },
  },

  css: ['~/assets/css/main.css'],

  compatibilityDate: '2024-10-24',

  future: {
    compatibilityVersion: 4,
  },

  nitro: {
    experimental: { wasm: true },
  },

  hub: {
    database: true,
    kv: true,
  },
})
