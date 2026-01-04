/**
 * Unit tests for colormode functions
 */

import { describe, expect, it } from 'vitest'
import { getColorModeChannels, isValidColorMode } from '../colormode'
import {
  ColorModeBitmap,
  ColorModeCMYK,
  ColorModeGrayscale,
  ColorModeIndexed,
  ColorModeRGB,
} from '../constants'

describe('colormode - getColorModeChannels', () => {
  it('should return 1 channel for Bitmap', () => {
    expect(getColorModeChannels(ColorModeBitmap)).toBe(1)
  })

  it('should return 1 channel for Grayscale', () => {
    expect(getColorModeChannels(ColorModeGrayscale)).toBe(1)
  })

  it('should return 1 channel for Indexed', () => {
    expect(getColorModeChannels(ColorModeIndexed)).toBe(1)
  })

  it('should return 3 channels for RGB', () => {
    expect(getColorModeChannels(ColorModeRGB)).toBe(3)
  })

  it('should return 4 channels for CMYK', () => {
    expect(getColorModeChannels(ColorModeCMYK)).toBe(4)
  })

  it('should return -1 for unknown color mode', () => {
    expect(getColorModeChannels(99 as any)).toBe(-1)
  })
})

describe('colormode - isValidColorMode', () => {
  it('should validate correct color modes', () => {
    expect(isValidColorMode(0)).toBe(true) // Bitmap
    expect(isValidColorMode(1)).toBe(true) // Grayscale
    expect(isValidColorMode(2)).toBe(true) // Indexed
    expect(isValidColorMode(3)).toBe(true) // RGB
    expect(isValidColorMode(4)).toBe(true) // CMYK
    expect(isValidColorMode(7)).toBe(true) // Multichannel
    expect(isValidColorMode(8)).toBe(true) // Duotone
    expect(isValidColorMode(9)).toBe(true) // Lab
  })

  it('should reject invalid color modes', () => {
    expect(isValidColorMode(5)).toBe(false)
    expect(isValidColorMode(6)).toBe(false)
    expect(isValidColorMode(10)).toBe(false)
    expect(isValidColorMode(-1)).toBe(false)
  })
})
