import type { VerifyChallengeRequest } from '@nimiq-auth/core/types'
import { clearUserSession, getUserSession, setUserSession } from '#imports'
import { verifyChallenge } from '@nimiq-auth/core/server'
import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.challenge)
    return createError({ statusCode: 400, statusMessage: 'No challenge' })

  await clearUserSession(event)

  const rawRequest = await readBody<{ challenge: string, signedData: { publicKey: number[], signature: number[] } }>(event)
  const request: VerifyChallengeRequest = {
    ...rawRequest,
    signedData: { publicKey: new Uint8Array(rawRequest.signedData.publicKey), signature: new Uint8Array(rawRequest.signedData.signature) },
  }
  const { success: verifySuccess, data: user, error: verifyError } = verifyChallenge(request)
  if (!verifySuccess)
    return createError({ status: 400, message: verifyError, statusMessage: 'Invalid challenge' })

  const address = user.address.toUserFriendlyAddress()
  const publicKey = user.publicKey.toHex()
  await setUserSession(event, { user: { address, publicKey } })

  return { success: true }
})
