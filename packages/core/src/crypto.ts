// This crypto.ts is to support cloudlfare workers, which doesn't have node:crypto atm
// see https://github.com/unjs/unenv/issues/419

import { createHash } from 'node:crypto'

class HmacSync {
  private innerPad: Uint8Array
  private outerPad: Uint8Array
  private data: Uint8Array

  constructor(algorithm: string, key: string | Uint8Array) {
    if (algorithm.toLowerCase() !== 'sha256') {
      throw new Error('Only SHA256 is supported')
    }

    // Convert key to Uint8Array if it's a string
    const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key

    // HMAC blocksize for SHA-256 is 64 bytes
    const BLOCK_SIZE = 64

    // Prepare the key
    let processedKey = keyBytes
    if (keyBytes.length > BLOCK_SIZE) {
      const hash = createHash('sha256')
      hash.update(keyBytes)
      processedKey = hash.digest()
    }
    if (processedKey.length < BLOCK_SIZE) {
      const paddedKey = new Uint8Array(BLOCK_SIZE)
      paddedKey.set(processedKey)
      processedKey = paddedKey
    }

    // Create inner and outer padding
    this.innerPad = new Uint8Array(BLOCK_SIZE)
    this.outerPad = new Uint8Array(BLOCK_SIZE)
    this.data = new Uint8Array(0)

    for (let i = 0; i < BLOCK_SIZE; i++) {
      this.innerPad[i] = processedKey[i] ^ 0x36
      this.outerPad[i] = processedKey[i] ^ 0x5C
    }
  }

  update(data: string | Uint8Array): this {
    const newData = typeof data === 'string' ? new TextEncoder().encode(data) : data
    const combined = new Uint8Array(this.data.length + newData.length)
    combined.set(this.data)
    combined.set(newData, this.data.length)
    this.data = combined
    return this
  }

  digest(): Uint8Array {
    // Inner hash
    const innerHash = createHash('sha256')
    innerHash.update(this.innerPad)
    innerHash.update(this.data)
    const innerResult = innerHash.digest()

    // Outer hash
    const outerHash = createHash('sha256')
    outerHash.update(this.outerPad)
    outerHash.update(innerResult)

    return outerHash.digest()
  }
}

export function createHmac(algorithm: string, key: string | Uint8Array): HmacSync {
  return new HmacSync(algorithm, key)
}
