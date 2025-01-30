// @ts-check
import antfu from '@antfu/eslint-config'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default antfu(
  {
    type: 'lib',
    ignores: ['**/dist/**'],
  },
  {
    files: ['./packages/nuxt/**/*.ts'],
    plugins: [createConfigForNuxt({
      features: {
        // Rules for module authors
        tooling: true,
        // Rules for formatting
        stylistic: true,
      },
      dirs: {
        src: [
          './playground',
        ],
      },
    })],
  },
)
