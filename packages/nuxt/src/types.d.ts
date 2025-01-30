import type { PopupRequestBehavior, RedirectRequestBehavior } from '@nimiq/hub-api'

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
  interface PublicRuntimeConfig {
    /**
     * The Nimiq Hub API configuration
     */
    nimiqHubOptions: {
      /**
       * The Hub API endpoint
       * @default 'https://hub.nimiq.com'
       */
      url?: string

      /**
       * The Hub API behavior
       * @default 'popup'
       */
      behavior?: PopupRequestBehavior | RedirectRequestBehavior
    } | undefined

    /**
     * The Name that will be displayed when the user is signing the challenge
     * @default 'Login with Nimiq'
     */
    appName: string | undefined
  }
}

export {}
