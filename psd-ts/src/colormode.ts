/**
 * ColorMode helper functions
 * Ported from Go implementation
 */

import type { ColorMode } from './types'
import {
  ColorModeBitmap,
  ColorModeCMYK,
  ColorModeGrayscale,
  ColorModeIndexed,
  ColorModeRGB,
} from './constants'

/**
 * Returns the number of channels for the color mode.
 * The return value does not include alpha channel.
 */
export function getColorModeChannels(colorMode: ColorMode): number {
  switch (colorMode) {
    case ColorModeBitmap:
    case ColorModeGrayscale:
    case ColorModeIndexed:
      return 1
    case ColorModeRGB:
      return 3
    case ColorModeCMYK:
      return 4
    default:
      return -1
  }
}

/**
 * Check if a color mode is valid
 */
export function isValidColorMode(colorMode: number): colorMode is ColorMode {
  return [0, 1, 2, 3, 4, 7, 8, 9].includes(colorMode)
}
