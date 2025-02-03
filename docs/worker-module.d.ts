// worker-modules.d.ts
declare module 'comlink:./worker.js' {
  // Do *not* move this to a top-level import, as it will turn this
  // .d.ts file from an ambient module into a local module.
  const wrap: import('comlink').Remote<typeof import('./worker.js')>
  export default wrap
}
