import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'jsdom', // Ensures DOM APIs like navigator.credentials exist
  },

})
