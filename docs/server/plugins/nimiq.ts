import init from '@nimiq/core/web'

export default defineNitroPlugin(async () => {
  if (!import.meta.env.PROD)
    return
  // @ts-expect-error We copy at build time
  const mod = await import('./nimiq.wasm')
  init(mod)
})
