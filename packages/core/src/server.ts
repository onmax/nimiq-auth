import type { AuthCredentials, Result, SignaturePayload, VerifyAuthOptions } from './types'
import { BufferUtils } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { Hash, PublicKey, Signature, SignatureProof } from '@sisou/nimiq-ts'
import { verifyJwt } from './jwt'

/**
 * Verifies the authentication response by checking the JWT and signature.
 *
 * @param options - Options for verifying the authentication response.
 * @param options.jwt - The JWT returned to the client.
 * @param options.signaturePayload - The signed data from the client.
 * @param options.secret - The secret key used to sign the JWT.
 * @returns The authentication credentials (public key and address) if valid.
 */
export async function verifyAuthResponse({ jwt, signaturePayload, secret }: VerifyAuthOptions): Promise<Result<AuthCredentials>> {
  if (!jwt || typeof jwt !== 'string')
    return { success: false, error: `Invalid JWT: ${jwt || 'undefined'}` }
  if (!signaturePayload || typeof signaturePayload !== 'object')
    return { success: false, error: `Invalid signed data: ${signaturePayload || 'undefined'}` }
  if (!signaturePayload.publicKey || typeof signaturePayload.publicKey !== 'string')
    return { success: false, error: `Invalid signed data public key: ${signaturePayload.publicKey || 'undefined'}` }
  if (!signaturePayload.signature || typeof signaturePayload.signature !== 'string')
    return { success: false, error: `Invalid signed data signature: ${signaturePayload.signature || 'undefined'}` }
  if (!secret || typeof secret !== 'string')
    return { success: false, error: `Invalid secret: ${secret || 'undefined'}` }

  // Check JWT integrity and expiration.
  const verifyResult = await verifyJwt(jwt, secret)
  if (!verifyResult.success)
    return verifyResult

  // Parse the signed data.
  const parsed = parseSignedData(signaturePayload)
  if (!parsed.success)
    return { success: false, error: parsed.error }

  const { publicKey, signatureProof } = parsed.data

  // Compute the hash of the challenge.
  const hashResult = hashChallenge(jwt)
  if (!hashResult.success)
    return { success: false, error: hashResult.error }

  const hash = hashResult.data

  const addressInstance = publicKey.toAddress()
  // Check the signature against the challenge hash.
  if (!signatureProof.verify(addressInstance, hash))
    return { success: false, error: 'Invalid signature' }

  const address = addressInstance.toHex()
  const pubKeyHex = publicKey.toHex()
  return { success: true, data: { address, publicKey: pubKeyHex } }
}

/**
 * Options for computing the challenge hash.
 */
export interface ChallengeHashOptions {
  /**
   * The message prefix used by the Hub API.
   * @default HubApi.MSG_PREFIX
   */
  msgPrefix?: string
}

/**
 * Computes the hash for the given challenge.
 *
 * @param challenge - The challenge string.
 * @param options - Options for hashing.
 * @returns The hash of the challenge.
 */
export function hashChallenge(challenge: string | Uint8Array, options: ChallengeHashOptions = {}): Result<Uint8Array> {
  const { msgPrefix = HubApi.MSG_PREFIX } = options
  const input = `${msgPrefix}${challenge.toString().length}${challenge}`
  const dataBytes = BufferUtils.fromUtf8(input)
  const hash = Hash.computeSha256(dataBytes)
  return { success: true, data: hash }
}

/**
 * Represents parsed signed data.
 */
export interface ParsedSignedData {
  /**
   * The public key.
   */
  publicKey: PublicKey

  /**
   * The signature proof.
   */
  signatureProof: SignatureProof
}

/**
 * Parses the signed data provided by the client.
 *
 * @param data - The signed data containing public key and signature.
 * @param data.publicKey - The public key in hex format.
 * @param data.signature - The signature in hex format.
 * @returns The parsed signed data.
 */
export function parseSignedData({ publicKey: pkHex, signature: sigHex }: SignaturePayload): Result<ParsedSignedData> {
  if (!pkHex)
    return { success: false, error: 'Public key is required' }

  let publicKey: PublicKey
  try {
    publicKey = PublicKey.fromAny(pkHex)
  }
  catch (e: unknown) {
    return { success: false, error: `Public key error: ${e?.toString() || 'invalid'}` }
  }

  if (!sigHex)
    return { success: false, error: 'Signature is required' }

  let signature: Signature
  try {
    signature = Signature.fromAny(sigHex)
  }
  catch (e: unknown) {
    return { success: false, error: `Signature error: ${e?.toString() || 'invalid'}` }
  }

  const signatureProof = SignatureProof.singleSig(publicKey, signature)
  return { success: true, data: { publicKey, signatureProof } }
}
