import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([
  {
    entries: [
      'src/client',
      'src/server',
      'src/jwt',
      'src/types',
    ],
    declaration: true,
    clean: true,
    externals: ['jsonwebtoken'],
    rollup: {
      emitCJS: true,
      inlineDependencies: true,
    },
  },
])
