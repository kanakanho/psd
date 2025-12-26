/**
 * Utility functions for reading binary data
 * Ported from Go implementation
 */

/**
 * Read a 16-bit unsigned integer (big-endian)
 */
export function readUint16(b: Uint8Array, offset: number): number {
  return (b[offset] << 8) | b[offset + 1]
}

/**
 * Write a 16-bit unsigned integer (big-endian)
 */
export function writeUint16(b: Uint8Array, v: number, offset: number): void {
  b[offset] = (v >> 8) & 0xFF
  b[offset + 1] = v & 0xFF
}

/**
 * Read a 32-bit unsigned integer (big-endian)
 */
export function readUint32(b: Uint8Array, offset: number): number {
  return (
    (b[offset] << 24)
    | (b[offset + 1] << 16)
    | (b[offset + 2] << 8)
    | b[offset + 3]
  ) >>> 0 // Ensure unsigned
}

/**
 * Write a 32-bit unsigned integer (big-endian)
 */
export function writeUint32(b: Uint8Array, v: number, offset: number): void {
  b[offset] = (v >> 24) & 0xFF
  b[offset + 1] = (v >> 16) & 0xFF
  b[offset + 2] = (v >> 8) & 0xFF
  b[offset + 3] = v & 0xFF
}

/**
 * Read a 64-bit unsigned integer (big-endian)
 * JavaScript cannot accurately represent 64-bit integers, so we use BigInt
 */
export function readUint64(b: Uint8Array, offset: number): bigint {
  const high = BigInt(readUint32(b, offset))
  const low = BigInt(readUint32(b, offset + 4))
  return (high << 32n) | low
}

/**
 * Read a 32-bit float (big-endian)
 */
export function readFloat32(b: Uint8Array, offset: number): number {
  const view = new DataView(b.buffer, b.byteOffset + offset, 4)
  return view.getFloat32(0, false) // false = big-endian
}

/**
 * Read a 64-bit float (big-endian)
 */
export function readFloat64(b: Uint8Array, offset: number): number {
  const view = new DataView(b.buffer, b.byteOffset + offset, 8)
  return view.getFloat64(0, false) // false = big-endian
}

/**
 * Read a variable-size unsigned integer
 */
export function readUint(b: Uint8Array, offset: number, size: number): number | bigint {
  if (size === 8) {
    return readUint64(b, offset)
  }
  else if (size === 4) {
    return readUint32(b, offset)
  }
  else if (size === 2) {
    return readUint16(b, offset)
  }
  else if (size === 1) {
    return b[offset]
  }
  throw new Error(`psd: unexpected size ${size}`)
}

/**
 * Get 4 or 8 based on whether it's a large document (PSB)
 */
export function get4or8(is64: boolean): number {
  return is64 ? 8 : 4
}

/**
 * Read a Unicode string from buffer
 * First 4 bytes contain the length (number of UTF-16 code units)
 */
export function readUnicodeString(b: Uint8Array): string {
  const ln = readUint32(b, 0)
  if (ln === 0) {
    return ''
  }

  const codeUnits: number[] = []
  for (let i = 0; i < ln; i++) {
    codeUnits.push(readUint16(b, 4 + i * 2))
  }

  return String.fromCharCode(...codeUnits)
}

/**
 * Read a Pascal string (length-prefixed string)
 * First byte contains the length
 */
export function readPascalString(data: Uint8Array, offset: number): { str: string, length: number } {
  const length = data[offset]
  if (length === 0) {
    return { str: '', length: 1 }
  }

  const str = new TextDecoder('latin1').decode(data.slice(offset + 1, offset + 1 + length))
  return { str, length: length + 1 }
}

/**
 * Convert integer to string
 */
export function itoa(x: number): string {
  return x.toString()
}

/**
 * Calculate alignment padding for 2-byte boundary
 */
export function adjustAlign2(currentLength: number): number {
  return (currentLength & 1) !== 0 ? 1 : 0
}

/**
 * Calculate alignment padding for 4-byte boundary
 */
export function adjustAlign4(currentLength: number): number {
  const gap = currentLength & 3
  return gap > 0 ? 4 - gap : 0
}

/**
 * Get string from Uint8Array
 */
export function getString(b: Uint8Array, offset: number, length: number): string {
  return new TextDecoder('latin1').decode(b.slice(offset, offset + length))
}

/**
 * Check if arrays are equal
 */
export function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  return a.length === b.length && a.every((val, i) => val === b[i])
}
