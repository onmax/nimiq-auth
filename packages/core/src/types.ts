import type { PopupRequestBehavior, RedirectRequestBehavior } from '@nimiq/hub-api'

/**
 * Holds the signer's public key and the cryptographic signature applied to data.
 */
export interface AuthCredentials {
  /**
   * The signer's public key in hex format
   */
  publicKey: string

  /**
   * The digital signature in hex format
   */
  address: string
}

export type SignaturePayload = Pick<AuthCredentials, 'publicKey'> & {
  /**
   * The secret key used for signing.
   */
  signature: string
}

/**
 * The library options used by the integrations
 */
export interface NimiqAuthOptions {
  /**
   * The amount of seconds until the generated JWT expires
   * @default 300
   */
  nimiqAuthJwtDuration?: number | undefined

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
  appName?: string | undefined
}

/**
 * Options for verifying the authentication response.
 */
export interface VerifyAuthOptions {
  /**
   * The JWT sent to the client, containing the challenge and expiration.
   */
  jwt: string

  /**
   * The signed data from the client, including the public key and signature.
   */
  signaturePayload: SignaturePayload

  /**
   * The secret key used to sign and verify the JWT.
   */
  secret: string
}

export type Result<T> = {
  success: true
  data: T
  error?: undefined
} | {
  success: false
  data?: undefined
  error: string
}

export type AsyncResult<T> = Promise<Result<T>>
