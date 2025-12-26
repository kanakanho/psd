/**
 * Unit tests for compression functions
 */

import { describe, expect, it } from 'vitest'
import {
  decodeCompressed,
  decodeDelta,
  decodePackBits,
  decodeZLIB,
} from '../compress'
import {
  CompressionMethodRaw,
} from '../constants'
import { readUint16, readUint32, writeUint16, writeUint32 } from '../util'

describe('compress - decodeCompressed with Raw method', () => {
  it('should copy raw data', () => {
    const src = new Uint8Array([1, 2, 3, 4, 5])
    const dest = new Uint8Array(5)
    const rect = { x: 0, y: 0, width: 5, height: 1 }

    const bytesRead = decodeCompressed(
      CompressionMethodRaw,
      dest,
      src,
      rect,
      8,
      1,
      false,
    )

    expect(bytesRead).toBe(5)
    expect(dest).toEqual(src)
  })
})

describe('compress - decodePackBits', () => {
  it('should decode literal bytes', () => {
    // 0x01 = copy next 2 bytes literally
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x03, // line length = 3
      0x01,
      0xAA,
      0xBB, // copy 2 bytes
    ])
    const dest = new Uint8Array(4)

    decodePackBits(dest, src, 2, 1, false)
    expect(dest[0]).toBe(0xAA)
    expect(dest[1]).toBe(0xBB)
  })

  it('should decode repeated bytes', () => {
    // 0xFF = repeat next byte 2 times (257 - 255 = 2)
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x02, // line length = 2
      0xFF,
      0xAA, // repeat 0xAA twice
    ])
    const dest = new Uint8Array(4)

    decodePackBits(dest, src, 2, 1, false)
    expect(dest[0]).toBe(0xAA)
    expect(dest[1]).toBe(0xAA)
  })

  it('should skip no-op (128)', () => {
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x03, // line length = 3
      0x80, // no-op
      0x00,
      0xAA, // copy 1 byte
    ])
    const dest = new Uint8Array(4)

    decodePackBits(dest, src, 1, 1, false)
    expect(dest[0]).toBe(0xAA)
  })

  it('should handle PSB format with 8-byte line lengths', () => {
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x02, // line length = 2
      0xFF,
      0xBB, // repeat 0xBB twice
    ])
    const dest = new Uint8Array(4)

    decodePackBits(dest, src, 2, 1, true) // PSB = true
    expect(dest[0]).toBe(0xBB)
    expect(dest[1]).toBe(0xBB)
  })
})

describe('compress - decodeDelta', () => {
  it('should decode 16-bit delta prediction', () => {
    const buffer = new Uint8Array(8)
    // Encoded deltas: 1, 2, 3, 4
    writeUint16(buffer, 1, 0)
    writeUint16(buffer, 2, 2)
    writeUint16(buffer, 3, 4)
    writeUint16(buffer, 4, 6)

    decodeDelta(buffer, 4, 16) // 4 values, 16-bit depth

    // Decoded should be: 1, 3, 6, 10 (cumulative sum)
    expect(readUint16(buffer, 0)).toBe(1)
    expect(readUint16(buffer, 2)).toBe(3)
    expect(readUint16(buffer, 4)).toBe(6)
    expect(readUint16(buffer, 6)).toBe(10)
  })

  it('should decode 32-bit delta prediction', () => {
    const buffer = new Uint8Array(16)
    // Encoded deltas: 1, 2, 3, 4
    writeUint32(buffer, 1, 0)
    writeUint32(buffer, 2, 4)
    writeUint32(buffer, 3, 8)
    writeUint32(buffer, 4, 12)

    decodeDelta(buffer, 4, 32) // 4 values, 32-bit depth

    // Decoded should be: 1, 3, 6, 10 (cumulative sum)
    expect(readUint32(buffer, 0)).toBe(1)
    expect(readUint32(buffer, 4)).toBe(3)
    expect(readUint32(buffer, 8)).toBe(6)
    expect(readUint32(buffer, 12)).toBe(10)
  })
})

describe('compress - decodeZLIB', () => {
  it('should decompress zlib data', async () => {
    // Create a simple test by compressing "Hello" ourselves
    const pako = await import('pako')
    const original = new Uint8Array([
      72,
      101,
      108,
      108,
      111,
    ]) // "Hello"
    const compressed = pako.deflate(original)

    const dest = new Uint8Array(5)
    const bytesRead = decodeZLIB(dest, compressed)

    expect(bytesRead).toBe(compressed.length)
    expect(String.fromCharCode(...dest)).toBe('Hello')
  })
})
