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
