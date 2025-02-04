// Helper functions for converting buffers

/**
 * Convert an ArrayBuffer to a hex string.
 */
export function bufferToHex(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let hex = ''
  for (let i = 0; i < bytes.length; i++) {
    const current = bytes[i].toString(16)
    hex += current.length === 1 ? `0${current}` : current
  }
  return hex
}

/**
 * Convert a hex string to an ArrayBuffer.
 */
export function hexToBuffer(hex: string): ArrayBuffer {
  const byteLength = hex.length / 2
  const buffer = new Uint8Array(byteLength)
  for (let i = 0; i < byteLength; i++) {
    buffer[i] = Number.parseInt(hex.substr(i * 2, 2), 16)
  }
  return buffer.buffer
}

/**
 * Convert a hex string to a Uint8Array.
 * @param hex The hex string to parse (no 0x prefix).
 * @returns A Uint8Array representing the bytes.
 */
export function fromHex(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(b => Number.parseInt(b, 16)))
}

/**
 * Convert an ASN.1 ECDSA signature to raw (R+S concatenation).
 * @param asn1 A DER-encoded ECDSA signature.
 * @returns A 64-byte raw signature (32-byte R, 32-byte S).
 */
export function asn1ToRaw(asn1: Uint8Array): Uint8Array {
  const rStart = asn1[4] === 0 ? 5 : 4
  const rEnd = rStart + 32
  const sStart = asn1[rEnd + 2] === 0 ? rEnd + 3 : rEnd + 2
  const r = asn1.slice(rStart, rEnd)
  const s = asn1.slice(sStart)
  return new Uint8Array([...r, ...s])
}
