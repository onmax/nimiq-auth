import type { LoginData, Result, SignedData } from './types'
import { randomUUID } from 'uncrypto'
import { getChallengeHash, parseAndValidateSignedData } from './utils'

/**
 * Generates a random UUID that will be used as the string that is signed by the user.
 * The challenge string can be any string, but it must be unique for each user, so feel
 * free to another method of generating a random string.
 *
 * @returns {string} The challenge string.
 */
export function generateUuidLoginChallenge(): string {
  return randomUUID()
}

const validUuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/**
 * Verifies if the signature is valid for the challenge.
 * @param challenge The challenge string.
 * @param signedData The message signed by the user.
 * @returns {Result<LoginData>} The user's public key or an error message.
 */
export function verifyLoginChallenge(challenge: string, signedData: SignedData): Result<LoginData> {
  // Validate the inputs
  if (!challenge)
    return { success: false, error: 'Challenge is required' }
  if (!validUuidv4Regex.test(challenge))
    return { success: false, error: 'Challenge is not a valid UUID' }

  const { data: deserialized, success: deserializeSuccess, error: deserializeError } = parseAndValidateSignedData(signedData)
  if (!deserializeSuccess)
    return { success: false, error: deserializeError }

  const { publicKey, signatureProof } = deserialized
  const { data: hash, success: challengeDataSuccess, error: challengeDataError } = getChallengeHash(challenge)
  if (!challengeDataSuccess)
    return { success: false, error: challengeDataError }

  if (!signatureProof.verify(hash))
    return { success: false, error: 'Invalid signature' }

  const address = publicKey.toAddress()
  return { success: true, data: { address, challenge, publicKey } }
}
