import type { NimiqAuthOptions, VerifyAuthOptions } from '@nimiq-auth/core/types'
import type { Session, User } from 'better-auth'
import type {
  ClientOptions,
  InferSessionFromClient,
  InferUserFromClient,
} from 'better-auth/client'
import type { RouteLocationRaw } from 'vue-router'
import { nimiqClient } from '@nimiq-auth/better-auth/client'
// import { signJwt } from '@nimiq-auth/core/client'
import { createAuthClient } from 'better-auth/client'
import { computed, ref } from 'vue'

export enum NimiqAuthStatus {
  Idle = 'idle',
  Signing = 'signing',
  Error = 'error',
  LoggingOut = 'loggingOut',
  LoggedIn = 'loggedIn',
}

// eslint-disable-next-line ts/explicit-function-return-type
export function useNimiqAuth() {
  const url = useRequestURL()
  const headers = import.meta.server ? useRequestHeaders() : undefined

  const status = ref(NimiqAuthStatus.Idle)
  const error = ref<string | undefined>()

  // create the Better Auth client using your current baseURL and fetch options.
  const client = createAuthClient({
    baseURL: url.origin,
    fetchOptions: {
      headers,
    },
    plugins: [nimiqClient()],
  })

  // Use state to hold session and user information.
  const session = useState<InferSessionFromClient<ClientOptions> | null>('auth:session', () => null)
  const user = useState<InferUserFromClient<ClientOptions> | null>('auth:user', () => null)
  const sessionFetching = import.meta.server ? ref(false) : useState('auth:sessionFetching', () => false)

  // Define a function to fetch the current session.
  // eslint-disable-next-line ts/explicit-function-return-type
  async function fetchSession() {
    if (sessionFetching.value) {
      console.warn('already fetching session')
      return
    }
    sessionFetching.value = true
    // Here we call the client's getSession endpoint.
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

  async function login({ nimiqHubOptions }: Pick<NimiqAuthOptions, 'nimiqHubOptions'>): Promise<void> {
    if (import.meta.server)
      return
    status.value = NimiqAuthStatus.Signing
    error.value = undefined

    const endpoint = '/api/auth/nimiq/jwt'

    let jwt: string | undefined
    let csrfToken: string | undefined

    await $fetch(endpoint, {
      method: 'GET',
      async onResponseError({ response }) {
        error.value = response.statusText
        status.value = NimiqAuthStatus.Error
      },
      async onResponse({ response }) {
        const json = response._data as { jwt: string, csrfToken: string }
        jwt = json.jwt
        csrfToken = json.csrfToken
      },
    })

    if (!jwt)
      return

    const { signJwt } = await import('@nimiq-auth/core/client')

    // 2. Use the client helper to sign the challenge.
    const { success: signSuccess, data: signaturePayload, error: signError } = await signJwt(jwt, { nimiqHubOptions })
    if (!signSuccess || !signaturePayload) {
      status.value = NimiqAuthStatus.Error
      error.value = signError
      return
    }

    // 3. Send the signed data along with the JWT for verification.
    const body: Pick<VerifyAuthOptions, 'jwt' | 'signaturePayload'> = { jwt, signaturePayload }
    await $fetch(endpoint, {
      method: 'POST',
      body,
      headers: {
        'x-csrf-token': csrfToken!,
      },
      async onResponseError({ response }) {
        error.value = response.statusText
        status.value = NimiqAuthStatus.Error
      },
      async onResponse({ response }) {
        const { error: errorMsg } = response._data as { user: User, session: Session, error: undefined } | { user: undefined, session: undefined, error: string }
        if (errorMsg) {
          error.value = errorMsg
          status.value = NimiqAuthStatus.Error
        }
      },
    })

    if (error.value)
      return

    await fetchSession()
    status.value = NimiqAuthStatus.LoggedIn
  }

  // Listen for any session signal coming from the auth client store
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
    login,
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
    status,
    error,
  }
}
