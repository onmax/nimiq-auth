import crypto from 'node:crypto'
import { BufferUtils } from '@nimiq/core'
import { randomUUID } from 'uncrypto'
import { describe, expect, it, vi } from 'vitest'
import { createJwt, decodeJwt, encodeJwt, validateJwt, verifyJwt } from '../src/jwt'

describe('jwt nodule', () => {
  const secret = 'test-secret'

  describe('createJwt', () => {
    it('generates a valid JWT with default values', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      expect(typeof jwt).toBe('string')

      const parts = jwt.split('.')
      expect(parts.length).toBe(3)

      const headerJson = BufferUtils.toUtf8(BufferUtils.fromBase64Url(parts[0]))
      const payloadJson = BufferUtils.toUtf8(BufferUtils.fromBase64Url(parts[1]))
      const header = JSON.parse(headerJson)
      const payload = JSON.parse(payloadJson)

      // Check header
      expect(header.alg).toBe('HS256')
      expect(header.typ).toBe('JWT')

      // Check payload defaults
      expect(payload.iss).toBe('Nimiq Auth')
      expect(payload.jti).toBe(decodeJwt(jwt).data?.payload.jti)
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('allows custom payload options', async () => {
      const mockTime = 1000000000
      vi.spyOn(Date, 'now').mockImplementation(() => mockTime * 1000)

      const customIssuer = 'My App'
      const customExp = mockTime + 600
      const { data: jwt, success } = await createJwt({ secret, appName: customIssuer, nimiqAuthJwtDuration: 600 })
      expect(success).toBe(true)
      if (!success)
        return

      expect(decodeJwt(jwt).data?.payload.iss).toBe(customIssuer)
      expect(decodeJwt(jwt).data?.payload.exp).toBe(customExp)

      vi.restoreAllMocks() // Clean up the mock
    })

    it('returns an error if the expiration time is in the past', async () => {
      const result = await createJwt({ secret, nimiqAuthJwtDuration: -12 })
      expect(result.success).toBe(false)
      expect(result.error).toBe('JWT expired')
    })
  })

  describe('verifyJwt', () => {
    it('verifies a valid JWT successfully', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      const verifyResult = await verifyJwt(jwt, secret)
      expect(verifyResult.success).toBe(true)
      if (!verifyResult.success)
        return

      const payload = verifyResult.data
      expect(payload.iss).toBe('Nimiq Auth')
      expect(payload.jti).toBe(decodeJwt(jwt).data?.payload.jti)
      expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('returns an error for a JWT with an invalid format', async () => {
      const invalidJwt = 'abc.def'
      const result = await verifyJwt(invalidJwt, secret)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT format')
    })

    it('returns an error for a JWT with a tampered signature', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      // Tamper with the signature by modifying its last character.
      const parts = jwt.split('.')
      parts[2] = parts[2].slice(0, -1) + (parts[2].slice(-1) === 'A' ? 'B' : 'A')
      const tamperedJwt = parts.join('.')
      const result = await verifyJwt(tamperedJwt, secret)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT signature')
    })

    it('returns an error for an expired JWT', async () => {
      // Construct an expired jwt manually.
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        exp: Math.floor(Date.now() / 1000) - 10,
        iss: 'Nimiq Auth',
        jti: 'expired-uuid',
      }
      const headerEncoded = BufferUtils.toBase64Url(BufferUtils.fromUtf8(JSON.stringify(header)))
      const payloadEncoded = BufferUtils.toBase64Url(BufferUtils.fromUtf8(JSON.stringify(payload)))
      const unsignedJwt = `${headerEncoded}.${payloadEncoded}`
      const signature = crypto.createHmac('sha256', secret).update(unsignedJwt).digest()
      const signatureEncoded = BufferUtils.toBase64Url(signature)
      const jwt = `${unsignedJwt}.${signatureEncoded}`

      const result = await verifyJwt(jwt, secret)
      expect(result.success).toBe(false)
      expect(result.error).toBe('JWT expired')
    })

    it('returns an error if the payload is missing required fields', async () => {
      // Create a JWT with payload missing the "iss" field.
      const header = { alg: 'HS256', typ: 'JWT' }
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 300,
        jti: 'some-uuid',
      }
      const headerEncoded = BufferUtils.toBase64Url(BufferUtils.fromUtf8(JSON.stringify(header)))
      const payloadEncoded = BufferUtils.toBase64Url(BufferUtils.fromUtf8(JSON.stringify(payload)))
      const unsignedJwt = `${headerEncoded}.${payloadEncoded}`
      const signature = crypto.createHmac('sha256', secret).update(unsignedJwt).digest()
      const signatureEncoded = BufferUtils.toBase64Url(signature)
      const jwt = `${unsignedJwt}.${signatureEncoded}`

      const result = await verifyJwt(jwt, secret)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT payload')
    })
  })

  describe('encodeJwt', () => {
    it('encodes a valid payload to a JWT', async () => {
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 300,
        iss: 'Test Issuer',
        jti: randomUUID(),
      }
      const result = await encodeJwt(payload, secret)
      expect(result.success).toBe(true)
      if (!result.success)
        return

      const parts = result.data.split('.')
      expect(parts.length).toBe(3)
      const headerJson = BufferUtils.toUtf8(BufferUtils.fromBase64Url(parts[0]))
      const header = JSON.parse(headerJson)
      expect(header.alg).toBe('HS256')
      expect(header.typ).toBe('JWT')
    })

    it('returns an error when payload is missing required fields', async () => {
      const payload = {
        exp: Math.floor(Date.now() / 1000) + 300,
        jti: randomUUID(),
      } as any
      const result = await encodeJwt(payload, secret)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT payload')
    })

    it('returns an error when payload expiration is in the past', async () => {
      const payload = {
        exp: Math.floor(Date.now() / 1000) - 10,
        iss: 'Test Issuer',
        jti: randomUUID(),
      }
      const result = await encodeJwt(payload, secret)
      expect(result.success).toBe(false)
      expect(result.error).toBe('JWT expired')
    })
  })

  describe('decodeJwt', () => {
    it('decodes a valid JWT', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      const decodeResult = decodeJwt(jwt)
      expect(decodeResult.success).toBe(true)
      if (!decodeResult.success)
        return

      const { header, payload, signature } = decodeResult.data
      expect(header.alg).toBe('HS256')
      expect(header.typ).toBe('JWT')
      expect(payload.iss).toBe('Nimiq Auth')
      expect(typeof signature).toBe('string')
    })

    it('returns an error for a JWT with an invalid format', () => {
      const invalidJwt = 'abc.def'
      const result = decodeJwt(invalidJwt)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT format')
    })

    it('returns an error for a non-string JWT', () => {
      // @ts-expect-error Testing non-string input.
      const result = decodeJwt(123)
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT')
    })
  })

  describe('validateJwt', () => {
    it('validates a correct JWT structure', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      const decodeResult = decodeJwt(jwt)
      expect(decodeResult.success).toBe(true)
      if (!decodeResult.success)
        return

      const { header, payload, signature } = decodeResult.data
      const result = validateJwt({ header, payload, signature })
      expect(result.success).toBe(true)
      if (!result.success)
        return
      expect(result.data.iss).toBeDefined()
      expect(result.data.jti).toBeDefined()
      expect(result.data.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
    })

    it('returns an error for an invalid header', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      const decodeResult = decodeJwt(jwt)
      expect(decodeResult.success).toBe(true)
      if (!decodeResult.success)
        return

      // Modify header to use a wrong algorithm.
      const invalidHeader = { ...decodeResult.data.header, alg: 'HS512' }
      const result = validateJwt({
        header: invalidHeader,
        payload: decodeResult.data.payload,
        signature: decodeResult.data.signature,
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT header')
    })

    it('returns an error for an invalid payload', async () => {
      const { data: jwt, success } = await createJwt({ secret })
      expect(success).toBe(true)
      if (!success)
        return

      const decodeResult = decodeJwt(jwt)
      expect(decodeResult.success).toBe(true)
      if (!decodeResult.success)
        return

      // Remove a required field from payload.
      const invalidPayload = { ...decodeResult.data.payload }
      // @ts-expect-error just for testing
      delete invalidPayload.iss
      const result = validateJwt({
        header: decodeResult.data.header,
        payload: invalidPayload,
        signature: decodeResult.data.signature,
      })
      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid JWT payload')
    })
  })
})
