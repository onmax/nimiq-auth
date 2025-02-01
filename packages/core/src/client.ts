import type { SignedMessage } from '@nimiq/hub-api'
import type { AsyncResult, SignedData } from './types'
import { PublicKey, Signature } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'

export interface SignChallengeOptions {
  /**
   * The Hub API options
   */
  nimiqHubOptions?: {
    /**
     * The endpoint of the Hub API.
     * @default https://hub.nimiq.com
     */
    endpoint?: ConstructorParameters< typeof HubApi>[0]

    /**
     * The behavior of the Hub API.
     * @default undefined - use the default behavior from the Hub API
     */
    behavior?: ConstructorParameters< typeof HubApi>[1]
  }

  /**
   * The name of the app that is signing the challenge.
   * @default 'Login with Nimiq'
   */
  appName?: string
}

/**
 * Signs the challenge contained in a challenge token using the Hub API.
 *
 * @param challengeToken - The token provided by the server.
 * @param options - Options for the Hub API (endpoint, behavior) and the app name.
 * @returns An object containing the original challenge token and the signed data.
 */
export async function signChallengeToken(challengeToken: string, options: SignChallengeOptions = {}): AsyncResult<{ challengeToken: string, signedData: SignedData }> {
  const { appName = 'Login with Nimiq' } = options as Required<SignChallengeOptions>
  const nimiqHubOptions = options.nimiqHubOptions ?? { endpoint: 'https://hub.nimiq.com', behavior: undefined }

  // Decode the challenge token to extract the challenge value.
  let challenge: string
  try {
    // eslint-disable-next-line node/prefer-global/buffer
    const tokenJson = Buffer.from(challengeToken, 'base64').toString('utf8')
    const tokenObj = JSON.parse(tokenJson)
    if (!tokenObj.payload || !tokenObj.payload.challenge)
      return { success: false, error: 'Invalid challenge token: missing challenge' }

    challenge = tokenObj.payload.challenge
  }
  catch (e: unknown) {
    return {
      success: false,
      error: `Failed to decode challenge token: ${e?.toString() || 'unknown error'}`,
    }
  }

  // Use the extracted challenge to request a signature via the Hub API.
  const hubApi = new HubApi(nimiqHubOptions.endpoint, nimiqHubOptions.behavior)
  let maybeSignedMessage: SignedMessage | void
  try {
    maybeSignedMessage = await hubApi.signMessage({ appName, message: challenge })
  }
  catch (e: unknown) {
    return {
      success: false,
      error: `Failed to sign challenge: ${e?.toString() || 'unknown error'}`,
    }
  }

  if (!maybeSignedMessage)
    return { success: false, error: 'Failed to sign challenge' }

  const publicKey = PublicKey.deserialize(maybeSignedMessage.signerPublicKey).toHex()
  const signature = Signature.deserialize(maybeSignedMessage.signature).toHex()
  const data = { challengeToken, signedData: { publicKey, signature } }
  return { success: true, data }
}
