import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/client',
    'src/server',
  ],
  declaration: true,
  clean: true,
})
