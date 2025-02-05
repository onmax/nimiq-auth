import type { NimiqAuthOptions } from '@nimiq-auth/core/types'
import type { AuthPluginSchema, BetterAuthPlugin } from 'better-auth'
import { env } from 'node:process'
import { mergeSchema } from 'better-auth/db'

const nimiqSchema = {
  nimiq: {
    fields: {
      publicKey: { type: 'string', required: true, unique: true },
      address: { type: 'string', required: true, unique: true },
      userId: { type: 'string', required: false, references: { model: 'user', field: 'id' } },
      createdAt: { type: 'date', required: true },
    },
  },
} satisfies AuthPluginSchema

export interface NimiqUser {
  id: string
  userId: string
  publicKey: string
  address: string
}

export type NimiqAuthPluginOptions = Pick<NimiqAuthOptions, 'nimiqAuthJwtDuration' | 'appName'>

export function nimiq(): BetterAuthPlugin {
  // Use the secret from the environment.
  const secret = env.BETTER_AUTH_SECRET
  if (!secret) {
    throw new Error(
      'Server secret not configured. Please add BETTER_AUTH_SECRET to your .env file with a secure password.',
    )
  }

  // Use distinct cookie names for the challenge, CSRF token and session.
  // const challengeCookieName = `better-auth:nimiq-challenge:${appName}`
  // const csrfCookieName = `better-auth:nimiq-csrf:${appName}`

  return {
    id: 'nimiq',
    endpoints: {
      // GET endpoint: generate the JWT challenge and a CSRF token.
      // getJwt: createAuthEndpoint(
      //   '/nimiq/generate-jwt',
      //   {
      //     method: 'GET',
      //     use: [freshSessionMiddleware], // TODO Should we use this?
      //     metadata: {
      //       openapi: {
      //         description: 'Generate a JWT and CSRF token',
      //         responses: {
      //           200: {
      //             description: 'JWT and CSRF token generated',
      //             content: {
      //               'application/json': {
      //                 schema: {
      //                   type: 'object',
      //                   properties: {
      //                     jwt: { type: 'string' },
      //                     csrfToken: { type: 'string' },
      //                   },
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      //   async (ctx) => {
      //     // Clear any previous challenge and CSRF cookies.
      //     await ctx.setSignedCookie(challengeCookieName, '', secret, { ...ctx.context.authCookies.sessionToken.options, maxAge: 0 })
      //     ctx.setCookie(csrfCookieName, '', { ...ctx.context.authCookies.sessionToken.options, maxAge: 0 })

      //     const jwtParams: GenerateJwtParams = { secret, appName, nimiqAuthJwtDuration }
      //     const { data: jwt, success, error } = createJwt(jwtParams)
      //     if (!success)
      //       return { data: null, error: { message: error, status: 400 } }

      //     // Extract the challenge (jti) from the JWT.
      //     const { data: challenge, success: challengeSuccess, error: challengeError } = getChallengeFromJwt(jwt)
      //     if (!challengeSuccess)
      //       return { data: null, error: { message: challengeError, status: 400 } }

      //     // Set the challenge in an HttpOnly signed cookie.
      //     await ctx.setSignedCookie(challengeCookieName, challenge, secret, { sameSite: 'Strict', secure: true, httpOnly: true })

      //     // Generate a CSRF token (non‑HttpOnly so that client‑side code can read it).
      //     // const csrfToken = crypto.randomBytes(16).toString('hex')
      //     // ctx.setCookie(csrfCookieName, csrfToken, {
      //     //   ...ctx.context.authCookies.sessionToken.options,
      //     //   httpOnly: false,
      //     // })
      //     const csrfToken = '' // TODO

      //     return ctx.json({ jwt, csrfToken }, { status: 200 })
      //   },
      // ),

      // // POST endpoint: verify the signed jwt.
      // verifyJwt: createAuthEndpoint(
      //   '/nimiq/verify-jwt',
      //   {
      //     method: 'POST',
      //     body: z.object({
      //       jwt: z.string(),
      //       signaturePayload: z.object({
      //         publicKey: z.string(),
      //         signature: z.string(),
      //       }),
      //     }),
      //     metadata: {
      //       openapi: {
      //         description: 'Verify the signed JWT and create a session',
      //         responses: {
      //           200: {
      //             description: 'The JWT is verified and a session is created',
      //             content: {
      //               'application/json': {
      //                 schema: {
      //                   type: 'object',
      //                   properties: {
      //                     session: { $ref: '#/components/schemas/Session' },
      //                     user: { $ref: '#/components/schemas/User' },
      //                   },
      //                 },
      //               },
      //             },
      //           },
      //           400: { description: 'Verification failed or CSRF token missing/invalid' },
      //         },
      //       },
      //     },
      //   },
      //   async (ctx) => {
      //     // Get the challenge from the signed cookie.
      //     const storedChallenge = ctx.getSignedCookie(challengeCookieName, secret)
      //     if (!storedChallenge) {
      //       throw new APIError('BAD_REQUEST', { message: 'No challenge cookie found' })
      //     }

      //     // Clear the temporary challenge and CSRF cookies.
      //     await ctx.setSignedCookie(
      //       challengeCookieName,
      //       '',
      //       secret,
      //       { ...ctx.context.authCookies.sessionToken.options, maxAge: 0 },
      //     )
      //     ctx.setCookie(
      //       csrfCookieName,
      //       '',
      //       { ...ctx.context.authCookies.sessionToken.options, maxAge: 0 },
      //     )

      //     const { jwt, signaturePayload } = ctx.body

      //     // Verify the signed JWT.
      //     const { success: verifySuccess, data: user, error: verifyError } = verifyAuthResponse({
      //       jwt,
      //       signaturePayload,
      //       secret,
      //     })

      //     if (!verifySuccess) {
      //       throw new APIError('BAD_REQUEST', { message: verifyError })
      //     }

      //     // Ensure a user exists in the database before linking the Nimiq record.
      //     let storedUser = await ctx.context.internalAdapter.findUserById(user.address)

      //     if (!storedUser) {
      //       // Create a new user record if it doesn't exist.
      //       storedUser = await ctx.context.internalAdapter.createUser({
      //         id: user.address, // Ensure the user ID format matches your existing schema.
      //         email: '', // Set empty/default values where necessary.
      //         name: '',
      //       })
      //     }

      //     // Ensure the `nimiq` record exists and is linked to the user.
      //     let existingRecord = await ctx.context.adapter.findOne<{ id: string, publicKey: string, address: string }>({
      //       model: 'nimiq',
      //       where: [{ field: 'address', value: user.address }],
      //     })

      //     if (!existingRecord) {
      //       existingRecord = await ctx.context.adapter.create({
      //         model: 'nimiq',
      //         data: {
      //           publicKey: user.publicKey,
      //           address: user.address,
      //           userId: storedUser.id,
      //           createdAt: new Date(),
      //         },
      //       })
      //     }

      //     // Create a session for the user.
      //     const s = await ctx.context.internalAdapter.createSession(storedUser.id, ctx.request)
      //     if (!s) {
      //       throw new APIError('INTERNAL_SERVER_ERROR', { message: 'Unable to create session' })
      //     }

      //     // Set the session cookie using a helper.
      //     await setSessionCookie(ctx, { session: s, user: storedUser })

      //     return ctx.json({ session: s, user: storedUser }, { status: 200 })
      //   },
      // ),
    },
    // Merge in our new schema for the nimiq model.
    schema: mergeSchema(nimiqSchema),
  } satisfies BetterAuthPlugin
}
