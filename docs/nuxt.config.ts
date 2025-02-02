import topLevelAwait from 'vite-plugin-top-level-await'
import wasm from 'vite-plugin-wasm'

export default defineNuxtConfig({
  // https://github.com/nuxt-themes/docus
  extends: ['@nuxt-themes/docus'],
  devtools: { enabled: true },

  components: [{
    path: './components',
    pathPrefix: false,
    global: true,
  }],

  imports: {
    dirs: ['./composables'],
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

  modules: [
    '@nuxthub/core',
  ],
  compatibilityDate: '2024-10-24',

  hub: {
    database: true,
    kv: true,
  },
})
