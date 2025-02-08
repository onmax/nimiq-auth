import { createHmac as createHmacNode } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { createHmac as createHmacTest } from '../src/crypto'

describe('createHmac', () => {
  it('should match node crypto hmac implementation', () => {
    const key = 'test-key'
    const data = 'test-data'

    // Our implementation
    const hmacTest = createHmacTest('sha256', key)
    const resultTest = hmacTest.update(data).digest()

    // Node's implementation
    const hmacNode = createHmacNode('sha256', key)
    const resultNode = hmacNode.update(data).digest()

    // Compare results
    expect(resultTest).toEqual(resultNode)
  })

  it('should handle Uint8Array inputs', () => {
    const key = new TextEncoder().encode('test-key')
    const data = new TextEncoder().encode('test-data')

    // Our implementation
    const hmacTest = createHmacTest('sha256', key)
    const resultTest = hmacTest.update(data).digest()

    // Node's implementation
    const hmacNode = createHmacNode('sha256', key)
    const resultNode = hmacNode.update(data).digest()

    // Compare results
    expect(resultTest).toEqual(resultNode)
  })

  it('should throw error for unsupported algorithms', () => {
    expect(() => createHmacTest('md5', 'test-key')).toThrow('Only SHA256 is supported')
  })
})
