import type { SignedMessage } from '@nimiq/hub-api'
import type { AsyncResult, SignaturePayload } from './types'
import HubApi from '@nimiq/hub-api'
import { decodeJwt } from './jwt'

export interface SignAuthOptions {
  /**
   * Options for the Hub API.
   */
  nimiqHubOptions?: {
    /**
     * The endpoint for the Hub API.
     * @default https://hub.nimiq.com
     */
    endpoint?: ConstructorParameters<typeof HubApi>[0]

    /**
     * Behavior settings for the Hub API.
     * @default undefined - use the default behavior from Hub API.
     */
    behavior?: ConstructorParameters<typeof HubApi>[1]
  }
}

/**
 * Signs the JWT using the Hub API.
 *
 * @param jwt - The JWT from the server containing the challenge.
 * @param options - Options for the Hub API.
 * @returns An object with the original JWT and the signed data.
 */
export async function signJwt(jwt: string, options: SignAuthOptions = {}): AsyncResult<SignaturePayload> {
  if (!jwt || typeof jwt !== 'string')
    return { success: false, error: `Invalid JWT: ${jwt || 'undefined'}` }

  const { data, success, error } = decodeJwt(jwt)
  if (!success)
    return { success: false, error }
  const { iss: appName } = data.payload

  const { nimiqHubOptions } = options as Required<SignAuthOptions>
  const hubEndpoint = nimiqHubOptions?.endpoint ?? 'https://hub.nimiq.com'
  const hubBehavior = nimiqHubOptions?.behavior
  const hubApi = new HubApi(hubEndpoint, hubBehavior)

  let signedMsg: SignedMessage | void
  try {
    signedMsg = await hubApi.signMessage({ appName, message: jwt })
  }
  catch (e: unknown) {
    return {
      success: false,
      error: `Failed to sign JWT ${e?.toString() || 'unknown error'}`,
    }
  }

  if (!signedMsg)
    return { success: false, error: 'Failed to sign JWT' }

  const { PublicKey, Signature } = await import('@nimiq/core')
  const publicKeyObj = PublicKey.deserialize(signedMsg.signerPublicKey)
  const publicKey = publicKeyObj.toHex()
  const signature = Signature.deserialize(signedMsg.signature).toHex()
  return { success: true, data: { publicKey, signature } }
}
