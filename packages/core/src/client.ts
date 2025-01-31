import type { SignedMessage } from '@nimiq/hub-api'
import type { AsyncResult, SignChallengeOptions, SignedData } from './types'
import { PublicKey, Signature } from '@nimiq/core'
import HubApi from '@nimiq/hub-api'

const defaultOptions: SignChallengeOptions = {
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
export async function signChallenge(challenge: string, options: SignChallengeOptions = defaultOptions): AsyncResult<SignedData> {
  const {
    nimiqHubOptions: { endpoint = 'https://hub.nimiq.com', behavior },
    appName,
  } = options as Required<SignChallengeOptions>

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

  const publicKey = PublicKey.deserialize(maybeSignedMessage.signerPublicKey).toHex()
  const signature = Signature.deserialize(maybeSignedMessage.signature).toHex()
  return { success: true, data: { publicKey, signature } }
}
