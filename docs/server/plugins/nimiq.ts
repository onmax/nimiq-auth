export default defineNitroPlugin(async () => {
  if (!import.meta.env.PROD)
    return
  // @ts-expect-error We copy at build time
  const mod = await import('./nimiq.wasm')
  const { default: init } = await import('@nimiq/core/web')
  init(mod)
})
