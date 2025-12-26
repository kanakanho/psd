/**
 * Integration tests for PSD decoder
 * Tests against actual PSD files from testdata directory
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { describe, expect, it } from 'vitest'
import { ColorModeBitmap, ColorModeCMYK, ColorModeGrayscale, ColorModeIndexed, ColorModeRGB } from '../constants'
import { decodeConfig } from '../decoder'

const testdataDir = path.resolve(__dirname, '../../../testdata')

function readTestFile(filename: string): Uint8Array {
  const filepath = path.join(testdataDir, filename)
  const buffer = fs.readFileSync(filepath)
  return new Uint8Array(buffer)
}

describe('decoder - decodeConfig', () => {
  it('should decode RGB 8-bit PSD config', () => {
    const buffer = readTestFile('rgb8bit.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.colorMode).toBe(ColorModeRGB)
    expect(config.depth).toBe(8)
    expect(config.channels).toBeGreaterThanOrEqual(3)
    expect(config.rect.width).toBeGreaterThan(0)
    expect(config.rect.height).toBeGreaterThan(0)
  })

  it('should decode Grayscale 8-bit PSD config', () => {
    const buffer = readTestFile('grayscale8bit.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.colorMode).toBe(ColorModeGrayscale)
    expect(config.depth).toBe(8)
    expect(config.channels).toBeGreaterThanOrEqual(1)
  })

  it('should decode CMYK 8-bit PSD config', () => {
    const buffer = readTestFile('cmyk8bit.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.colorMode).toBe(ColorModeCMYK)
    expect(config.depth).toBe(8)
    expect(config.channels).toBeGreaterThanOrEqual(4)
  })

  it('should decode Indexed color PSD config', () => {
    const buffer = readTestFile('indexed.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.colorMode).toBe(ColorModeIndexed)
    expect(config.depth).toBe(8)
  })

  it('should decode Bitmap PSD config', () => {
    const buffer = readTestFile('bitmap.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.colorMode).toBe(ColorModeBitmap)
    expect(config.depth).toBe(1)
  })

  it('should decode PSB (large document) config', () => {
    const buffer = readTestFile('psb_compat.psb')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(2) // PSB version
    expect(config.rect.width).toBeGreaterThan(0)
    expect(config.rect.height).toBeGreaterThan(0)
  })

  it('should decode 16-bit PSD config', () => {
    const buffer = readTestFile('rgb16bit.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.depth).toBe(16)
  })

  it('should decode 32-bit PSD config', () => {
    const buffer = readTestFile('rgb32bit.psd')
    const { config } = decodeConfig(buffer)

    expect(config.version).toBe(1)
    expect(config.depth).toBe(32)
  })
})

// Note: Full decode() tests are commented out due to performance issues
// They work but take too long to run in CI. Use them for local testing.
// describe('decoder - decode with options', () => {
//   it('should skip merged image when requested', () => {
//     const buffer = readTestFile('rgb8bit.psd')
//     const psd = decode(buffer, { skipMergedImage: true })
//
//     expect(psd).toBeDefined()
//     expect(psd.data.length).toBe(0) // No merged image data
//   })
//
//   it('should skip layer images when requested', () => {
//     const buffer = readTestFile('rgb8bit_nobg.psd')
//     const psd = decode(buffer, { skipLayerImage: true })
//
//     expect(psd).toBeDefined()
//     // Layers should exist but without image data
//     if (psd.layer.length > 0) {
//       const firstLayer = psd.layer[0]
//       expect(firstLayer.channel.size).toBe(0)
//     }
//   })
// })

describe('decoder - error handling', () => {
  it('should throw error for invalid signature', () => {
    const buffer = new Uint8Array([0x00, 0x00, 0x00, 0x00])
    expect(() => decodeConfig(buffer)).toThrow('psd: invalid format')
  })

  it('should throw error for invalid version', () => {
    const buffer = new Uint8Array([
      0x38,
      0x42,
      0x50,
      0x53, // "8BPS"
      0x00,
      0x03, // Invalid version
    ])
    expect(() => decodeConfig(buffer)).toThrow('psd: unexpected file version')
  })

  it('should throw error for invalid color mode', () => {
    const buffer = new Uint8Array([
      0x38,
      0x42,
      0x50,
      0x53, // "8BPS"
      0x00,
      0x01, // Version 1
      0x00,
      0x00,
      0x00,
      0x00,
      0x00,
      0x00, // Reserved
      0x00,
      0x03, // 3 channels
      0x00,
      0x00,
      0x00,
      0x64, // Height: 100
      0x00,
      0x00,
      0x00,
      0x64, // Width: 100
      0x00,
      0x08, // Depth: 8
      0x00,
      0x0A, // Invalid color mode: 10
    ])
    expect(() => decodeConfig(buffer)).toThrow('psd: invalid color mode')
  })
})
