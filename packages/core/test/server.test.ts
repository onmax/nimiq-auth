import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { describe, expect, it } from 'vitest'
import { generateUuidChallenge, verifyChallenge } from '../src/server'

describe('generateChallenge', () => {
  it('generates a valid UUIDv4', () => {
    const challenge = generateUuidChallenge()
    expect(challenge).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  })
})

describe('verifyChallenge', () => {
  const keyPair = KeyPair.generate()
  const validChallenge = generateUuidChallenge()

  // Helper function to create valid signed data
  function createValidSignedData(challenge: string) {
    const data = `${HubApi.MSG_PREFIX}${challenge.length}${challenge}`
    const dataBytes = BufferUtils.fromUtf8(data)
    const hash = Hash.computeSha256(dataBytes)
    const signature = keyPair.sign(hash)

    return { publicKey: keyPair.publicKey.toHex(), signature: signature.toHex() }
  }

  it('returns error when signature is missing', () => {
    const { publicKey } = createValidSignedData(validChallenge)
    const signedData = { publicKey, signature: '' }
    const result = verifyChallenge({ challenge: validChallenge, signedData })
    expect(result).toEqual({ success: false, error: 'Signature is required' })
  })

  it('returns error when publicKey is missing', () => {
    const { signature } = createValidSignedData(validChallenge)
    const signedData = { publicKey: '', signature }
    const result = verifyChallenge({ challenge: validChallenge, signedData })
    expect(result).toEqual({ success: false, error: 'Public key is required', data: undefined })
  })

  it('returns error when challenge is missing', () => {
    const signedData = createValidSignedData(validChallenge)
    const result = verifyChallenge({ challenge: '', signedData })
    expect(result).toEqual({ success: false, error: 'Challenge is required' })
  })

  it('returns error when challenge is invalid UUID', () => {
    const signedData = createValidSignedData(validChallenge)
    const result = verifyChallenge({ challenge: 'invalid', signedData })
    expect(result).toEqual({ success: false, error: 'Challenge is not a valid UUID' })
  })

  it('returns error when publicKey is invalid', () => {
    const { signature } = createValidSignedData(validChallenge)
    const signedData = { publicKey: 'abc', signature }
    const result = verifyChallenge({ challenge: validChallenge, signedData })
    expect(result.success).toBe(false)
    expect(result.error).toMatch('Public key error: Error: Odd number of digits')
  })

  it('returns error when signature is invalid', () => {
    const signedData = createValidSignedData(validChallenge)

    // Corrupt the signature
    signedData.signature = `${signedData.signature.slice(0, -1)}ff`
    const result = verifyChallenge({ challenge: validChallenge, signedData })
    expect(result).toEqual({ success: false, error: 'Signature error: Error: Odd number of digits', data: undefined })
  })

  it('returns success with valid inputs (Uint8Array publicKey)', () => {
    const signedData = createValidSignedData(validChallenge)
    const result = verifyChallenge({ challenge: validChallenge, signedData })

    expect(result.success).toBe(true)
    expect(result.data?.address.toUserFriendlyAddress()).toEqual(keyPair.publicKey.toAddress().toUserFriendlyAddress())
    expect(result.data?.publicKey.toHex()).toEqual(keyPair.publicKey.toHex())
  })

  it('returns error when message is tampered with', () => {
    const signedData = createValidSignedData(validChallenge)
    const result = verifyChallenge({ challenge: generateUuidChallenge(), signedData })
    expect(result).toEqual({ success: false, error: 'Invalid signature' })
  })
})
