/* eslint-disable node/prefer-global/buffer */
import { BufferUtils } from '@nimiq/core'
import { randomUUID } from 'uncrypto'
import { describe, expect, it } from 'vitest'
import { generateChallengeToken, verifyChallengeTokenResponseToken } from '../src/challenge'

const secret = 'test-secret'

describe('generateChallengeToken', () => {
  it('generates a valid token with a valid UUID challenge and future expiration', () => {
    const { token, challenge } = generateChallengeToken(secret)
    // Check that the challenge is a valid UUIDv4.
    expect(challenge).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    )

    // Decode the token to verify its structure.
    const tokenJson = BufferUtils.toUtf8(BufferUtils.fromBase64(token))
    const tokenObj = JSON.parse(tokenJson)
    expect(tokenObj).toHaveProperty('payload')
    expect(tokenObj.payload.challenge).toEqual(challenge)
    expect(typeof tokenObj.payload.exp).toBe('number')
    expect(tokenObj).toHaveProperty('sig')
    expect(tokenObj.sig).toMatch(/^[0-9a-f]+$/)
  })
})

describe('verifyChallengeTokenResponseToken', () => {
  it('returns success with a valid token', () => {
    const { token, challenge } = generateChallengeToken(secret)
    const result = verifyChallengeTokenResponseToken(token, secret)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.challenge).toEqual(challenge)
      // The expiration should be in the future.
      expect(result.data.exp).toBeGreaterThanOrEqual(Math.floor(Date.now() / 1000))
    }
  })

  it('returns error for a malformed token', () => {
    const malformedToken = 'not-base64!'
    const result = verifyChallengeTokenResponseToken(malformedToken, secret)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid challenge token format')
  })

  it('returns error when token signature is invalid', () => {
    const { token } = generateChallengeToken(secret)
    // Tamper with the token (modify payload without updating the signature).
    const tokenJson = Buffer.from(token, 'base64').toString('utf8')
    const tokenObj = JSON.parse(tokenJson)
    tokenObj.payload.challenge = randomUUID()
    const tamperedToken = Buffer.from(JSON.stringify(tokenObj)).toString('base64')
    const result = verifyChallengeTokenResponseToken(tamperedToken, secret)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Invalid challenge token signature')
  })

  it('returns error when token is expired', () => {
    // Generate a token with an expiration time in the past.
    const { token } = generateChallengeToken(secret, { expirationSeconds: -10 })
    const result = verifyChallengeTokenResponseToken(token, secret)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Challenge token expired')
  })
})
