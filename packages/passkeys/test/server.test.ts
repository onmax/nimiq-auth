import type {
  LoginPayload,
  PasskeysStorage,
  PublicKeyData,
  RegistrationPayload,
} from '../src/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  createChallenge,
  registerCredential,
  verifyLogin,
} from '../src/server'

// An in-memory store for our tests
const challenges = new Map<string, string>()
const publicKeys = new Map<string, PublicKeyData>()

const mockStorage: PasskeysStorage = {
  async storeChallenge(ch) {
    if (challenges.has(ch)) {
      throw new Error('Collision')
    }
    challenges.set(ch, ch)
  },
  async getChallenge(ch) {
    return challenges.get(ch) ?? null
  },
  async removeChallenge(ch) {
    challenges.delete(ch)
  },
  async storePublicKeyData(id, data) {
    publicKeys.set(id, data)
  },
  async getPublicKeyData(id) {
    return publicKeys.get(id) ?? null
  },
}

describe('server Functions', () => {
  const originalImportKey = globalThis.crypto.subtle.importKey
  const originalVerify = globalThis.crypto.subtle.verify

  beforeEach(() => {
    challenges.clear()
    publicKeys.clear()
    // By default, we mock them to succeed with dummy data
    vi.spyOn(globalThis.crypto.subtle, 'importKey').mockResolvedValue({
      algorithm: {},
      extractable: false,
      type: 'public',
      usages: ['verify'],
    } as CryptoKey)
    vi.spyOn(globalThis.crypto.subtle, 'verify').mockResolvedValue(true)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    globalThis.crypto.subtle.importKey = originalImportKey
    globalThis.crypto.subtle.verify = originalVerify
  })

  describe('createChallenge', () => {
    it('creates and stores a challenge', async () => {
      const ch = await createChallenge({ storage: mockStorage }).then(r => r.data!)
      expect(ch).toBeTypeOf('string')
      expect(ch.length).toBeGreaterThan(0)
      expect(challenges.get(ch)).toBe(ch)
    })

    it('throws on collisions', async () => {
      // store 'AA' so if 'AA' is generated, storeChallenge throws
      challenges.set('AA', 'AA')

      // override getRandomValues to produce [0], which leads to 'AA'
      vi.spyOn(globalThis.crypto, 'getRandomValues').mockReturnValueOnce(new Uint8Array([0]))

      await expect(createChallenge({ storage: mockStorage })).rejects.toThrow('Collision')
    })
  })

  describe('registerCredential', () => {
    it('stores credential data', async () => {
      const payload: RegistrationPayload = {
        credentialId: 'test-cred',
        algorithm: -7,
        spkiPublicKey: 'fabada',
      }
      await registerCredential({ storage: mockStorage, payload })
      const stored = publicKeys.get('test-cred')
      expect(stored).toBeDefined()
      expect(stored?.spkiPublicKey).toBe('fabada')
      expect(stored?.algorithm).toBe(-7)
      expect(stored?.createdAt).toBeGreaterThan(0)
    })
  })

  describe('verifyLogin', () => {
    it('verifies a valid login and removes the challenge', async () => {
      // store a challenge
      const challenge = 'testChallenge'
      challenges.set(challenge, challenge)

      // store a public key
      publicKeys.set('my-cred', {
        spkiPublicKey: 'abcd',
        algorithm: -7, // ECDSA
      })

      // create valid clientData JSON
      const clientData = {
        type: 'webauthn.get',
        challenge,
        origin: 'https://example.com',
      }
      const clientDataBytes = new TextEncoder().encode(JSON.stringify(clientData))
      const clientDataHex = Array.from(clientDataBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const payload: LoginPayload = {
        credentialId: 'my-cred',
        authenticatorData: '0001',
        clientDataJSON: clientDataHex,
        asn1Signature: '9999',
      }

      await verifyLogin({ storage: mockStorage, payload })
      expect(challenges.has(challenge)).toBe(false)
    })

    it('throws if challenge mismatch occurs', async () => {
      // store a different challenge
      challenges.set('storedCh', 'storedCh')

      // clientData references a mismatch
      const clientData = {
        type: 'webauthn.get',
        challenge: 'clientCh',
        origin: 'https://example.org',
      }
      const bytes = new TextEncoder().encode(JSON.stringify(clientData))
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

      const payload: LoginPayload = {
        credentialId: 'whatever',
        authenticatorData: '0001',
        clientDataJSON: hex,
        asn1Signature: '9999',
      }

      const { success, error } = await verifyLogin({ storage: mockStorage, payload })
      expect(success).toBe(false)
      expect(error).toBe('Challenge mismatch')
    })

    it('throws if public key is not found', async () => {
      // store matching challenge
      challenges.set('c', 'c')

      const clientData = {
        type: 'webauthn.get',
        challenge: 'c',
        origin: 'https://example.com',
      }
      const bytes = new TextEncoder().encode(JSON.stringify(clientData))
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

      const payload: LoginPayload = {
        credentialId: 'no-cred',
        authenticatorData: '0001',
        clientDataJSON: hex,
        asn1Signature: 'aaaa',
      }
      const { error, success } = await verifyLogin({ storage: mockStorage, payload })
      expect(success).toBe(false)
      expect(error).toBe('Public key not found')
    })

    it('throws if signature verification fails', async () => {
      // @ts-expect-error not sure how to type
      ;(globalThis.crypto.subtle.verify as vi.Mock).mockResolvedValueOnce(false)

      challenges.set('x', 'x')
      publicKeys.set('my-cred', { spkiPublicKey: 'ff', algorithm: -7 })

      const clientData = {
        type: 'webauthn.get',
        challenge: 'x',
        origin: 'https://example.com',
      }
      const bytes = new TextEncoder().encode(JSON.stringify(clientData))
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

      const payload: LoginPayload = {
        credentialId: 'my-cred',
        authenticatorData: '0001',
        clientDataJSON: hex,
        asn1Signature: '9999',
      }
      const { error, success } = await verifyLogin({ storage: mockStorage, payload })
      expect(success).toBe(false)
      expect(error).toBe('Signature verification failed')
      // challenge remains
      expect(challenges.has('x')).toBe(true)
    })

    it('throws if clientData type is not webauthn.get', async () => {
      const c = 'someCh'
      challenges.set(c, c)
      publicKeys.set('my-cred', { spkiPublicKey: 'abc', algorithm: -7 })

      const clientData = {
        type: 'webauthn.create',
        challenge: c,
        origin: 'https://example.com',
      }
      const bytes = new TextEncoder().encode(JSON.stringify(clientData))
      const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')

      const payload: LoginPayload = {
        credentialId: 'my-cred',
        authenticatorData: '00',
        clientDataJSON: hex,
        asn1Signature: '00',
      }
      const { error, success } = await verifyLogin({ storage: mockStorage, payload })
      expect(success).toBe(false)
      expect(error).toBe('Invalid clientData type')
    })
  })
})
