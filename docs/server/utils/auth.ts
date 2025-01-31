import { D1Dialect } from '@atinux/kysely-d1'
import { nimiqAuthPlugin } from '@nimiq-auth/better-auth'
import { betterAuth } from 'better-auth'

let _auth: ReturnType<typeof betterAuth>
export function serverAuth(): typeof _auth {
  let baseURL = ''
  try {
    baseURL = getRequestURL(useEvent()).origin
  }
  catch {}
  if (_auth)
    return _auth
  _auth = betterAuth({
    database: {
      dialect: new D1Dialect({ database: hubDatabase() }),
      type: 'sqlite',
    },
    secondaryStorage: {
      get: key => hubKV().getItemRaw(`_auth:${key}`),
      set: (key, value, ttl) => hubKV().set(`_auth:${key}`, value, { ttl }),
      delete: key => hubKV().del(`_auth:${key}`),
    },
    baseURL,
    plugins: [nimiqAuthPlugin()],
  })
  return _auth
}
