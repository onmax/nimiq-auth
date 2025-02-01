import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { describe, expect, it } from 'vitest'
import { generateChallengeToken } from '../src/challenge'
import { verifyChallengeTokenResponse } from '../src/server'

describe('verifyChallengeTokenResponse', () => {
  const secret = 'test-secret'
  const keyPair = KeyPair.generate()

  // Helper function to create valid signed data for a given challenge.
  function createValidSignedData(challenge: string) {
    const data = `${HubApi.MSG_PREFIX}${challenge.length}${challenge}`
    const dataBytes = BufferUtils.fromUtf8(data)
    const hash = Hash.computeSha256(dataBytes)
    const signature = keyPair.sign(hash)
    return { publicKey: keyPair.publicKey.toHex(), signature: signature.toHex() }
  }

  it('returns success with a valid token and matching signed data', () => {
    // Generate a valid token.
    const { token: challengeToken, challenge } = generateChallengeToken(secret)
    const signedData = createValidSignedData(challenge)
    const result = verifyChallengeTokenResponse({ challengeToken, signedData, secret })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.publicKey.toHex()).toEqual(keyPair.publicKey.toHex())
      expect(result.data.address.toUserFriendlyAddress()).toEqual(
        keyPair.publicKey.toAddress().toUserFriendlyAddress(),
      )
    }
  })

  it('returns error if the challenge token is malformed', () => {
    const signedData = createValidSignedData(generateChallengeToken(secret).challenge)
    const result = verifyChallengeTokenResponse({ challengeToken: 'invalid-token', signedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid challenge token format')
  })

  it('returns error when the challenge token is expired', () => {
    const { token: challengeToken, challenge } = generateChallengeToken(secret, { expirationSeconds: -10 })
    const signedData = createValidSignedData(challenge)
    const result = verifyChallengeTokenResponse({ challengeToken, signedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Challenge token expired')
  })

  it('returns error if the signed data does not match the token challenge', () => {
    const { token: challengeToken } = generateChallengeToken(secret)
    const signedData = createValidSignedData(generateChallengeToken('other-secret').challenge)
    const result = verifyChallengeTokenResponse({ challengeToken, signedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid signature')
  })

  it('returns error when signed data is missing the public key', () => {
    const { token: challengeToken, challenge } = generateChallengeToken(secret)
    const signedData = createValidSignedData(challenge)
    signedData.publicKey = ''
    const result = verifyChallengeTokenResponse({ challengeToken, signedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Public key is required')
  })

  it('returns error when signed data is missing the signature', () => {
    const { token: challengeToken, challenge } = generateChallengeToken(secret)
    const signedData = createValidSignedData(challenge)
    signedData.signature = ''
    const result = verifyChallengeTokenResponse({ challengeToken, signedData, secret })
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Signature is required')
  })
})
