import type { VerifyAuthOptions } from '@nimiq-auth/core/server'
import { env } from 'node:process'
import { clearUserSession, getUserSession, setUserSession } from '#imports'
import { verifyAuthResponse } from '@nimiq-auth/core/server'
import { createError, defineEventHandler, readBody } from 'h3'

export default defineEventHandler(async (event) => {
  const session = await getUserSession(event)
  if (!session.challenge)
    throw createError({ statusCode: 400, statusMessage: 'No challenge' })

  const secret = env.NUXT_SESSION_PASSWORD
  if (!secret)
    throw createError({ statusCode: 500, statusMessage: 'Server secret not configured' })

  const { jwt, signaturePayload } = await readBody<Pick<VerifyAuthOptions, 'jwt' | 'signaturePayload'>>(event)

  await clearUserSession(event)

  const { success: verifySuccess, data: user, error: verifyError } = verifyAuthResponse({ jwt, signaturePayload, secret })
  if (!verifySuccess)
    throw createError({ status: 400, statusMessage: verifyError })

  await setUserSession(event, { challenge: session.challenge, user })
  return user
})
