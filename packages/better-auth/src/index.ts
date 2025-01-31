import type { GenerateChallengeResponse } from '@nimiq-auth/core/types'
import type { AuthPluginSchema, BetterAuthPlugin, InferOptionSchema, Session, User } from 'better-auth'
import { generateUuidChallenge, verifyChallenge } from '@nimiq-auth/core/server'
import { setSessionCookie } from 'better-auth'
import { createAuthEndpoint } from 'better-auth/api'
import { mergeSchema } from 'better-auth/db'
import z from 'zod'

export interface NimiqUser extends User {
  publicKey: string
  address: string
}

export interface NimiqAuthOptions extends User {
  /**
   * A useful hook to run after an anonymous user
   * is about to link their account.
   */
  onLinkAccount?: (
    data: { nimiqUser: { user: NimiqUser, session: Session }, newUser: { user: User, session: Session } }
  ) => Promise<void> | void
  /**
   * Custom schema for the admin plugin
   */
  schema?: InferOptionSchema<typeof schema>
}

const schema = {
  user: {
    fields: {
      address: {
        type: 'string',
        required: true,
      },
      publicKey: {
        type: 'string',
        required: true,
      },
    },
  },
} satisfies AuthPluginSchema

export function nimiqAuthPlugin(options?: NimiqAuthOptions): BetterAuthPlugin {
  return {
    id: 'nimiq-auth-plugin',
    schema: mergeSchema(schema, options?.schema),
    hooks: {

    },
    endpoints: {
      generateChallengeEndpoint: createAuthEndpoint('/_auth/nimiq/challenge', {
        method: 'GET',
      }, async (ctx) => {
        // We use the challenge as the user ID. We could also generate the an ID from the context and use that for the challenge.
        // Alternative: const id = ctx.context.generateId({ model: 'user' })
        const challenge = generateUuidChallenge()
        if (!challenge)
          return ctx.json(null, { status: 500, body: { message: 'Failed to generate challenge', status: 500 } })
        const newUser = await ctx.context.internalAdapter.createUser({
          id: challenge,
          email: '',
          emailVerified: false,
          publicKey: '',
          address: '',
          name: 'Nimiq User',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        if (!newUser)
          return ctx.json(null, { status: 500, body: { message: `Failed to create user`, status: 500 } })

        const session = await ctx.context.internalAdapter.createSession(newUser.id, ctx.request)
        if (!session)
          return ctx.json(null, { status: 500, body: { message: `Failed to create session for user`, status: 500 } })

        await setSessionCookie(ctx, { session, user: newUser })
        return ctx.json({ challenge } satisfies GenerateChallengeResponse)
      }),
      verifyChallengeEndpoint: createAuthEndpoint('/_auth/nimiq/challenge', {
        method: 'POST',
        body: z.object({
          challenge: z.string(),
          signedData: z.object({
            publicKey: z.string(),
            signature: z.string(),
          }),
        }),
        metadata: {
          openapi: {
            description: 'Verify a challenge',
            responses: {
              200: {
                description: 'Challenge verified',
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        user: {
                          $ref: '#/components/schemas/User',
                        },
                        session: {
                          $ref: '#/components/schemas/Session',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      }, async (ctx) => {
        const result = verifyChallenge(ctx.body)
        if (!result.success)
          return ctx.json(null, { status: 400, body: { message: result.error, status: 400 } })
        return ctx.json(result.data)
      }),
    },
  } satisfies BetterAuthPlugin
}
