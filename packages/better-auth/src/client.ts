import type { GenerateChallengeResponse, LoginData, SignChallengeOptions, VerifyChallengeRequest } from '@nimiq-auth/core/types'
import type { BetterAuthClientPlugin } from 'better-auth'
import type { BetterFetchOption } from 'better-auth/client'
import type { nimiqAuthPlugin } from './index'
import { signChallenge } from '@nimiq-auth/core/client'

export function nimiqAuthClientPlugin(): BetterAuthClientPlugin {
  return {
    id: 'nimiq-auth-plugin',
    $InferServerPlugin: {} as ReturnType<typeof nimiqAuthPlugin>,
    getActions: ($fetch) => {
      return {
        loginWithNimiq: async (options: SignChallengeOptions, fetchOptions?: BetterFetchOption) => {
          const challengeResponse = await $fetch<GenerateChallengeResponse>('/_auth/nimiq/challenge', { method: 'GET', ...fetchOptions })
          if (challengeResponse.error)
            return challengeResponse

          const { challenge } = challengeResponse.data
          const { success: successSigning, data: signedData, error: signError } = await signChallenge(challenge, options)
          if (!successSigning || !signedData)
            return { data: null, error: { message: signError, status: 400, statusText: 'Failed to sign challenge' } }

          const body: VerifyChallengeRequest = { challenge, signedData }
          const verifiedResponse = await $fetch<LoginData>('/_auth/nimiq/challenge', { method: 'POST', body, ...fetchOptions })
          if (verifiedResponse.error)
            return verifiedResponse

          return verifiedResponse.data
        },
      }
    },

  } satisfies BetterAuthClientPlugin
}
