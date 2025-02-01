import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
// packages/core/test/client.test.ts
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateChallengeToken } from '../src/challenge'
import { signChallengeToken } from '../src/client'

class MockedHubApi {
  keyPair: KeyPair | undefined

  setKeyPair(keyPair: KeyPair) {
    this.keyPair = keyPair
  }

  async signMessage({ message }: { message: string, appName: string }): Promise<any> {
    if (!this.keyPair)
      throw new Error('Key pair is required')
    const data = `${HubApi.MSG_PREFIX}${message.length}${message}`
    const dataBytes = BufferUtils.fromUtf8(data)
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

describe('client Token Flow Module', () => {
  const secret = 'test-secret'
  // Generate a valid challenge token (the client does not need the secret).
  const { token, challenge } = generateChallengeToken(secret)
  const keyPair = KeyPair.generate()
  const appName = 'Login with Nimiq'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully signs a valid challenge token', async () => {
    mockSignMessage.mockResolvedValueOnce({
      signerPublicKey: keyPair.publicKey.serialize(),
      signature: keyPair
        .sign(Hash.computeSha256(BufferUtils.fromUtf8(`${HubApi.MSG_PREFIX}${challenge.length}${challenge}`)))
        .serialize(),
      signer: keyPair.publicKey.toAddress().toUserFriendlyAddress(),
    })
    const result = await signChallengeToken(token)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.challengeToken).toEqual(token)
      expect(result.data.signedData.publicKey).toEqual(keyPair.publicKey.toHex())
      expect(result.data.signedData.signature).toMatch(/^[0-9a-f]+$/)
    }
    expect(mockSignMessage).toHaveBeenCalledWith({ appName, message: challenge })
  })

  it('fails when the challenge token is invalid', async () => {
    const invalidToken = 'invalid-token'
    const result = await signChallengeToken(invalidToken)
    expect(result.success).toBe(false)
    expect(result.error).toContain('Failed to decode challenge token:')
  })

  it('handles signMessage rejection', async () => {
    mockSignMessage.mockRejectedValueOnce(new Error('User canceled'))
    const result = await signChallengeToken(token)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Failed to sign challenge: Error: User canceled')
  })

  it('handles an invalid signMessage response', async () => {
    mockSignMessage.mockResolvedValueOnce(undefined)
    const result = await signChallengeToken(token)
    expect(result.success).toBe(false)
    expect(result.error).toEqual('Failed to sign challenge')
  })
})
