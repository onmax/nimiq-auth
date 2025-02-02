import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signJwt } from '../src/client'
import { createJwt, decodeJwt } from '../src/jwt'

class MockedHubApi {
  keyPair: KeyPair | undefined

  setKeyPair(keyPair: KeyPair) {
    this.keyPair = keyPair
  }

  async signMessage({ message }: { message: string, appName: string }): Promise<any> {
    if (!this.keyPair)
      throw new Error('Key pair is required')
    const input = `${HubApi.MSG_PREFIX}${message.toString().length}${message}`
    const dataBytes = BufferUtils.fromUtf8(input)
    const hash = Hash.computeSha256(dataBytes)
    const signature = this.keyPair.sign(hash)
    return {
      signerPublicKey: this.keyPair.publicKey.serialize(),
      signature: signature.serialize(),
      signer: this.keyPair.publicKey.toAddress().toUserFriendlyAddress(),
    }
  }
}

// Mock the HubApi module so that new HubApi() returns our mocked instance.
vi.mock('@nimiq/hub-api', () => ({
  default: vi.fn().mockImplementation(() => new MockedHubApi()),
}))

const mockSignMessage = vi.spyOn(MockedHubApi.prototype, 'signMessage')

describe('signJwt Module', () => {
  const secret = 'test-secret'
  const jwtResult = createJwt({ secret })
  if (!jwtResult.success) {
    throw new Error('JWT creation failed')
  }
  const jwt = jwtResult.data
  const decodeResult = decodeJwt(jwt)
  if (!decodeResult.success) {
    throw new Error('JWT decoding failed')
  }
  const keyPair = KeyPair.generate()
  const appName = 'Nimiq Auth'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully signs a valid JWT', async () => {
    mockSignMessage.mockResolvedValueOnce({
      signerPublicKey: keyPair.publicKey.serialize(),
      signature: keyPair
        .sign(Hash.computeSha256(BufferUtils.fromUtf8(`${HubApi.MSG_PREFIX}${jwt!.toString().length}${jwt}`)))
        .serialize(),
      signer: keyPair.publicKey.toAddress().toUserFriendlyAddress(),
    })
    const { success, data } = await signJwt(jwt)
    expect(success).toBe(true)
    if (success) {
      expect(data.publicKey).toEqual(keyPair.publicKey.toHex())
      expect(data.signature).toMatch(/^[0-9a-f]+$/)
    }
    expect(mockSignMessage).toHaveBeenCalledWith({ appName, message: jwt })
  })

  it('fails when the JWT is invalid', async () => {
    const invalidJwt = 'invalid-JWT'
    const result = await signJwt(invalidJwt)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Invalid JWT format')
  })

  it('handles signMessage rejection', async () => {
    mockSignMessage.mockRejectedValueOnce(new Error('User canceled'))
    const result = await signJwt(jwt)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Failed to sign JWT Error: User canceled')
  })

  it('handles an invalid signMessage response', async () => {
    mockSignMessage.mockResolvedValueOnce(undefined)
    const result = await signJwt(jwt)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Failed to sign JWT')
  })
})
