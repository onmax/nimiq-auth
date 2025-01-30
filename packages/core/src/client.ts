import type { SignedMessage } from '@nimiq/hub-api'
import type { AsyncResult, SignedData } from './types'
import HubApi from '@nimiq/hub-api'

export const one = 1
export const two = 2

export interface signChallengeOptions {
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

const defaultOptions: signChallengeOptions = {
  nimiqHubOptions: {
    endpoint: undefined,
    behavior: undefined,
  },
  appName: 'Login with Nimiq',
}

/**
 * Signs a challenge with the Hub API.
 * @param challenge The challenge string.
 * @param options The options for signing the challenge.
 * @returns {AsyncResult<SignedData>} The signed data or an error message.
 */
export async function signChallenge(challenge: string, options: signChallengeOptions = defaultOptions): AsyncResult<SignedData> {
  const {
    nimiqHubOptions: { endpoint = 'https://hub.nimiq.com', behavior },
    appName,
  } = options as Required<signChallengeOptions>

  const hubApi = new HubApi(endpoint, behavior)
  let maybeSignedMessage: SignedMessage | void
  try {
    maybeSignedMessage = await hubApi.signMessage({ appName, message: challenge })
  }
  catch (e: unknown) {
    return { success: false, error: `Failed to deserialize signed message: ${e?.toString() || 'invalid'}` }
  }

  if (!maybeSignedMessage)
    return { success: false, error: 'Failed to sign challenge' }

  const { signerPublicKey: publicKey, signature } = maybeSignedMessage
  return { success: true, data: { publicKey, signature } }
}
