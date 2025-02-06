export default defineNuxtRouteMiddleware(async () => {
  const { fetchSession, loggedIn } = useNimiqAuth()
  if (loggedIn && import.meta.client)
    await fetchSession()
})
