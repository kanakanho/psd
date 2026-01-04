/**
 * Unit tests for compression functions
 */

import type { Rectangle } from '../types'
import { describe, expect, it } from 'vitest'
import {
  decodeCompressed,
  decodeDelta,
  decodePackBits,
  decodeZLIB,
} from '../compress'
import {
  CompressionMethodRaw,
  CompressionMethodRLE,
  CompressionMethodZIPWithoutPrediction,
  CompressionMethodZIPWithPrediction,
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

  it('should decode multiple lines', () => {
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x02, // line 1 length = 2
      0x00,
      0x00,
      0x00,
      0x02, // line 2 length = 2
      0xFF,
      0xAA, // line 1: repeat 0xAA twice
      0xFF,
      0xBB, // line 2: repeat 0xBB twice
    ])
    const dest = new Uint8Array(4)

    decodePackBits(dest, src, 2, 2, false)
    expect(dest[0]).toBe(0xAA)
    expect(dest[1]).toBe(0xAA)
    expect(dest[2]).toBe(0xBB)
    expect(dest[3]).toBe(0xBB)
  })

  it('should throw error for broken data', () => {
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x02,
      0xFE, // Needs byte to repeat but none available
    ])
    const dest = new Uint8Array(4)

    expect(() => decodePackBits(dest, src, 2, 1, false)).toThrow('psd: compressed image data seems broken')
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

  it('should throw error for invalid zlib data', () => {
    const invalid = new Uint8Array([
      0xFF,
      0xFF,
      0xFF,
      0xFF,
    ])
    const dest = new Uint8Array(10)

    expect(() => decodeZLIB(dest, invalid)).toThrow('psd: zlib decompression failed')
  })
})

describe('compress - decodeCompressed with RLE', () => {
  it('should decode RLE compressed data', () => {
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x02, // line length
      0xFF,
      0xAA, // repeat 0xAA twice
    ])
    const dest = new Uint8Array(2)
    const rect: Rectangle = { x: 0, y: 0, width: 2, height: 1 }

    const bytesRead = decodeCompressed(
      CompressionMethodRLE,
      dest,
      src,
      rect,
      8,
      1,
      false,
    )

    expect(bytesRead).toBeGreaterThan(0)
    expect(dest[0]).toBe(0xAA)
    expect(dest[1]).toBe(0xAA)
  })

  it('should decode RLE with 1-bit depth', () => {
    const src = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x02, // line length
      0xFF,
      0xFF, // repeat 0xFF twice
    ])
    const dest = new Uint8Array(2)
    const rect: Rectangle = { x: 0, y: 0, width: 8, height: 1 }

    const bytesRead = decodeCompressed(
      CompressionMethodRLE,
      dest,
      src,
      rect,
      1, // 1-bit depth
      1,
      false,
    )

    expect(bytesRead).toBeGreaterThan(0)
  })
})

describe('compress - decodeCompressed with ZIP', () => {
  it('should decode ZIP without prediction', async () => {
    const pako = await import('pako')
    const original = new Uint8Array([
      1,
      2,
      3,
      4,
    ])
    const compressed = pako.deflate(original)
    const dest = new Uint8Array(4)
    const rect: Rectangle = { x: 0, y: 0, width: 4, height: 1 }

    const bytesRead = decodeCompressed(
      CompressionMethodZIPWithoutPrediction,
      dest,
      compressed,
      rect,
      8,
      1,
      false,
    )

    expect(bytesRead).toBeGreaterThan(0)
    expect(dest).toEqual(original)
  })

  it('should decode ZIP with prediction', async () => {
    const pako = await import('pako')
    // Create delta-encoded data: 1, 1, 1 (which decodes to 1, 2, 3)
    const deltaEncoded = new Uint8Array(6)
    writeUint16(deltaEncoded, 1, 0)
    writeUint16(deltaEncoded, 1, 2)
    writeUint16(deltaEncoded, 1, 4)

    const compressed = pako.deflate(deltaEncoded)
    const dest = new Uint8Array(6)
    const rect: Rectangle = { x: 0, y: 0, width: 3, height: 1 }

    const bytesRead = decodeCompressed(
      CompressionMethodZIPWithPrediction,
      dest,
      compressed,
      rect,
      16, // 16-bit depth for delta
      1,
      false,
    )

    expect(bytesRead).toBeGreaterThan(0)
    // After delta decoding: 1, 2, 3
    expect(readUint16(dest, 0)).toBe(1)
    expect(readUint16(dest, 2)).toBe(2)
    expect(readUint16(dest, 4)).toBe(3)
  })
})
