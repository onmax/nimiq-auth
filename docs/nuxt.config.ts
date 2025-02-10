import { copyFileSync } from 'node:fs'
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
      exclude: ['@nimiq/core', '@nimiq/core/web', 'comlink'],
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

  hooks: {
    'build:before': () => {
      // Copy server WASM file into codebase to use with @rollup/plugin-wasm
      // Should not be necessary, but for unknown reasons I am getting an `Unknown file extension ".wasm"` error
      // when importing from node_modules directly.
      copyFileSync('./node_modules/@nimiq/core/web/main-wasm/index_bg.wasm', './server/plugins/nimiq.wasm')
      console.log('✔ Copied server WASM to codebase')
    },
  },
})
