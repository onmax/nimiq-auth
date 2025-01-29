import type { SignedMessage, SignMessageRequest } from '@nimiq/hub-api'
import { BufferUtils, Hash, KeyPair } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { signLoginChallenge } from '../src/client'
import { generateUuidLoginChallenge } from '../src/server'
import { getChallengeHash } from '../src/utils'

class MockedHubApi {
  keyPair: KeyPair | undefined

  setKeyPair(keyPair: KeyPair) {
    this.keyPair = keyPair
  }

  async signMessage({ message }: SignMessageRequest): Promise<SignedMessage> {
    if (!this.keyPair)
      throw new Error('Key pair is required')

    const { success, data: hash, error: challengeStrError } = getChallengeHash(message)
    if (!success)
      throw new Error(`Failed to get challenge string: ${challengeStrError}`)

    const signature = this.keyPair.sign(hash)
    if (!signature)
      throw new Error('Failed to sign challenge string')

    const result: SignedMessage = {
      signature: signature.serialize(),
      signer: this.keyPair.publicKey.toAddress().toUserFriendlyAddress(),
      signerPublicKey: this.keyPair.publicKey.serialize(),
    }
    return result
  }
}

// Mock the entire HubApi module
vi.mock('@nimiq/hub-api', () => ({
  default: vi.fn().mockImplementation(() => new MockedHubApi()),
}))

const mockSignMessage = vi.spyOn(MockedHubApi.prototype, 'signMessage')

describe('signLoginChallenge', () => {
  const challenge = generateUuidLoginChallenge()
  const keyPair = KeyPair.generate()
  const mockPublicKey = keyPair.publicKey.serialize()
  const data = `${HubApi.MSG_PREFIX}${challenge.length}${challenge}`
  const dataBytes = BufferUtils.fromUtf8(data)
  const hash = Hash.computeSha256(dataBytes)
  const mockSignature = keyPair.sign(hash).serialize()

  const mockResponse: SignedMessage = {
    signerPublicKey: mockPublicKey,
    signature: mockSignature,
    signer: keyPair.publicKey.toAddress().toUserFriendlyAddress(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('successfully signs a valid challenge', async () => {
    mockSignMessage.mockResolvedValueOnce(mockResponse)
    const result = await signLoginChallenge(challenge)
    expect(HubApi).toHaveBeenCalledWith(undefined, undefined)
    expect(mockSignMessage).toHaveBeenCalledWith({ appName: 'Nimiq Login', message: challenge })
    expect(result).toEqual({ success: true, data: { publicKey: mockPublicKey, signature: mockSignature } })
  })

  it('handles signMessage rejection', async () => {
    const error = new Error('User canceled')
    mockSignMessage.mockRejectedValueOnce(error)

    const result = await signLoginChallenge(challenge)

    expect(result).toEqual({ success: false, error: `Failed to deserialize signed message: ${error.toString()}` })
  })

  it('handles invalid signMessage response', async () => {
    mockSignMessage.mockResolvedValueOnce(undefined as unknown as SignedMessage)

    const result = await signLoginChallenge(challenge)

    expect(result).toEqual({
      success: false,
      error: 'Failed to sign challenge',
    })
  })

  it('uses default options when none are provided', async () => {
    mockSignMessage.mockResolvedValueOnce(mockResponse)

    await signLoginChallenge(challenge)
    expect(HubApi).toHaveBeenCalledWith(undefined, undefined)
    expect(mockSignMessage).toHaveBeenCalledWith({ appName: 'Nimiq Login', message: challenge })
  })

  it('handles unexpected error types', async () => {
    mockSignMessage.mockRejectedValueOnce('Some unexpected error')

    const result = await signLoginChallenge(challenge)
    expect(result).toEqual({ success: false, error: 'Failed to deserialize signed message: Some unexpected error' })
  })
})
