import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([
  {
    entries: [
      'src/client',
      'src/server',
      'src/types',
    ],
    declaration: true,
    clean: true,
    rollup: {
      emitCJS: true,
      inlineDependencies: true,
    },
  },
])
