import type { SignedMessage } from '@nimiq/hub-api'
import type { AsyncResult, SignedData } from './types'
import HubApi from '@nimiq/hub-api'

export const one = 1
export const two = 2

export interface SignLoginChallengeOptions {
  /**
   * The Hub API options
   */
  hubApiOptions?: {
    /**
     * The endpoint of the Hub API.
     * @default undefined - use the default endpoint from the Hub API
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
   * @default 'Nimiq Login'
   */
  appName?: string
}

const defaultOptions: SignLoginChallengeOptions = {
  hubApiOptions: {
    endpoint: undefined,
    behavior: undefined,
  },
  appName: 'Nimiq Login',
}

/**
 * Signs a challenge with the Hub API.
 * @param challange The challenge string.
 * @param options The options for signing the challenge.
 * @returns {AsyncResult<SignedData>} The signed data or an error message.
 */
export async function signLoginChallenge(challange: string, options: SignLoginChallengeOptions = defaultOptions): AsyncResult<SignedData> {
  const {
    hubApiOptions: { endpoint, behavior },
    appName,
  } = options as Required<SignLoginChallengeOptions>

  const hubApi = new HubApi(endpoint, behavior)
  let maybeSignedMessage: SignedMessage | void
  try {
    maybeSignedMessage = await hubApi.signMessage({ appName, message: challange })
  }
  catch (e: unknown) {
    return { success: false, error: `Failed to deserialize signed message: ${e?.toString() || 'invalid'}` }
  }

  if (!maybeSignedMessage)
    return { success: false, error: 'Failed to sign challenge' }

  const { signerPublicKey: publicKey, signature } = maybeSignedMessage
  return { success: true, data: { publicKey, signature } }
}
