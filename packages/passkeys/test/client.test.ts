import type { Credential } from '../src/types'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { loginPasskey, registerPasskey, signData } from '../src/client'
import { bufferToHex } from '../src/helpers'

// Dummy values for testing.
const dummyRawId = new Uint8Array([1, 2, 3]).buffer
const dummySpki = new Uint8Array([4, 5, 6]).buffer
const dummySignature = new Uint8Array([7, 8, 9]).buffer

// Create a dummy PublicKeyCredential for registration.
const dummyCredential = {
  rawId: dummyRawId,
  response: {
    // Simulate a method that returns the public key bytes.
    getPublicKey: () => dummySpki,
    // Simulate a method that returns the public key algorithm.
    getPublicKeyAlgorithm: () => -7,
    // Simulate transports.
    getTransports: () => ['usb'],
  },
} as unknown as PublicKeyCredential

// Create a dummy assertion for login/signing.
const dummyAssertion = {
  rawId: dummyRawId,
  id: bufferToHex(dummyRawId),
  response: {
    authenticatorData: dummySpki, // reuse dummySpki for simplicity
    clientDataJSON: dummySpki, // reuse dummySpki
    signature: dummySignature,
  },
} as unknown as PublicKeyCredential

// Save original implementations.
const originalCreate = globalThis.navigator.credentials?.create
const originalGet = navigator.credentials?.get
const originalFetch = globalThis.fetch

describe('passkeys Library', () => {
  beforeEach(() => {
    // @ts-expect-error Mocking navigator.credentials
    navigator.credentials = {
      create: vi.fn().mockResolvedValue(dummyCredential),
      get: vi.fn().mockResolvedValue(dummyAssertion),
    } as any

    // Mock fetch for server endpoints.
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      text: vi.fn().mockResolvedValue('OK'),
      json: vi.fn().mockResolvedValue({
        spkiPublicKey: bufferToHex(dummySpki),
        algorithm: -7,
        multisigPubKey: 'dummy-multisig',
      }),
    })
  })

  afterEach(() => {
    // Restore original implementations.
    if (originalCreate) {
      navigator.credentials.create = originalCreate
    }
    if (originalGet) {
      navigator.credentials.get = originalGet
    }
    if (originalFetch) {
      globalThis.fetch = originalFetch
    }
    vi.clearAllMocks()
  })

  describe('registerPasskey', () => {
    it('returns a valid credential without contacting the server', async () => {
      const cred: Credential = await registerPasskey().then(r => r.data!)
      expect(cred.id).toBe(bufferToHex(dummyRawId))
      expect(cred.publicKey).toBe(bufferToHex(dummySpki))
      expect(cred.publicKeyAlgorithm).toBe(-7)
      expect(cred.transports).toEqual(['usb'])
    })

    it('calls server endpoint when serverRegisterUrl is provided', async () => {
      const serverUrl = 'https://example.com/register'
      await registerPasskey({ serverRegisterUrl: serverUrl })
      expect(globalThis.fetch).toHaveBeenCalled()
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe(serverUrl)
      // Check that the body contains our dummy data.
      const body = JSON.parse(fetchCall[1].body)
      expect(body.credentialId).toBe(bufferToHex(dummyRawId))
      expect(body.spkiPublicKey).toBe(bufferToHex(dummySpki))
      expect(body.algorithm).toBe(-7)
    })

    it('throws an error when no credential is created', async () => {
      // Simulate no credential returned.
      (navigator.credentials.create as any).mockResolvedValue(null)
      const { error, success } = await registerPasskey()
      expect(success).toBe(false)
      expect(error).toBe('No credential created')
    })

    it('throws an error when public key is missing', async () => {
      // Simulate a response without getPublicKey.
      const badCredential = {
        rawId: dummyRawId,
        response: {}, // no getPublicKey method
      } as unknown as PublicKeyCredential;
      (navigator.credentials.create as any).mockResolvedValue(badCredential)
      const { error, success } = await registerPasskey()
      expect(success).toBe(false)
      expect(error).toBe('No public key received')
    })
  })

  describe('loginPasskey', () => {
    const challenge = crypto.getRandomValues(new Uint8Array(32))

    it('returns a valid credential when login succeeds without server endpoint', async () => {
      const cred: Credential = await loginPasskey({ challenge }).then(r => r.data!)
      // When no server call is made, our function returns an empty publicKey.
      expect(cred.id).toBe(bufferToHex(dummyRawId))
      expect(cred.publicKey).toBe('')
    })

    it('calls server endpoint when serverLoginUrl is provided', async () => {
      const serverUrl = 'https://example.com/login'
      const cred: Credential = (await loginPasskey({ challenge, serverLoginUrl: serverUrl })).data!
      expect(globalThis.fetch).toHaveBeenCalled()
      const fetchCall = (globalThis.fetch as any).mock.calls[0]
      expect(fetchCall[0]).toBe(serverUrl)
      const body = JSON.parse(fetchCall[1].body)
      expect(body.credentialId).toBe(dummyAssertion.id)
      // The returned credential uses the data from the server.
      expect(cred.publicKey).toBe(bufferToHex(dummySpki))
      expect(cred.publicKeyAlgorithm).toBe(-7)
      expect(cred.multisigPubKey).toBe('dummy-multisig')
    })

    it('throws an error when no assertion is received', async () => {
      (navigator.credentials.get as any).mockResolvedValue(null)
      const { error, success } = await loginPasskey({ challenge })
      expect(error).toBe('No assertion received')
      expect(success).toBe(false)
    })
  })

  describe('signData', () => {
    const dummyData = new Uint8Array([10, 20, 30])

    it('returns a signature as an ArrayBuffer when assertion succeeds', async () => {
      const buffer = await signData(dummyData, {
        id: bufferToHex(dummyRawId),
        publicKey: bufferToHex(dummySpki),
        publicKeyAlgorithm: -7,
      }).then(r => r.data!)
      expect(buffer).toBeInstanceOf(ArrayBuffer)
      const resultHex = bufferToHex(buffer)
      // Since our dummy signature is used, we expect it to match.
      expect(resultHex).toBe(bufferToHex(dummySignature))
    })

    it('throws an error when no assertion is received', async () => {
      (navigator.credentials.get as any).mockResolvedValue(null)
      const { error, success } = await signData(dummyData, {
        id: bufferToHex(dummyRawId),
        publicKey: bufferToHex(dummySpki),
        publicKeyAlgorithm: -7,
      })
      expect(success).toBe(false)
      expect(error).toBe('No assertion received for signing')
    })
  })
})
