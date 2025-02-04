// Types for the passkeys library

export interface Credential {
  id: string
  publicKey: string
  publicKeyAlgorithm?: number
  transports?: AuthenticatorTransport[]
  multisigPubKey?: string
}

export interface RegisterOptions {
  /**
   * Name of the relying party.
   * @default "Passkey Authentication"
   */
  rpName?: string
  /**
   * Timeout in milliseconds.
   * @default 60000
   */
  timeout?: number
  /**
   * If provided, the challenge will not be generated internally.
   */
  challenge?: Uint8Array
  /**
   * URL of your server endpoint for registering the credential.
   * If provided, the library will POST the registration data.
   */
  serverRegisterUrl?: string
}

export interface LoginOptions {
  /**
   * Challenge provided by your server.
   */
  challenge: Uint8Array
  /**
   * Whether to use conditional mediation.
   * @default false
   */
  conditionalMediation?: boolean
  /**
   * Timeout in milliseconds.
   * @default 60000
   */
  timeout?: number
  /**
   * URL of your server endpoint for verifying the login.
   * If provided, the library will POST the login data.
   */
  serverLoginUrl?: string
}

export interface SignOptions {
  /**
   * Timeout in milliseconds.
   * @default 60000
   */
  timeout?: number
  /**
   * Optionally restrict the allowed transports.
   */
  allowedTransports?: AuthenticatorTransport[]
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
