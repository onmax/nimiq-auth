/* eslint-disable ts/explicit-function-return-type */
import type { GenerateChallengeResponse, VerifyChallengeRequest } from '@nimiq-auth/core/types'
import { computed, ref, useUserSession } from '#imports'
import { signChallenge } from '@nimiq-auth/core/client'
import { useRuntimeConfig } from 'nuxt/app'

export enum NimiqAuthStatus {
  Idle = 'idle',
  Signing = 'signing',
  Error = 'error',
  LoggedIn = 'loggedIn',
}

export function useNimiqAuth() {
  const error = ref<string | undefined>()
  const { clear, loggedIn, session, user, fetch: fetchSession } = useUserSession()
  const state = ref(loggedIn.value ? NimiqAuthStatus.LoggedIn : NimiqAuthStatus.Idle)

  async function login(): Promise<void> {
    state.value = NimiqAuthStatus.Signing
    error.value = undefined

    const { challenge } = await $fetch<GenerateChallengeResponse>('/api/_auth/nimiq/challenge', { method: 'GET' })

    const { appName, nimiqHubOptions } = useRuntimeConfig().public
    const { success: successSigning, data: signedData, error: signError } = await signChallenge(challenge, { appName, nimiqHubOptions })
    if (!successSigning || !signedData) {
      state.value = NimiqAuthStatus.Error
      error.value = signError
      return
    }

    const body: VerifyChallengeRequest = { challenge, signedData }

    const { success: successVerifying } = await $fetch<{ success: boolean }>('/api/_auth/nimiq/challenge/verify', { method: 'POST', body })
    if (!successVerifying) {
      state.value = NimiqAuthStatus.Error
      error.value = 'Failed to verify challenge'
      return
    }

    await fetchSession()
    state.value = NimiqAuthStatus.LoggedIn
  }

  async function logout() {
    await clear()
    state.value = NimiqAuthStatus.Idle
  }

  return {
    state,
    error,
    loggedIn,

    login,
    logout,

    session,
    user,
    address: computed(() => user.value?.address as string | undefined),
    publicKey: computed(() => user.value?.publicKey as string | undefined),
  }
}
