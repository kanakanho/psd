/**
 * Compression/decompression functions
 * Ported from Go implementation
 */

import type { CompressionMethod, Rectangle } from './types'
import pako from 'pako'
import {
  CompressionMethodRaw,
  CompressionMethodRLE,
  CompressionMethodZIPWithoutPrediction,
  CompressionMethodZIPWithPrediction,
} from './constants'
import { get4or8, readUint, readUint16, readUint32, writeUint16, writeUint32 } from './util'

/**
 * Decode compressed image data
 */
export function decodeCompressed(
  method: CompressionMethod,
  dest: Uint8Array,
  src: Uint8Array,
  rect: Rectangle,
  depth: number,
  channels: number,
  large: boolean,
): number {
  let offset = 0

  switch (method) {
    case CompressionMethodRaw:
      // Raw data - just copy
      dest.set(src.slice(0, dest.length))
      return dest.length

    case CompressionMethodRLE: {
      // PackBits RLE compression
      const width = depth === 1 ? ((rect.width + 7) >> 3) : rect.width
      offset = decodePackBits(dest, src, width, rect.height * channels, large)
      return offset
    }

    case CompressionMethodZIPWithoutPrediction: {
      // ZLIB without prediction
      offset = decodeZLIB(dest, src)
      return offset
    }

    case CompressionMethodZIPWithPrediction: {
      // ZLIB with prediction
      offset = decodeZLIB(dest, src)
      decodeDelta(dest, rect.width, depth)
      return offset
    }

    default:
      throw new Error(`psd: compression method ${method} is not implemented`)
  }
}

/**
 * Decode ZLIB compressed data
 */
export function decodeZLIB(dest: Uint8Array, src: Uint8Array): number {
  try {
    const inflated = pako.inflate(src)
    dest.set(inflated.slice(0, dest.length))
    return src.length
  }
  catch (error) {
    throw new Error(`psd: zlib decompression failed: ${error}`)
  }
}

/**
 * Decode PackBits RLE compressed data
 */
export function decodePackBits(
  dest: Uint8Array,
  src: Uint8Array,
  width: number,
  lines: number,
  large: boolean,
): number {
  const intSize = get4or8(large)
  let srcOffset = 0

  // Read line lengths
  const lineLengths: number[] = []
  for (let i = 0; i < lines; i++) {
    const len = Number(readUint(src, srcOffset, intSize))
    lineLengths.push(len)
    srcOffset += intSize
  }

  // Decode each line
  let destOffset = 0
  for (let i = 0; i < lines; i++) {
    const lineLength = lineLengths[i]
    const lineEnd = srcOffset + lineLength

    while (srcOffset < lineEnd && destOffset < dest.length) {
      const n = src[srcOffset++]

      if (n === 128) {
        // No-op
        continue
      }
      else if (n > 128) {
        // Run of repeated bytes
        const count = 257 - n
        if (srcOffset >= src.length) {
          throw new Error('psd: compressed image data seems broken')
        }
        const value = src[srcOffset++]
        for (let j = 0; j < count && destOffset < dest.length; j++) {
          dest[destOffset++] = value
        }
      }
      else {
        // Run of literal bytes
        const count = n + 1
        for (let j = 0; j < count && destOffset < dest.length && srcOffset < src.length; j++) {
          dest[destOffset++] = src[srcOffset++]
        }
      }
    }
  }

  return srcOffset
}

/**
 * Decode delta-encoded data (prediction)
 */
export function decodeDelta(buf: Uint8Array, width: number, depth: number): void {
  if (depth === 16) {
    let d = 0
    for (let i = 0; i < buf.length;) {
      d = 0
      for (let j = 0; j < width; j++) {
        d += readUint16(buf, i)
        d &= 0xFFFF // Keep it as 16-bit
        writeUint16(buf, d, i)
        i += 2
      }
    }
  }
  else if (depth === 32) {
    let d = 0
    for (let i = 0; i < buf.length;) {
      d = 0
      for (let j = 0; j < width; j++) {
        d = (d + readUint32(buf, i)) >>> 0 // Ensure unsigned
        writeUint32(buf, d, i)
        i += 4
      }
    }
  }
}
