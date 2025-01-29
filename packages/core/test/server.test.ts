import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { describe, expect, it } from 'vitest'
import { generateUuidLoginChallenge, verifyLoginChallenge } from '../src/server'

describe('generateChallenge', () => {
  it('generates a valid UUIDv4', () => {
    const challenge = generateUuidLoginChallenge()
    expect(challenge).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
})

describe('verifyChallenge', () => {
  const keyPair = KeyPair.generate()
  const validChallenge = generateUuidLoginChallenge()

  // Helper function to create valid signed data
  function createValidSignedData(challenge: string) {
    const data = `${HubApi.MSG_PREFIX}${challenge.length}${challenge}`
    const dataBytes = BufferUtils.fromUtf8(data)
    const hash = Hash.computeSha256(dataBytes)
    const signature = keyPair.sign(hash)

    return { publicKey: keyPair.publicKey.serialize(), signature: signature.serialize() }
  }

  it('returns error when signature is missing', () => {
    const { publicKey } = createValidSignedData(validChallenge)
    const result = verifyLoginChallenge(validChallenge, { publicKey, signature: new Uint8Array() })
    expect(result).toEqual({ success: false, error: 'Signature error: Error: signature error' })
  })

  it('returns error when publicKey is missing', () => {
    const { signature } = createValidSignedData(validChallenge)
    const result = verifyLoginChallenge(validChallenge, { publicKey: new Uint8Array(), signature })
    expect(result).toEqual({ success: false, error: 'Public key error: Error: Hit the end of buffer, expected more data' })
  })

  it('returns error when challenge is missing', () => {
    const { signature, publicKey } = createValidSignedData(validChallenge)
    const result = verifyLoginChallenge('', { publicKey, signature })
    expect(result).toEqual({ success: false, error: 'Challenge is required' })
  })

  it('returns error when challenge is invalid UUID', () => {
    const { signature, publicKey } = createValidSignedData(validChallenge)
    const result = verifyLoginChallenge('invalid-challenge', { publicKey, signature })
    expect(result).toEqual({ success: false, error: 'Challenge is not a valid UUID' })
  })

  it('returns error when publicKey is invalid', () => {
    const signedData = { publicKey: new Uint8Array([1, 2, 3]), signature: new Uint8Array([4, 5, 6]) }
    const result = verifyLoginChallenge(validChallenge, signedData)
    expect(result.success).toBe(false)
    expect(result.error).toMatch('Public key error: Error: Hit the end of buffer, expected more data')
  })

  it('returns error when signature is invalid', () => {
    const signedData = createValidSignedData(validChallenge)

    // Corrupt the signature
    signedData.signature[signedData.signature.length - 1] ^= 0xFF
    const result = verifyLoginChallenge(validChallenge, signedData)
    expect(result).toEqual({ success: false, error: 'Invalid signature', data: undefined })
  })

  it('returns success with valid inputs (Uint8Array publicKey)', () => {
    const signedData = createValidSignedData(validChallenge)
    const result = verifyLoginChallenge(validChallenge, signedData)

    expect(result.success).toBe(true)
    expect(result.data?.address.toUserFriendlyAddress()).toEqual(keyPair.publicKey.toAddress().toUserFriendlyAddress())
    expect(result.data?.publicKey.toHex()).toEqual(keyPair.publicKey.toHex())
    expect(result.data?.challenge).toBe(validChallenge)
  })

  it('returns success with hex string publicKey', () => {
    const signedData = createValidSignedData(validChallenge)
    const hexPublicKey = keyPair.publicKey.toHex()
    const result = verifyLoginChallenge(validChallenge, { ...signedData, publicKey: hexPublicKey })
    expect(result.success).toBe(true)
    expect(result.data?.publicKey.toHex()).toEqual(hexPublicKey)
  })

  it('returns error when message is tampered with', () => {
    const signedData = createValidSignedData(validChallenge)
    // Verify with different challenge
    const result = verifyLoginChallenge(generateUuidLoginChallenge(), signedData)
    expect(result).toEqual({ success: false, error: 'Invalid signature' })
  })
})
