import type { Address } from '@nimiq/core'
import type { Result, SignedData } from './types'
import { BufferUtils, Hash, PublicKey, Signature, SignatureProof } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { verifyChallengeTokenResponseToken } from './challenge'

export interface VerifyChallengeTokenResponseOptions {
  /**
   * The token returned to the client (contains the challenge and expiration).
   */
  challengeToken: string
  /**
   * The client’s signed data (includes the public key and signature).
   */
  signedData: SignedData
  /**
   * The server’s secret used to verify the token.
   */
  secret: string
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

/**
 * A regex to validate UUIDs.
 */
const UUID_REGEX: RegExp = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu

/**
 * Verifies the signed response from the client.
 *
 * @param options - Options for the verification.
 * @param options.challengeToken - The token returned to the client (contains the challenge and expiration).
 * @param options.signedData - The client’s signed data (includes the public key and signature).
 * @param options.secret - The server’s secret used to verify the token.
 * @returns The LoginData (user’s public key and address) if verification succeeds.
 */
export function verifyChallengeTokenResponse({ challengeToken, signedData, secret }: VerifyChallengeTokenResponseOptions): Result<LoginData> {
  // First, verify the integrity and expiration of the challenge token.
  const tokenResult = verifyChallengeTokenResponseToken(challengeToken, secret)
  if (!tokenResult.success)
    return { success: false, error: tokenResult.error }
  const { challenge } = tokenResult.data

  // Basic validation on the challenge.
  if (!challenge)
    return { success: false, error: 'Challenge missing in token' }

  if (!UUID_REGEX.test(challenge))
    return { success: false, error: 'Challenge is not a valid UUID' }

  // Parse and validate the signed data coming from the client.
  const parsedResult = parseAndValidateSignedData(signedData)
  if (!parsedResult.success)
    return { success: false, error: parsedResult.error }

  const { publicKey, signatureProof } = parsedResult.data

  // Compute the hash of the challenge.
  const hashResult = getChallengeHash(challenge)
  if (!hashResult.success)
    return { success: false, error: hashResult.error }

  const hash = hashResult.data

  // Verify that the client’s signature is valid for this challenge.
  if (!signatureProof.verify(hash))
    return { success: false, error: 'Invalid signature' }

  const address = publicKey.toAddress()
  return { success: true, data: { address, publicKey } }
}

export interface GetChallengeHashOptions {
  /**
   * The Hub API Message prefix.
   * @default HubApi.MSG_PREFIX
   */
  msgPrefix?: string
}

/**
 * Get the hash of the challenge.
 *
 * @param challenge
 * @param options
 * @returns The hash of the challenge.
 */
export function getChallengeHash(challenge: string | Uint8Array, options: GetChallengeHashOptions = {}): Result<Uint8Array<ArrayBufferLike>> {
  const { msgPrefix = HubApi.MSG_PREFIX } = options
  const str = `${msgPrefix}${challenge.length}${challenge}`
  const dataBytes = BufferUtils.fromUtf8(str)
  const hash = Hash.computeSha256(dataBytes)
  return { success: true, data: hash }
}

export interface ParseAndValidateSignedDataResult {
  /**
   * The public key.
   */
  publicKey: PublicKey

  /**
   * The signature proof.
   */
  signatureProof: SignatureProof
}

export function parseAndValidateSignedData({ publicKey: _publicKey, signature: _signature }: SignedData): Result<ParseAndValidateSignedDataResult> {
  if (!_publicKey)
    return { success: false, error: 'Public key is required' }

  let publicKey: PublicKey
  try {
    publicKey = PublicKey.fromHex(_publicKey)
  }
  catch (e: unknown) {
    return { success: false, error: `Public key error: ${e?.toString() || 'invalid'}` }
  }

  if (!_signature)
    return { success: false, error: 'Signature is required' }

  let signature: Signature
  try {
    signature = Signature.fromHex(_signature)
  }
  catch (e: unknown) {
    return { success: false, error: `Signature error: ${e?.toString() || 'invalid'}` }
  }

  const signatureProof = SignatureProof.singleSig(publicKey, signature)

  return { success: true, data: { publicKey, signatureProof } }
}
