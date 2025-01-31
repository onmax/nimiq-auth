import type { GenerateChallengeResponse } from '@nimiq-auth/core/types'
import { replaceUserSession } from '#imports'
import { generateUuidChallenge } from '@nimiq-auth/core/server'
import { defineEventHandler } from 'h3'

export default defineEventHandler(async (event) => {
  const challenge = generateUuidChallenge()
  await replaceUserSession(event, { challenge })
  return { challenge } satisfies GenerateChallengeResponse
})
