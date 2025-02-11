import type { AuthCredentials, Result, SignaturePayload, VerifyAuthOptions } from './types'
import { createHash } from '@better-auth/utils/hash'
import { BufferUtils } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { verifyAsync } from '@noble/ed25519'
import { Address, PublicKey, SerialBuffer } from '@sisou/nimiq-ts'
import { blake2b } from 'blakejs'
import { verifyJwt } from './jwt'

const hasher = createHash('SHA-256', 'base64url')

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

  // Check JWT integrity and expiration
  const verifyResult = await verifyJwt(jwt, secret)
  if (!verifyResult.success)
    return verifyResult

  // Parse the signed data.
  const parsed = parseSignedData(signaturePayload)
  if (!parsed.success)
    return { success: false, error: parsed.error }

  const { publicKey, signature } = parsed.data

  // Compute the hash of the challenge.
  const hashResult = await hashChallenge(jwt)
  if (!hashResult.success)
    return { success: false, error: hashResult.error }

  const hash = hashResult.data

  const publicKeyHash = await hasher.digest(blake2b(publicKey.serialize(), undefined, 32))

  if (!await verifyAsync(signature, hash, publicKey.toHex()))
    return { success: false, error: 'Invalid signature' }

  const addressInstance = Address.fromHex(publicKeyHash)
  const address = addressInstance.toHex()
  const pubKeyHex = publicKey.toHex()
  return { success: true, data: { address, publicKey: pubKeyHex } }
}

/**
 * Computes the hash for the given challenge.
 *
 * @param challenge - The challenge string.
 * @param options - Options for hashing.
 * @returns The hash of the challenge.
 */
// async function hashChallenge(challenge: string | Uint8Array): Promise<Result<Uint8Array>> {
//   const input = `${HubApi.MSG_PREFIX}${challenge.toString().length}${challenge}`
//   const dataBytes = BufferUtils.fromUtf8(input)
//   const hash = Hash.computeSha256(dataBytes)
//   return { success: true, data: hash }
// }

async function hashChallenge(challenge: string | Uint8Array): Promise<Result<Uint8Array>> {
  const input = `${HubApi.MSG_PREFIX}${challenge.toString().length}${challenge}`
  const dataBytes = BufferUtils.fromUtf8(input)
  // const hash = Hash.computeSha256(dataBytes)
  const hash = await hasher.digest(dataBytes)
  const buffer = new SerialBuffer(hash.length)
  buffer.writeString(hash, hash.length)
  return { success: true, data: buffer }
}
/**
 * Represents parsed signed data.
 */
interface ParsedSignedData {
  /**
   * The public key.
   */
  publicKey: PublicKey

  /**
   * The signature.
   */
  signature: string
}

/**
 * Parses the signed data provided by the client.
 *
 * @param data - The signed data containing public key and signature.
 * @param data.publicKey - The public key in hex format.
 * @param data.signature - The signature in hex format.
 * @returns The parsed signed data.
 */
function parseSignedData({ publicKey: pkHex, signature: sigHex }: SignaturePayload): Result<ParsedSignedData> {
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

  return { success: true, data: { publicKey, signature: sigHex } }
}
