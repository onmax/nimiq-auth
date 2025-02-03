import type { GenerateJwtParams } from '@nimiq-auth/core/jwt'
import { env } from 'node:process'
import { clearUserSession, replaceUserSession, useRuntimeConfig } from '#imports'
import { createJwt, getChallengeFromJwt } from '@nimiq-auth/core/jwt'
import { createError, defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const secret = env.NUXT_SESSION_PASSWORD
  if (!secret)
    throw createError({ statusCode: 500, statusMessage: 'Server secret not configured. Please add NUXT_SESSION_PASSWORD to your .env file with a secure password.' })

  await clearUserSession(event)

  const { appName } = useRuntimeConfig().public
  const nimiqAuthJwtDuration = useRuntimeConfig().nimiqAuthJwtDuration
  const jwtParams: GenerateJwtParams = { secret, nimiqAuthJwtDuration, appName }
  const { data: jwt, success, error } = createJwt(jwtParams)
  if (!success)
    throw createError({ status: 400, statusMessage: error })

  const challenge = getChallengeFromJwt(jwt)
  await replaceUserSession(event, { challenge })

  return jwt
})
