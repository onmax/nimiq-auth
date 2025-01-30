import type { LoginData, Result, VerifyChallengeRequest } from './types'
import { randomUUID } from 'uncrypto'
import { getChallengeHash, parseAndValidateSignedData } from './utils'

/**
 * Generates a random UUID that will be used as the string that is signed by the user.
 * The challenge string can be any string, but it must be unique for each user, so feel
 * free to another method of generating a random string.
 *
 * @returns {string} The challenge string.
 */
export function generateUuidChallenge(): string {
  return randomUUID()
}

/**
 * [UUID](https://en.wikipedia.org/wiki/Universally_unique_identifier) regex.
 */
const UUID_REGEX: RegExp = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/iu

/**
 * Verifies if the signature is valid for the challenge.
 * @param request
 * @param request.challenge The challenge to verify.
 * @param request.signedData The signed data to verify.
 * @returns {Result<LoginData>} The user's public key or an error message.
 */
export function verifyChallenge({ challenge, signedData }: VerifyChallengeRequest): Result<LoginData> {
  // Validate the inputs
  if (!challenge)
    return { success: false, error: 'Challenge is required' }
  if (!UUID_REGEX.test(challenge))
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
  return { success: true, data: { address, publicKey } }
}
