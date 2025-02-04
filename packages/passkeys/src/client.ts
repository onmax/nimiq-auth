import type { AsyncResult, Credential, LoginOptions, RegisterOptions, SignOptions } from './types'
import { bufferToHex, hexToBuffer } from './helpers'

// To abort conditional mediation in login.
let mediationAbortController: AbortController | undefined

/**
 * Registers a new passkey.
 *
 * This function creates a new credential using the WebAuthn API.
 * It then (optionally) sends the registration data to a server endpoint.
 *
 * @param options Registration options.
 * @returns A promise that resolves to a Credential object.
 */
export async function registerPasskey(options: RegisterOptions = {}): AsyncResult<Credential> {
  const {
    rpName = 'Nimiq Passkey',
    timeout = 60000,
    challenge,
  } = options

  // Use the provided challenge or generate a new one.
  const regChallenge = challenge || crypto.getRandomValues(new Uint8Array(32))

  const publicKey: PublicKeyCredentialCreationOptions = {
    rp: { name: rpName },
    user: {
      id: new Uint8Array(16), // You might want to use your own user ID here.
      name: 'Passkey User',
      displayName: 'Passkey User',
    },
    pubKeyCredParams: [
      { type: 'public-key', alg: -8 }, // EdDSA over Curve25519
      { type: 'public-key', alg: -7 }, // ECDSA over P-256
    ],
    authenticatorSelection: {
      userVerification: 'preferred',
      requireResidentKey: true,
    },
    timeout,
    challenge: regChallenge,
  }

  const cred = (await navigator.credentials.create({ publicKey })) as PublicKeyCredential | null
  if (!cred)
    return { success: false, error: 'No credential created' }

  // Get the SPKI public key (if available)
  // Note: The getPublicKey method is not standard in all browsers.
  const attestationResponse = cred.response as AuthenticatorAttestationResponse
  const spki = attestationResponse.getPublicKey?.() ?? null
  if (!spki)
    return { success: false, error: 'No public key received' }

  // The algorithm might be obtained from the response if needed.
  // Here we assume the method getPublicKeyAlgorithm is available.
  const algorithm = attestationResponse.getPublicKeyAlgorithm?.() ?? undefined

  // Here you may want to generate additional keys (for multisig, for example).
  // For now, we simply use the SPKI as the public key.
  const publicKeyHex = bufferToHex(spki)

  // If a server endpoint is provided, send registration data.
  if (options.serverRegisterUrl) {
    await fetch(options.serverRegisterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: bufferToHex(cred.rawId),
        spkiPublicKey: publicKeyHex,
        algorithm,
      }),
    }).then(async (response) => {
      const text = await response.text()
      if (text !== 'OK')
        return { success: false, error: `Server registration failed: ${text}` }
    })
  }

  return {
    data: {
      id: bufferToHex(cred.rawId),
      publicKey: publicKeyHex,
      publicKeyAlgorithm: algorithm,
      transports: (attestationResponse as any).getTransports?.() ?? undefined,
    },
    success: true,
  }
}

/**
 * Logs in with an existing passkey.
 *
 * This function uses the WebAuthn API to get an assertion and (optionally)
 * sends the data to a server endpoint for verification.
 *
 * @param options Login options.
 * @returns A promise that resolves to a Credential object.
 */
export async function loginPasskey(options: LoginOptions): AsyncResult<Credential> {
  const { challenge, conditionalMediation = false, timeout = 60000 } = options

  if (conditionalMediation) {
    mediationAbortController?.abort()
    mediationAbortController = new AbortController()
  }

  const publicKey: PublicKeyCredentialRequestOptions = {
    timeout,
    challenge,
    userVerification: 'preferred',
    allowCredentials: [],
  }

  // Add mediation option if requested.
  const requestOptions = conditionalMediation
    ? { publicKey, mediation: 'conditional' as CredentialMediationRequirement, signal: mediationAbortController!.signal }
    : { publicKey }

  const assertion = (await navigator.credentials.get(requestOptions)) as PublicKeyCredential | null
  if (!assertion)
    return { success: false, error: 'No assertion received' }

  const authResponse = assertion.response as AuthenticatorAssertionResponse
  const authenticatorData = new Uint8Array(authResponse.authenticatorData)
  const clientDataJSON = new Uint8Array(authResponse.clientDataJSON)
  const asn1Signature = new Uint8Array(authResponse.signature)

  // If a server endpoint is provided, send the login data.
  if (options.serverLoginUrl) {
    const serverResponse = await fetch(options.serverLoginUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        credentialId: assertion.id,
        authenticatorData: bufferToHex(authenticatorData.buffer),
        clientDataJSON: bufferToHex(clientDataJSON.buffer),
        asn1Signature: bufferToHex(asn1Signature.buffer),
      }),
    })
    if (!serverResponse.ok)
      return { success: false, error: await serverResponse.text() }

    // Assume the server returns JSON with additional public key data.
    const publicKeyData: { spkiPublicKey: string, algorithm?: number, multisigPubKey?: string } = await serverResponse.json()

    return {
      data: {
        id: bufferToHex(assertion.rawId),
        publicKey: publicKeyData.spkiPublicKey,
        publicKeyAlgorithm: publicKeyData.algorithm,
        multisigPubKey: publicKeyData.multisigPubKey,
      },
      success: true,
    }
  }

  // If no server call is made, return the data from the assertion.
  return {
    data: {
      id: bufferToHex(assertion.rawId),
      // In this case, we assume that the public key was obtained during registration.
      // You might store and reuse the public key.
      publicKey: '',
      publicKeyAlgorithm: undefined,
    },
    success: true,
  }
}

/**
 * Signs the given data using the provided credential.
 *
 * The data (for example, a hash) is used as a challenge in a new assertion.
 *
 * @param data Data to be signed.
 * @param credential The credential to use.
 * @param options Optional signing options.
 * @returns A promise that resolves to the signature as an ArrayBuffer.
 */
export async function signData(data: Uint8Array, credential: Credential, options: SignOptions = {}): AsyncResult<ArrayBuffer> {
  const { timeout = 60000, allowedTransports } = options

  const publicKey: PublicKeyCredentialRequestOptions = {
    timeout,
    challenge: data,
    userVerification: 'preferred',
    allowCredentials: [{
      id: hexToBuffer(credential.id),
      type: 'public-key',
      transports: allowedTransports || ['usb', 'nfc', 'ble', 'internal', 'hybrid'],
    }],
  }

  const assertion = (await navigator.credentials.get({ publicKey })) as PublicKeyCredential | null
  if (!assertion)
    return { success: false, error: 'No assertion received for signing' }

  const authResponse = assertion.response as AuthenticatorAssertionResponse
  const signature = new Uint8Array(authResponse.signature)
  return { data: signature.buffer, success: true }
}
