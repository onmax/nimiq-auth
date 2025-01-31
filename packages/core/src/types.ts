import type { Address, PublicKey } from '@nimiq/core'
import type HubApi from '@nimiq/hub-api'

export interface GenerateChallengeResponse {
  /**
   * The challenge string
   */
  challenge: string
}

export interface SignChallengeOptions {
  /**
   * The Hub API options
   */
  nimiqHubOptions?: {
    /**
     * The endpoint of the Hub API.
     * @default https://hub.nimiq.com
     */
    endpoint?: ConstructorParameters< typeof HubApi>[0]

    /**
     * The behavior of the Hub API.
     * @default undefined - use the default behavior from the Hub API
     */
    behavior?: ConstructorParameters< typeof HubApi>[1]
  }

  /**
   * The name of the app that is signing the challenge.
   * @default 'Login with Nimiq'
   */
  appName?: string
}

/**
 * Request to verify a challenge.
 */
export interface VerifyChallengeRequest {
  /**
   * The challenge to verify.
   */
  challenge: string
  /**
   * The signed data to verify.
   */
  signedData: SignedData
}

/**
 * Holds the signer's public key and the cryptographic signature applied to data.
 */
export interface SignedData {
  /**
   * The signer's public key as an array of numbers. hex format
   */
  publicKey: string

  /**
   * The digital signature as an array of numbers. hex format
   */
  signature: string
}

export interface LoginData {
  /**
   * The user's public key. Use `.toHex()` to get the public key as a string.
   */
  publicKey: PublicKey

  /**
   * The NIMIQ address of the user. Use `.toHex()` to get the address as a string.
   */
  address: Address
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
