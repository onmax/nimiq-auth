# nimiq-auth

[![npm version][npm-version-src]][npm-version-href]

Add Login with Nimiq to your apps

[npm-version-src]: https://img.shields.io/npm/v/@nimiq-auth/core?style=flat&colorA=080f12&colorB=1fa669
[npm-version-href]: https://npmjs.com/package/@nimiq-auth/core

## Credits

This project is inspired by [Nimiq Nuxt Login](https://github.com/blouflashdb/Nuxt-Nimiq-Login) by [blouflashdb](https://github.com/blouflashdb).

### TODOs

- Implement rate limiting on auth endpoints
- Add HMAC validation for challenge storage
- Use secure comparison for signature validation
- Include nonce in challenge payload
- client should sign { "challenge": "uuid-1234...", "ttl": 300, "issuedAt": 1678901234 }
- Make sure we don't use node's Buffer

- Implement CSRF protection
- Add rate limiting for JWT generation
