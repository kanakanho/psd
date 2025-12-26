/**
 * BlendMode helper functions
 * Ported from Go implementation
 */

import type { BlendMode } from './types'
import {
  BlendModeColor,
  BlendModeColorBurn,
  BlendModeColorDodge,
  BlendModeDarken,
  BlendModeDarkerColor,
  BlendModeDifference,
  BlendModeDissolve,
  BlendModeDivide,
  BlendModeExclusion,
  BlendModeHardLight,
  BlendModeHardMix,
  BlendModeHue,
  BlendModeLighten,
  BlendModeLighterColor,
  BlendModeLinearBurn,
  BlendModeLinearDodge,
  BlendModeLinearLight,
  BlendModeLuminosity,
  BlendModeMultiply,
  BlendModeNormal,
  BlendModeOverlay,
  BlendModePassThrough,
  BlendModePinLight,
  BlendModeSaturation,
  BlendModeScreen,
  BlendModeSoftLight,
  BlendModeSubtract,
  BlendModeVividLight,
} from './constants'

/**
 * Get human-readable blend mode name
 * Respects blend name described in "Compositing and Blending Level 1"
 */
export function getBlendModeName(blendMode: BlendMode): string {
  switch (blendMode) {
    case BlendModePassThrough:
      return 'pass-through'
    case BlendModeNormal:
      return 'normal'
    case BlendModeDissolve:
      return 'dissolve'
    case BlendModeDarken:
      return 'darken'
    case BlendModeMultiply:
      return 'multiply'
    case BlendModeColorBurn:
      return 'color-burn'
    case BlendModeLinearBurn:
      return 'linear-burn'
    case BlendModeDarkerColor:
      return 'darker-color'
    case BlendModeLighten:
      return 'lighten'
    case BlendModeScreen:
      return 'screen'
    case BlendModeColorDodge:
      return 'color-dodge'
    case BlendModeLinearDodge:
      return 'linear-dodge'
    case BlendModeLighterColor:
      return 'lighter-color'
    case BlendModeOverlay:
      return 'overlay'
    case BlendModeSoftLight:
      return 'soft-light'
    case BlendModeHardLight:
      return 'hard-light'
    case BlendModeVividLight:
      return 'vivid-light'
    case BlendModeLinearLight:
      return 'linear-light'
    case BlendModePinLight:
      return 'pin-light'
    case BlendModeHardMix:
      return 'hard-mix'
    case BlendModeDifference:
      return 'difference'
    case BlendModeExclusion:
      return 'exclusion'
    case BlendModeSubtract:
      return 'subtract'
    case BlendModeDivide:
      return 'divide'
    case BlendModeHue:
      return 'hue'
    case BlendModeSaturation:
      return 'saturation'
    case BlendModeColor:
      return 'color'
    case BlendModeLuminosity:
      return 'luminosity'
    default:
      return `unknown-blend-name-${blendMode}`
  }
}
