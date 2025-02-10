import init from '@nimiq/core/web'

export default defineNitroPlugin(async () => {
  if (!import.meta.env.PROD)
    return
  // @ts-expect-error the file is copied at build time
  const mod = await import('./nimiq.wasm?module')
  await init(mod)
})
