import type { NimiqAuthOptions } from '@nimiq-auth/core/types'
import type { BetterAuthClientPlugin } from 'better-auth'

export function nimiqClient(): BetterAuthClientPlugin {
  return {
    id: 'nimiq',
    getActions: $fetch => ({
      signInNimiq: async (options: Pick<NimiqAuthOptions, 'nimiqHubOptions'>) => {
        const { signJwt } = await import('@nimiq-auth/core/client')
        // Fetch the JWT challenge and CSRF token.
        const { data, error: errorJwt } = await $fetch<{ jwt: string, csrfToken: string }>('/nimiq/jwt', { method: 'GET' })
        if (errorJwt)
          return { error: errorJwt }

        const { jwt, csrfToken } = data!

        // Use the core client to sign the JWT using Nimiq Hub API.
        const { data: signaturePayload, success: successSigning, error: errorSigning } = await signJwt(jwt, options)
        if (!successSigning)
          return { error: errorSigning }

        // When calling verifyJwt, include the CSRF token as a header.
        return $fetch('/nimiq/jwt', {
          method: 'POST',
          headers: { 'x-csrf-token': csrfToken },
          body: { jwt, signaturePayload },
        })
      },
    }),
  }
}
