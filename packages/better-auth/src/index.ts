import type { BetterAuthPlugin } from 'better-auth'
import { processJwt } from '@nimiq-auth/core/server'
import { APIError, createAuthEndpoint } from 'better-auth/api'
import z from 'zod'

// export function getNimiqActions($fetch: BetterFetch) {
//   return {
//     loginWithNimiq: async (options: SignOptions, fetchOptions?: BetterFetchOption) => {
//       // Run this in the browser only
//       // @ts-expect-error - window is not defined in node
//       if (!globalThis.window)
//         return

//       const challengeResponse = await $fetch<GenerateChallengeResponse>('/_auth/nimiq/challenge', { method: 'GET', ...fetchOptions })
//       if (challengeResponse.error)
//         return challengeResponse

//       const { challenge } = challengeResponse.data
//       const { success: successSigning, data: signaturePayload, error: signError } = await signJwt(challenge, options)
//       if (!successSigning || !signaturePayload)
//         return { data: null, error: { message: signError, status: 400, statusText: 'Failed to sign challenge' } }

//       const body: verifyChallengeTokenResponseRequest = { challenge, signaturePayload }
//       const verifiedResponse = await $fetch<AuthCredentials>('/_auth/nimiq/challenge', { method: 'POST', body, ...fetchOptions })
//       if (verifiedResponse.error)
//         return verifiedResponse

//       return verifiedResponse.data
//     },
//     $Infer: {} as {
//       LoginWithNimiq: AuthCredentials
//     },
//   }
// }

// export function nimiqAuthClientPlugin(): BetterAuthClientPlugin {
//   return {
//     id: 'nimiq',
//     $InferServerPlugin: {} as ReturnType<typeof nimiqAuthPlugin>,
//     getActions: getNimiqActions,
//   } satisfies BetterAuthClientPlugin
// }
// export function getNimiqActions($fetch: BetterFetch) {
//   return {
//     signInNimiq: async (options?: {
//       fetchOptions?: BetterFetchOption
//       appName?: string
//     }) => {
//     // Get challenge from server
//       const challengeResponse = await $fetch<{ challenge: string }>(
//         '/nimiq/generate-challenge',
//         {
//           method: 'GET',
//           ...options?.fetchOptions,
//         },
//       )
//       console.log('challengeResponse', challengeResponse)

//       if (!challengeResponse.data)
//         return challengeResponse

//       // Sign challenge with Nimiq Hub
//       const signResult = await signJwt(challengeResponse.data.challenge, {
//         appName: options?.appName || 'Login with Nimiq',
//       })

//       if (!signResult.success) {
//         return {
//           data: null,
//           error: {
//             message: signResult.error,
//             status: 400,
//             statusText: 'SIGN_FAILED',
//           },
//         }
//       }

//       // Verify signature with server
//       return $fetch<{ session: any, user: any }>('/nimiq/verify-signature', {
//         method: 'POST',
//         body: {
//           signaturePayload: signResult.data,
//         },
//         ...options?.fetchOptions,
//       })
//     },
//   }
// }

// export function nimiqClient() {
//   const $nimiqState = atom<any>(null)

//   return {
//     id: 'nimiq',
//     getActions: ($fetch: BetterFetch) => getNimiqActions($fetch),
//     getAtoms($fetch: BetterFetch) {
//       const nimiqState = useAuthQuery($nimiqState, '/sign-in/nimiq/*', $fetch)
//       return { $nimiqState, nimiqState }
//     },
//     $InferServerPlugin: {} as ReturnType<typeof nimiq>,
//     pathMethods: {
//       '/sign-in/nimiq/generate-challenge': 'GET',
//       '/sign-in/nimiq/verify-signature': 'POST',
//       '/api/auth/sign-in/nimiq': 'GET',
//     },
//   } satisfies BetterAuthClientPlugin
// }

export function nimiq(): BetterAuthPlugin {
  return {
    id: 'nimiq',
    endpoints: {
      // Endpoint to generate a challenge for the client
      getChallenge: createAuthEndpoint(
        '/nimiq/get-challenge',
        {
          method: 'GET',
          metadata: {
            openapi: {
              description: 'Generate a challenge for login',
              responses: {
                200: {
                  description: 'The challenge was generated',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          challenge: { type: 'string' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        async (ctx) => {
          // Create a challenge using the imported function.
          const challengeValue = getChallengeHash('secret')
          // In a full implementation, you would save the challenge
          // (for example, in a short-lived storage or cookie)
          return ctx.json({ challenge: challengeValue })
        },
      ),
      // Endpoint to verify the signed challenge
      processJwt: createAuthEndpoint(
        '/nimiq/verify-challenge',
        {
          method: 'POST',
          body: z.object({
            challenge: z.string(),
            signaturePayload: z.object({
              publicKey: z.string(),
              signature: z.string(),
            }),
          }),
          metadata: {
            openapi: {
              description: 'Verify the signed challenge',
              responses: {
                200: {
                  description: 'The challenge is verified',
                  content: {
                    'application/json': {
                      schema: {
                        type: 'object',
                        properties: {
                          verified: { type: 'boolean' },
                        },
                      },
                    },
                  },
                },
                400: {
                  description: 'Verification failed',
                },
              },
            },
          },
        },
        async (ctx) => {
          const valid = processJwt(ctx.body)
          if (!valid) {
            throw new APIError('BAD_REQUEST', {
              message: 'The signature is not valid.',
            })
          }
          return ctx.json({ verified: true })
        },
      ),
    },
  }
}
