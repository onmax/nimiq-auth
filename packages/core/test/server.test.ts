import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { describe, expect, it } from 'vitest'
import { createJwt, decodeJwt } from '../src/jwt'
import { verifyAuthResponse } from '../src/server'

describe('verifyAuthResponse', () => {
  const secret = 'test-secret'
  const keyPair = KeyPair.generate()
  const jwtResult = createJwt({ secret })
  expect(jwtResult.success).toBe(true)
  if (!jwtResult.success)
    return
  const jwt = jwtResult.data

  // Helper function to create valid signed data for a given challenge.
  function createValidSignedData(jwt: string) {
    const input = `${HubApi.MSG_PREFIX}${jwt.toString().length}${jwt}`
    const dataBytes = BufferUtils.fromUtf8(input)
    const hash = Hash.computeSha256(dataBytes)
    const signature = keyPair.sign(hash)
    const publicKey = keyPair.publicKey.toHex()
    const address = keyPair.publicKey.toAddress().toUserFriendlyAddress()
    return { publicKey, signature: signature.toHex(), address }
  }

  const validSignedData = createValidSignedData(jwt)

  it('returns success with a valid JWT and matching signed data', () => {
    const result = verifyAuthResponse({ jwt, signaturePayload: validSignedData, secret })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publicKey).toEqual(keyPair.publicKey.toHex())
      expect(result.data.address).toEqual(keyPair.publicKey.toAddress().toUserFriendlyAddress())
    }
  })

  it('returns error if the JWT is malformed', () => {
    const result = verifyAuthResponse({ jwt: 'invalid-JWT', signaturePayload: validSignedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid JWT format')
  })

  it('returns error if the signed data does not match the JWT', () => {
    // Create signed data using a different JWT.
    const otherJwtResult = createJwt({ secret: 'other-secret' })
    if (!otherJwtResult.success)
      throw new Error('JWT creation failed')
    const otherDecode = decodeJwt(otherJwtResult.data)
    if (!otherDecode.success)
      throw new Error('JWT decoding failed')
    const otherChallenge = otherDecode.data.payload.jti!
    const mismatchedSignedData = createValidSignedData(otherChallenge)
    const result = verifyAuthResponse({ jwt, signaturePayload: mismatchedSignedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid signature')
  })

  it('returns error when signed data is missing the public key', () => {
    const invalidData = { publicKey: '', signature: validSignedData.signature, address: validSignedData.address }
    const result = verifyAuthResponse({ jwt, signaturePayload: invalidData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid signed data public key: undefined')
  })

  it('returns error when signed data is missing the signature', () => {
    const invalidData = { publicKey: validSignedData.publicKey, signature: '', address: validSignedData.address }
    const result = verifyAuthResponse({ jwt, signaturePayload: invalidData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid signed data signature: undefined')
  })
})
