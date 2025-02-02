import type { NimiqAuthJwtPayload } from '@nimiq-auth/core/server'
import { env } from 'node:process'
import { replaceUserSession, useRuntimeConfig } from '#imports'
import { createJwt, decodeJwt } from '@nimiq-auth/core/server'
import { createError, defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const secret = env.NUXT_SESSION_PASSWORD
  if (!secret)
    throw createError({ statusCode: 500, statusMessage: 'Server secret not configured. Please add NUXT_SESSION_PASSWORD to your .env file with a secure password.' })

  const { appName } = useRuntimeConfig().public
  const duration = useRuntimeConfig().nimiqAuthJwtDuration
  const payloadOptions: NimiqAuthJwtPayload = { exp: Date.now() / 1000 + duration, iss: appName }
  const { data: jwt, success, error } = createJwt({ secret, payloadOptions })
  if (!success)
    throw createError({ status: 400, statusMessage: error })

  const { jti: challenge } = decodeJwt(jwt).data!.payload
  await replaceUserSession(event, { challenge })

  return jwt
})
