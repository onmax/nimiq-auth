import type { BetterAuthClientPlugin } from 'better-auth'
import type { nimiq } from '.'

export function nimiqClient(): BetterAuthClientPlugin {
  return {
    id: 'challenge',
    $InferServerPlugin: {} as ReturnType<typeof nimiq>,
    pathMethods: {
      '/nimiq/get-challenge': 'GET',
      '/nimiq/verify-challenge': 'POST',
    },
  }
}
