import type { NimiqAuthOptions } from '@nimiq-auth/core/types'

declare module '#auth-utils' {
  interface User {
    address: string
    publicKey: string
  }

  interface UserSession {
    challenge: string
  }
}

declare module '@nuxt/schema' {
  interface RuntimeConfig extends Pick<NimiqAuthOptions, 'nimiqAuthJwtDuration'> {}
  interface PublicRuntimeConfig extends Pick<NimiqAuthOptions, 'appName' | 'nimiqHubOptions'> {}
}

export {}
