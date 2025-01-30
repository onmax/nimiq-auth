import type { Address, PublicKey } from '@nimiq/core'

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
   * The signer's public key as an array of numbers.
   */
  publicKey: Uint8Array

  /**
   * The digital signature as an array of numbers.
   */
  signature: Uint8Array
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
