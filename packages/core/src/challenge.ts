import type { Result } from './types'
import { Buffer } from 'node:buffer'
import crypto from 'node:crypto'
import { randomUUID } from 'uncrypto'

export interface GenerateChallengeOptions {
  /**
   * Expiration time of the token in seconds.
   * @default 300
   */
  expirationSeconds?: number
}

export interface VerifyChallengeReturn {
  /**
   * The base64-encoded token.
   */
  token: string

  /**
   * The UUID challenge.
   */
  challenge: string
}

/**
 * Generates a challenge token that contains a random UUID challenge,
 * an expiration timestamp (default: 5 minutes), and a signature computed with HMAC.
 *
 * @param secret - The server’s secret key used to sign the token.
 * @param options - Options for the token.
 * @returns An object with the base64-encoded token and the raw challenge.
 */
export function generateChallengeToken(secret: string, options: GenerateChallengeOptions = {}): VerifyChallengeReturn {
  const { expirationSeconds = 300 } = options
  const challenge = randomUUID()
  const exp = Math.floor(Date.now() / 1000) + expirationSeconds
  const payload: ChallengeTokenPayload = { challenge, exp }
  const payloadStr = JSON.stringify(payload)
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payloadStr)
  const sig = hmac.digest('hex')
  const tokenObj: ChallengeToken = { payload, sig }
  const token = Buffer.from(JSON.stringify(tokenObj)).toString('base64')
  return { token, challenge }
}

/**
 * Verifies the integrity and validity of a challenge token.
 *
 * @param token - The base64-encoded challenge token.
 * @param secret - The server’s secret key used to sign the token.
 * @returns {Result<ChallengeTokenPayload>} On success, returns the token’s payload.
 */
export function verifyChallengeTokenResponseToken(token: string, secret: string): Result<ChallengeTokenPayload> {
  try {
    const tokenJson = Buffer.from(token, 'base64').toString('utf8')
    const tokenObj: ChallengeToken = JSON.parse(tokenJson)
    const { payload, sig } = tokenObj
    const payloadStr = JSON.stringify(payload)
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payloadStr)
    const expectedSig = hmac.digest('hex')
    if (expectedSig !== sig)
      return { success: false, error: 'Invalid challenge token signature' }

    if (payload.exp < Math.floor(Date.now() / 1000))
      return { success: false, error: 'Challenge token expired' }

    return { success: true, data: payload }
  }
  catch (e: unknown) {
    console.error(e)
    return { success: false, error: 'Invalid challenge token format' }
  }
}

export interface ChallengeTokenPayload {
  /**
   * The random challenge that will be signed by the user.
   */
  challenge: string

  /**
   * Expiration time as a Unix timestamp (in seconds).
   */
  exp: number

  // Maybe add more fields (e.g. domain or app identifier) here if we see the need.
}

export interface ChallengeToken {
  /**
   * The payload of the token.
   */
  payload: ChallengeTokenPayload

  /**
   * The HMAC signature over the JSON string of the payload.
   */
  sig: string
}
