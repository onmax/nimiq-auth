import { defineBuildConfig } from 'unbuild'
import { rollup as unwasm } from 'unwasm/plugin'

export default defineBuildConfig({
  entries: [
    'src/index',
    'src/client',
  ],
  declaration: true,
  clean: true,
  hooks: {
    'rollup:options': function (_, rollupOptions) {
      rollupOptions.plugins.unshift(
        unwasm({
          esmImport: true,
          lazy: true,
        }),
      )
    },
  },

  rollup: {
    inlineDependencies: true,
  },
})
