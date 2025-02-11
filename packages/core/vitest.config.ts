import wasm from 'vite-plugin-wasm'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Override only for tests
      '@nimiq/core/web': '@nimiq/core',
    },
  },
  plugins: [
    wasm(),
  ],
})
