export default defineNuxtRouteMiddleware(async () => {
  const { fetchSession } = useNimiqAuth()
  if (import.meta.client) {
    await fetchSession()
  }
})
