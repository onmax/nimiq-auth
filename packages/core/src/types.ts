import type { Address, PublicKey, Signature } from '@nimiq/core'

/**
 * Holds the signer's public key and the cryptographic signature applied to data.
 */
export interface SignedData {
  /**
   * The signer's public key as an array of numbers.
   */
  publicKey: PublicKey | string | Uint8Array

  /**
   * The digital signature as an array of numbers.
   */
  signature: Signature | Uint8Array
}

export interface LoginData {
  /**
   * The challenge string.
   */
  challenge: string

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
