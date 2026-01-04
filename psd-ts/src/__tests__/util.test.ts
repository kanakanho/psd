/**
 * Unit tests for utility functions
 */

import { describe, expect, it } from 'vitest'
import {
  adjustAlign2,
  adjustAlign4,
  arraysEqual,
  get4or8,
  getString,
  itoa,
  readFloat32,
  readFloat64,
  readPascalString,
  readUint,
  readUint16,
  readUint32,
  readUint64,
  readUnicodeString,
  writeUint16,
  writeUint32,
} from '../util'

describe('util - readUint16', () => {
  it('should read big-endian uint16', () => {
    const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78])
    expect(readUint16(buffer, 0)).toBe(0x1234)
    expect(readUint16(buffer, 1)).toBe(0x3456)
    expect(readUint16(buffer, 2)).toBe(0x5678)
  })
})

describe('util - writeUint16', () => {
  it('should write big-endian uint16', () => {
    const buffer = new Uint8Array(4)
    writeUint16(buffer, 0x1234, 0)
    writeUint16(buffer, 0x5678, 2)
    expect(buffer[0]).toBe(0x12)
    expect(buffer[1]).toBe(0x34)
    expect(buffer[2]).toBe(0x56)
    expect(buffer[3]).toBe(0x78)
  })
})

describe('util - readUint32', () => {
  it('should read big-endian uint32', () => {
    const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC])
    expect(readUint32(buffer, 0)).toBe(0x12345678)
    expect(readUint32(buffer, 2)).toBe(0x56789ABC)
  })
})

describe('util - writeUint32', () => {
  it('should write big-endian uint32', () => {
    const buffer = new Uint8Array(4)
    writeUint32(buffer, 0x12345678, 0)
    expect(buffer[0]).toBe(0x12)
    expect(buffer[1]).toBe(0x34)
    expect(buffer[2]).toBe(0x56)
    expect(buffer[3]).toBe(0x78)
  })
})

describe('util - readUint64', () => {
  it('should read big-endian uint64 as BigInt', () => {
    const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x02])
    expect(readUint64(buffer, 0)).toBe(0x0000000100000002n)
  })
})

describe('util - readFloat32', () => {
  it('should read big-endian float32', () => {
    // 1.0 in IEEE 754 single precision
    const buffer = new Uint8Array([0x3F, 0x80, 0x00, 0x00])
    expect(readFloat32(buffer, 0)).toBe(1.0)
  })
})

describe('util - readFloat64', () => {
  it('should read big-endian float64', () => {
    // 1.0 in IEEE 754 double precision
    const buffer = new Uint8Array([0x3F, 0xF0, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00])
    expect(readFloat64(buffer, 0)).toBe(1.0)
  })
})

describe('util - readUint', () => {
  it('should read variable size unsigned integers', () => {
    const buffer = new Uint8Array([0x12, 0x34, 0x56, 0x78, 0x9A, 0xBC, 0xDE, 0xF0])

    expect(readUint(buffer, 0, 1)).toBe(0x12)
    expect(readUint(buffer, 0, 2)).toBe(0x1234)
    expect(readUint(buffer, 0, 4)).toBe(0x12345678)
    expect(readUint(buffer, 0, 8)).toBe(0x123456789ABCDEF0n)
  })

  it('should throw error for invalid size', () => {
    const buffer = new Uint8Array([0x12])
    expect(() => readUint(buffer, 0, 3)).toThrow('psd: unexpected size 3')
  })
})

describe('util - get4or8', () => {
  it('should return 4 for non-PSB', () => {
    expect(get4or8(false)).toBe(4)
  })

  it('should return 8 for PSB', () => {
    expect(get4or8(true)).toBe(8)
  })
})

describe('util - readUnicodeString', () => {
  it('should read empty string', () => {
    const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00])
    expect(readUnicodeString(buffer)).toBe('')
  })

  it('should read unicode string', () => {
    // Length = 5, "Hello" in UTF-16BE
    const buffer = new Uint8Array([
      0x00,
      0x00,
      0x00,
      0x05, // Length: 5
      0x00,
      0x48, // H
      0x00,
      0x65, // e
      0x00,
      0x6C, // l
      0x00,
      0x6C, // l
      0x00,
      0x6F, // o
    ])
    expect(readUnicodeString(buffer)).toBe('Hello')
  })
})

describe('util - readPascalString', () => {
  it('should read empty pascal string', () => {
    const buffer = new Uint8Array([0x00])
    const result = readPascalString(buffer, 0)
    expect(result.str).toBe('')
    expect(result.length).toBe(1)
  })

  it('should read pascal string', () => {
    const buffer = new Uint8Array([0x05, 0x48, 0x65, 0x6C, 0x6C, 0x6F]) // "Hello"
    const result = readPascalString(buffer, 0)
    expect(result.str).toBe('Hello')
    expect(result.length).toBe(6)
  })
})

describe('util - itoa', () => {
  it('should convert numbers to strings', () => {
    expect(itoa(0)).toBe('0')
    expect(itoa(123)).toBe('123')
    expect(itoa(-456)).toBe('-456')
  })
})

describe('util - adjustAlign2', () => {
  it('should calculate 2-byte alignment padding', () => {
    expect(adjustAlign2(0)).toBe(0)
    expect(adjustAlign2(1)).toBe(1)
    expect(adjustAlign2(2)).toBe(0)
    expect(adjustAlign2(3)).toBe(1)
    expect(adjustAlign2(4)).toBe(0)
  })
})

describe('util - adjustAlign4', () => {
  it('should calculate 4-byte alignment padding', () => {
    expect(adjustAlign4(0)).toBe(0)
    expect(adjustAlign4(1)).toBe(3)
    expect(adjustAlign4(2)).toBe(2)
    expect(adjustAlign4(3)).toBe(1)
    expect(adjustAlign4(4)).toBe(0)
    expect(adjustAlign4(5)).toBe(3)
  })
})

describe('util - getString', () => {
  it('should extract string from buffer', () => {
    const buffer = new Uint8Array([0x48, 0x65, 0x6C, 0x6C, 0x6F, 0x20, 0x57, 0x6F, 0x72, 0x6C, 0x64])
    expect(getString(buffer, 0, 5)).toBe('Hello')
    expect(getString(buffer, 6, 5)).toBe('World')
  })
})

describe('util - arraysEqual', () => {
  it('should compare arrays correctly', () => {
    const a = new Uint8Array([1, 2, 3])
    const b = new Uint8Array([1, 2, 3])
    const c = new Uint8Array([1, 2, 4])
    const d = new Uint8Array([1, 2])

    expect(arraysEqual(a, b)).toBe(true)
    expect(arraysEqual(a, c)).toBe(false)
    expect(arraysEqual(a, d)).toBe(false)
  })
})
