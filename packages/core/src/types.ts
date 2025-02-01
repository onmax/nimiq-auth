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
