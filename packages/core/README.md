# @nimiq-auth/core

[![npm version][npm-version-src]][npm-version-href]

Add Nimiq Login to your apps.

## Installation

```bash
npm install @nimiq-auth/core
```

## Usage

### Generating a `challenge`

You should generate a `challenge` for each user in the server side. The challenge is a random string that is unique for each user. You might want to use the default `generateUuidLoginChallenge` function from `@nimiq-auth/core` to generate a challenge.

```ts
import { generateUuidLoginChallenge } from '@nimiq-auth/core/server'

const challenge = generateUuidLoginChallenge()
```

### Signing the challenge

Then, the client/user should be able to request that challenge from the server and sign it with their private key using the Nimiq Hub API.

```ts
import { signLoginChallenge } from '@nimiq-auth/core/client'

const signedChallenge = await signLoginChallenge(challenge) // Opens the Nimiq Hub
```

### Verifying the challenge

Finally, the server should verify the challenge and return the user's public key.

```ts
import { verifyLoginChallenge } from '@nimiq-auth/core/server'

const { success, data } = verifyLoginChallenge(challenge, signedChallenge)

if (!success)
  throw new Error('Invalid challenge')

const { address, publicKey } = data
```

Now you can ensure that the user is authenticated and has access to your app, you can use the `address` and `publicKey` to identify the user and create a session for them.

This is just the core package, you can find abstractions in the [`packages`](../packages) directory.

## Utils

The core package also contains some utils that you might find useful. You can find them in [`utils.ts`](./src/utils.ts) directory and can be imported from `@nimiq-auth/core/utils`.

## Credits

This project is inspired by [Nimiq Nuxt Login](https://github.com/blouflashdb/Nuxt-Nimiq-Login) by [blouflashdb](https://github.com/blouflashdb).

<!-- Badges -->
[npm-version-src]: https://npmjs.com/package/@nimiq-auth/core/latest.svg?style=flat&colorA=020420&colorB=00DC82
[npm-version-href]: https://npmjs.com/package/@nimiq-auth/core
