import type { JwtHeader } from 'jsonwebtoken'
import type { NimiqAuthOptions, Result } from './types'
import { BufferUtils } from '@nimiq/core'
// import { createHmac } from 'node:crypto' // see https://github.com/unjs/unenv/issues/419
// @ts-expect-error No types
import { createHmac } from 'crypto-browserify'
import { randomUUID } from 'uncrypto'

export interface NimiqAuthJwtPayload {
  /**
   * JWT life span in seconds.
   * @default 300
   */
  exp?: number

  /**
   * Issuer name (for example, your App Name).
   * @default 'Nimiq Auth'
   */
  iss?: string

  /**
   * Unique identifier for the JWT.
   */
  jti?: string
}

export interface GenerateJwtParams extends Partial<Pick<NimiqAuthOptions, 'nimiqAuthJwtDuration' | 'appName'>> {
  /**
   * Secret key for HMAC signing.
   */
  secret: string
}

const DEFAULT_DURATION_IN_SECONDS = 300

// --- Helper Functions ---

// Check if a JWT has expired.
function isExpired(exp: number): boolean {
  return exp < Math.floor(Date.now() / 1000)
}
/**
 * Regular expression to validate UUIDs.
 */
const UUID_PATTERN: RegExp = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu
function jtiIsValid(jti: string): boolean {
  return UUID_PATTERN.test(jti)
}

// Ensure the payload has required fields and is not expired.
function validatePayloadFields(payload: any): Result<undefined> {
  if (typeof payload !== 'object' || payload === null)
    return { success: false, error: 'Invalid JWT payload' }
  if (!payload.iss || !payload.jti || !payload.exp)
    return { success: false, error: 'Invalid JWT payload' }
  if (isExpired(payload.exp))
    return { success: false, error: 'JWT expired' }
  if (!jtiIsValid(payload.jti))
    return { success: false, error: 'Challenge is not a valid UUID' }
  return { success: true, data: undefined }
}

// Split a JWT into its three parts.
function splitJwt(JWT: string): Result<{ headerEnc: string, payloadEnc: string, signatureEnc: string, unsigned: string }> {
  const parts = JWT.split('.')
  if (parts.length !== 3)
    return { success: false, error: 'Invalid JWT format' }
  const [headerEnc, payloadEnc, signatureEnc] = parts
  return { success: true, data: { headerEnc, payloadEnc, signatureEnc, unsigned: `${headerEnc}.${payloadEnc}` } }
}

// Decode a base64 URL encoded JSON string.
function decodeSegment(encoded: string): Result<any> {
  try {
    const json = BufferUtils.toUtf8(BufferUtils.fromBase64Url(encoded))
    const data = JSON.parse(json)
    return { success: true, data }
  }
  catch (e) {
    return { success: false, error: `Error decoding JWT segment: ${e?.toString() || 'unknown error'}` }
  }
}

// Sign an unsigned JWT string using a secret key.
function signJwt(unsigned: string, secret: string): string {
  return BufferUtils.toBase64Url(
    createHmac('sha256', secret)
      .update(unsigned)
      .digest(),
  )
}

// Produces the JWT
function getJwt({ header, payload }: { header: JwtHeader, payload: NimiqAuthJwtPayload }, secret: string): string {
  const headerEnc = BufferUtils.toBase64Url(BufferUtils.fromUtf8(JSON.stringify(header)))
  const payloadEnc = BufferUtils.toBase64Url(BufferUtils.fromUtf8(JSON.stringify(payload)))
  const unsigned = `${headerEnc}.${payloadEnc}`
  const signatureEnd = signJwt(unsigned, secret)
  return `${unsigned}.${signatureEnd}`
}

// --- Exported Functions ---

/**
 * Encodes the payload and signs a JWT.
 *
 * @param payload - The JWT payload.
 * @param secret - The secret key for signing.
 * @returns A Result with the JWT.
 */
export function encodeJwt(payload: NimiqAuthJwtPayload, secret: string): Result<string> {
  const check = validatePayloadFields(payload)
  if (!check.success)
    return { success: false, error: check.error }

  const header: JwtHeader = { alg: 'HS256', typ: 'JWT' }
  const jwt = getJwt({ header, payload }, secret)
  return { success: true, data: jwt }
}

/**
 * Creates a JWT with a random unique ID.
 *
 * @param options - Options for JWT creation.
 * @param options.secret - The secret key for signing.
 * @param options.appName - The name of the app.
 * @param options.nimiqAuthJwtDuration - The duration of the JWT in seconds.
 * @returns A Result with the JWT.
 */
export function createJwt({ secret, appName, nimiqAuthJwtDuration }: GenerateJwtParams): Result<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + (nimiqAuthJwtDuration ?? DEFAULT_DURATION_IN_SECONDS)
  const iss = appName ?? 'Nimiq Auth'
  const jti = randomUUID()
  const payload: NimiqAuthJwtPayload = { exp, iss, jti }
  return encodeJwt(payload, secret)
}

/**
 * Verifies a JWT's signature and payload.
 *
 * @param JWT - The JWT.
 * @param secret - The secret key used for signing.
 * @returns A Result with the valid JWT payload.
 */
export function verifyJwt(JWT: string, secret: string): Result<Required<NimiqAuthJwtPayload>> {
  const partsRes = splitJwt(JWT)
  if (!partsRes.success)
    return partsRes
  const { payloadEnc, signatureEnc, unsigned } = partsRes.data

  // Check if the signature matches.
  const expectedSig = signJwt(unsigned, secret)
  if (expectedSig !== signatureEnc)
    return { success: false, error: 'Invalid JWT signature' }

  // Decode the payload.
  const payloadRes = decodeSegment(payloadEnc)
  if (!payloadRes.success)
    return { success: false, error: payloadRes.error }
  const payload = payloadRes.data as Required<NimiqAuthJwtPayload>

  const valid = validatePayloadFields(payload)
  if (!valid.success)
    return valid

  return { success: true, data: payload }
}

/**
 * Decodes a JWT without checking its signature.
 *
 * @param JWT - The JWT.
 * @returns A Result with the header, payload, and signature.
 */
export function decodeJwt(JWT: string): Result<{ header: JwtHeader, payload: Required<NimiqAuthJwtPayload>, signature: string }> {
  if (!JWT || typeof JWT !== 'string')
    return { success: false, error: 'Invalid JWT' }

  const partsRes = splitJwt(JWT)
  if (!partsRes.success)
    return partsRes
  const { headerEnc, payloadEnc, signatureEnc } = partsRes.data

  const headerRes = decodeSegment(headerEnc)
  if (!headerRes.success)
    return headerRes
  const header = headerRes.data as JwtHeader

  const payloadRes = decodeSegment(payloadEnc)
  if (!payloadRes.success)
    return payloadRes
  const payload = payloadRes.data as Required<NimiqAuthJwtPayload>

  const valid = validatePayloadFields(payload)
  if (!valid.success)
    return valid

  return { success: true, data: { header, payload, signature: signatureEnc } }
}

/**
 * Checks that the JWT's header, payload, and signature follow the expected format.
 *
 * @param jwtData - An object containing header, payload, and signature.
 * @param jwtData.header - The JWT header.
 * @param jwtData.payload - The JWT payload.
 * @param jwtData.signature - The JWT signature.
 * @returns A Result with the valid JWT payload.
 */
export function validateJwt({ header, payload, signature }: { header: JwtHeader, payload: NimiqAuthJwtPayload, signature: string }): Result<NimiqAuthJwtPayload> {
  if (!header || !payload || !signature)
    return { success: false, error: 'Invalid JWT' }
  if (header.alg !== 'HS256' || header.typ !== 'JWT')
    return { success: false, error: 'Invalid JWT header' }

  const valid = validatePayloadFields(payload)
  if (!valid.success)
    return valid

  return { success: true, data: payload }
}

/**
 * Gets the challenge from a JWT.
 *
 * @param JWT - The JWT.
 * @returns The challenge.
 */
export function getChallengeFromJwt(JWT: string): Result<string> {
  const decodedJwt = decodeJwt(JWT)
  if (!decodedJwt.success)
    return decodedJwt
  return { success: true, data: decodedJwt.data.payload.jti }
}
