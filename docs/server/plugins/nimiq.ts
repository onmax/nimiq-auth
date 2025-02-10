import init from '@nimiq/core/web'

export default defineNitroPlugin(async () => {
  if (!import.meta.env.PROD)
    return
  init('./nimiq.wasm')
})
