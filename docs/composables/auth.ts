import type {
  ClientOptions,
  InferSessionFromClient,
  InferUserFromClient,
} from 'better-auth/client'
import type { RouteLocationRaw } from 'vue-router'
import { nimiqAuthClientPlugin } from '@nimiq-auth/better-auth/client'
import { createAuthClient } from 'better-auth/client'

// TODO Remove eslint rule for docs
// eslint-disable-next-line ts/explicit-function-return-type
export function useAuth() {
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders() : undefined

  const client = createAuthClient({
    baseURL: url.origin,
    fetchOptions: {
      headers,
    },
    plugins: [nimiqAuthClientPlugin()],
  })

  const session = useState<InferSessionFromClient<ClientOptions> | null>('auth:session', () => null)
  const user = useState<InferUserFromClient<ClientOptions> | null>('auth:user', () => null)
  const sessionFetching = import.meta.server ? ref(false) : useState('auth:sessionFetching', () => false)

  // TODO Remove eslint rule for docs
  // eslint-disable-next-line ts/explicit-function-return-type
  async function fetchSession() {
    if (sessionFetching.value) {
      return
    }
    sessionFetching.value = true
    const { data } = await client.getSession({
      fetchOptions: {
        headers,
      },
    })
    session.value = data?.session || null
    user.value = data?.user || null
    sessionFetching.value = false
    return data
  }

  if (import.meta.client) {
    client.$store.listen('$sessionSignal', async (signal) => {
      if (!signal)
        return
      await fetchSession()
    })
  }

  return {
    session,
    user,
    loggedIn: computed(() => !!session.value),
    signIn: client.signIn,
    signUp: client.signUp,
    async signOut({ redirectTo }: { redirectTo?: RouteLocationRaw } = {}) {
      const res = await client.signOut()
      session.value = null
      user.value = null
      if (redirectTo) {
        await navigateTo(redirectTo)
      }
      return res
    },
    fetchSession,
    client,
  }
}
