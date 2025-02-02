import type { ComputedRef, Ref } from '#imports'
import type { VerifyAuthOptions } from '@nimiq-auth/core/server'
import type { User, UserSession } from 'nuxt-auth-utils'
import { computed, ref, useRuntimeConfig, useUserSession } from '#imports'
import { signJwt } from '@nimiq-auth/core/client'

export enum NimiqAuthStatus {
  Idle = 'idle',
  Signing = 'signing',
  Error = 'error',
  LoggingOut = 'loggingOut',
  LoggedIn = 'loggedIn',
}

interface NimiqAuth {
  login: () => Promise<void>
  logout: () => Promise<void>
  loggedIn: ComputedRef<boolean>
  session: Ref<UserSession, UserSession>
  state: ComputedRef<NimiqAuthStatus>
  user: ComputedRef<User | null>
  address: ComputedRef<string | undefined>
  publicKey: ComputedRef<string | undefined>
  error: ComputedRef<string | undefined>
}

export function useNimiqAuth(): NimiqAuth {
  const status = ref(NimiqAuthStatus.Idle)
  const { user, loggedIn, session, clear, fetch: fetchSession } = useUserSession()

  const publicKey = computed(() => user.value?.publicKey)
  const address = computed(() => user.value?.address)
  const error = ref<string | undefined>()

  const { nimiqHubOptions } = useRuntimeConfig().public

  async function login(): Promise<void> {
    status.value = NimiqAuthStatus.Signing
    error.value = undefined

    const endpoint = '/api/_auth/nimiq/jwt'
    const jwt = await $fetch(endpoint, { method: 'GET', async onResponseError({ response }) {
      error.value = response.statusText
      status.value = NimiqAuthStatus.Error
    } })
    if (!jwt)
      return

    // 2. Use the client helper to sign the challenge.
    const { success: signSuccess, data: signaturePayload, error: signError } = await signJwt(jwt, { nimiqHubOptions })
    if (!signSuccess || !signaturePayload) {
      status.value = NimiqAuthStatus.Error
      error.value = signError
      return
    }

    // 3. Send the signed data along with the JWT for verification.
    const body: Pick<VerifyAuthOptions, 'jwt' | 'signaturePayload'> = { jwt, signaturePayload }
    const authCredentials = await $fetch(endpoint, { method: 'POST', body, async onResponseError({ response }) {
      error.value = response.statusText
      status.value = NimiqAuthStatus.Error
    } })
    if (!authCredentials)
      return

    await fetchSession()
    status.value = NimiqAuthStatus.LoggedIn
  }

  async function logout(): Promise<void> {
    error.value = undefined
    status.value = NimiqAuthStatus.LoggingOut
    await clear()
    status.value = NimiqAuthStatus.Idle
  }

  return {
    login,
    logout,
    loggedIn,
    session,
    state: computed(() => status.value),
    user,
    address,
    publicKey,
    error: computed(() => error.value),
  }
}
