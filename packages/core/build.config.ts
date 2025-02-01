import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig([{
  entries: [
    'src/client',
    'src/server',
    'src/challenge',
    'src/types',
  ],
  declaration: true,
  clean: true,
}])
