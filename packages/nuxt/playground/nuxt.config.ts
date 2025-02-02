import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

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
  vite: {
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
      exclude: ['@nimiq/core'],
    },
  },

  watch: ['../src', '../../core/src'],
})
