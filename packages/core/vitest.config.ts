import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      // Override only for tests
      '@nimiq/core/web': '@nimiq/core',
    },
  },
})
