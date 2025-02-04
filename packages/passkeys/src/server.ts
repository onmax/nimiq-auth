import type { AsyncResult } from './types'
import { asn1ToRaw, fromHex } from './helpers'

/**
 * An interface describing how to store and retrieve passkeys data.
 * You can implement these functions using in-memory maps, databases, etc.
 */
export interface PasskeysStorage {
  /**
   * Store a random challenge string.
   * @param challenge The challenge to store.
   * @throws If a collision or error occurs.
   */
  storeChallenge: (challenge: string) => Promise<void>

  /**
   * Retrieve a previously-stored challenge.
   * @param challenge The challenge to look up.
   * @returns The matching challenge or null if not found.
   */
  getChallenge: (challenge: string) => Promise<string | null>

  /**
   * Remove a challenge from storage.
   * @param challenge The challenge to remove.
   */
  removeChallenge: (challenge: string) => Promise<void>

  /**
   * Store credential data describing a public key.
   * @param credentialId The ID of the credential.
   * @param data The public key data to store.
   */
  storePublicKeyData: (credentialId: string, data: PublicKeyData) => Promise<void>

  /**
   * Retrieve the public key data by credential ID.
   * @param credentialId The ID of the credential to look up.
   * @returns The public key data or null if not found.
   */
  getPublicKeyData: (credentialId: string) => Promise<PublicKeyData | null>
}

/**
 * An object describing a stored public key.
 */
export interface PublicKeyData {
  /**
   * Hex-encoded SPKI public key.
   */
  spkiPublicKey: string
  /**
   * COSE algorithm ID (e.g. -7 for ES256).
   */
  algorithm?: number
  /**
   * Unix timestamp of creation.
   */
  createdAt?: number
  /**
   * Optional extra public key (e.g. for multi-sig).
   */
  multisigPubKey?: string
}

/**
 * Payload sent when registering a new credential.
 */
export interface RegistrationPayload {
  credentialId: string
  algorithm: number
  spkiPublicKey: string
  multisigPubKey?: string
}

/**
 * Payload sent when verifying a login.
 */
export interface LoginPayload {
  credentialId: string
  authenticatorData: string // hex
  clientDataJSON: string // hex
  asn1Signature: string // hex
}

export interface CreateChallengeOptions {
  /**
   * The PasskeysStorage callbacks.
   */
  storage: PasskeysStorage
}

/**
 * Creates a random challenge, stores it, and returns it.
 * The returned string is in Base64URL format with no padding.
 * @param options The Passkeys options.
 * @param options.storage The PasskeysStorage callbacks.
 * @returns The generated challenge.
 */
export async function createChallenge({ storage }: CreateChallengeOptions): AsyncResult<string> {
  // 32 random bytes
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const challenge = globalThis.btoa(String.fromCharCode(...randomBytes)).replaceAll('/', '_').replaceAll('+', '-').replaceAll('=', '')
  // Attempt to store
  await storage.storeChallenge(challenge)
  return { success: true, data: challenge }
}

export interface RegisterCredentialOptions {
  /**
   * The PasskeysStorage callbacks.
   */
  storage: PasskeysStorage

  /**
   * The registration data from the client.
   */
  payload: RegistrationPayload
}

/**
 * Registers a new passkey credential by storing the associated public key data.
 * @param options The Passkeys options.
 * @param options.storage The PasskeysStorage callbacks.
 * @param options.payload The registration data from the client.
 */
export async function registerCredential({ storage, payload }: RegisterCredentialOptions): AsyncResult<undefined> {
  try {
    const record: PublicKeyData = {
      spkiPublicKey: payload.spkiPublicKey,
      algorithm: payload.algorithm,
      createdAt: Math.floor(Date.now() / 1000),
      multisigPubKey: payload.multisigPubKey,
    }
    await storage.storePublicKeyData(payload.credentialId, record)
    return { data: undefined, success: true }
  }
  catch (e) {
    return { error: (e as { message?: string }).message || JSON.stringify(e), data: undefined, success: false }
  }
}

export interface VerifyLoginOptions {
  /**
   * The PasskeysStorage callbacks.
   */
  storage: PasskeysStorage

  /**
   * The login data from the client.
   */
  payload: LoginPayload
}

/**
 * Verifies a login request:
 *   1. Parse the clientData to extract challenge
 *   2. Verify challenge matches storage
 *   3. Import the stored public key
 *   4. Check the signature
 *   5. Remove challenge on success
 * @param options The Passkeys options.
 * @param options.storage The PasskeysStorage callbacks.
 * @param options.payload The login data from the client.
 * @returns The public key data if verification passes.
 * @throws If challenge mismatch, unknown key, or signature fails.
 */
export async function verifyLogin({ storage, payload }: VerifyLoginOptions): AsyncResult<PublicKeyData> {
  try {
    const authenticatorData = fromHex(payload.authenticatorData)
    const clientDataBytes = fromHex(payload.clientDataJSON)
    const asn1SignatureBytes = fromHex(payload.asn1Signature)

    // 1) Parse the clientData
    interface ClientData { type: string, challenge: string, origin: string }
    const clientData = JSON.parse(new TextDecoder().decode(clientDataBytes)) as ClientData
    if (clientData.type !== 'webauthn.get')
      return { error: 'Invalid clientData type', success: false }

    // 2) Check the stored challenge
    const storedChallenge = await storage.getChallenge(clientData.challenge)
    if (!storedChallenge || storedChallenge !== clientData.challenge)
      return { error: 'Challenge mismatch', success: false }

    // 3) Get the stored public key
    const pubkeyData = await storage.getPublicKeyData(payload.credentialId)
    if (!pubkeyData)
      return { error: 'Public key not found', success: false }

    // 4) Verify the signature
    // Build data = authenticatorData + SHA-256(clientData)
    const clientDataHash = new Uint8Array(await crypto.subtle.digest('SHA-256', clientDataBytes))
    const signatureBase = new Uint8Array([...authenticatorData, ...clientDataHash])

    // Decide import params based on algorithm
    const importParams = pubkeyData.algorithm === -7 || pubkeyData.algorithm === undefined
      ? { name: 'ECDSA', namedCurve: 'P-256' } satisfies EcKeyImportParams
      : { name: 'Ed25519' } satisfies Algorithm

    const rawSpki = fromHex(pubkeyData.spkiPublicKey)
    const importedKey = await crypto.subtle.importKey('spki', rawSpki, importParams, false, ['verify'])
    const verifyParams = importParams.name === 'Ed25519'
      ? { name: 'Ed25519' } satisfies Algorithm
      : { name: 'ECDSA', hash: { name: 'SHA-256' } } satisfies EcdsaParams

    // Convert from ASN.1 if needed
    const signatureToVerify = asn1SignatureBytes.length === 64 ? asn1SignatureBytes : asn1ToRaw(asn1SignatureBytes)

    const ok = await crypto.subtle.verify(verifyParams, importedKey, signatureToVerify, signatureBase)
    if (!ok)
      return { success: false, error: 'Signature verification failed' }

    // 5) Remove challenge
    await storage.removeChallenge(clientData.challenge)

    return { success: true, data: pubkeyData }
  }
  catch (error) {
    return { success: false, error: (error as Error).message }
  }
}
