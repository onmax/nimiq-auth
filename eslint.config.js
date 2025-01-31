// @ts-check
import antfu from '@antfu/eslint-config'
import { createConfigForNuxt } from '@nuxt/eslint-config/flat'

export default antfu(
  {
    type: 'lib',
    ignores: ['**/dist/**'],
    typescript: true,
  },
  {
    files: ['./packages/nuxt/**/*'],
    plugins: [createConfigForNuxt({
      features: {
        // Rules for module authors
        tooling: true,
        // Rules for formatting
        stylistic: true,
      },
      dirs: {
        src: ['./packages/nuxt/playground'],
      },
    })],
  },
  {
    files: ['**/docs/**/*'],
    plugins: [createConfigForNuxt({
      features: {
        // Rules for formatting
        stylistic: true,
      },
      dirs: { src: ['./docs'] },
    })],
  },
)
