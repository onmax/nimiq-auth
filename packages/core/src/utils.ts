import type { Result, SignedData } from './types'
import { BufferUtils, Hash, PublicKey, Signature, SignatureProof } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'

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
