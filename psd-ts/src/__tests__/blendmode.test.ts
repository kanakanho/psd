/**
 * Unit tests for blendmode functions
 */

import { describe, expect, it } from 'vitest'
import { getBlendModeName } from '../blendmode'
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
} from '../constants'

describe('blendmode - getBlendModeName', () => {
  it('should return correct names for blend modes', () => {
    expect(getBlendModeName(BlendModePassThrough)).toBe('pass-through')
    expect(getBlendModeName(BlendModeNormal)).toBe('normal')
    expect(getBlendModeName(BlendModeDissolve)).toBe('dissolve')
    expect(getBlendModeName(BlendModeDarken)).toBe('darken')
    expect(getBlendModeName(BlendModeMultiply)).toBe('multiply')
    expect(getBlendModeName(BlendModeColorBurn)).toBe('color-burn')
    expect(getBlendModeName(BlendModeLinearBurn)).toBe('linear-burn')
    expect(getBlendModeName(BlendModeDarkerColor)).toBe('darker-color')
    expect(getBlendModeName(BlendModeLighten)).toBe('lighten')
    expect(getBlendModeName(BlendModeScreen)).toBe('screen')
    expect(getBlendModeName(BlendModeColorDodge)).toBe('color-dodge')
    expect(getBlendModeName(BlendModeLinearDodge)).toBe('linear-dodge')
    expect(getBlendModeName(BlendModeLighterColor)).toBe('lighter-color')
    expect(getBlendModeName(BlendModeOverlay)).toBe('overlay')
    expect(getBlendModeName(BlendModeSoftLight)).toBe('soft-light')
    expect(getBlendModeName(BlendModeHardLight)).toBe('hard-light')
    expect(getBlendModeName(BlendModeVividLight)).toBe('vivid-light')
    expect(getBlendModeName(BlendModeLinearLight)).toBe('linear-light')
    expect(getBlendModeName(BlendModePinLight)).toBe('pin-light')
    expect(getBlendModeName(BlendModeHardMix)).toBe('hard-mix')
    expect(getBlendModeName(BlendModeDifference)).toBe('difference')
    expect(getBlendModeName(BlendModeExclusion)).toBe('exclusion')
    expect(getBlendModeName(BlendModeSubtract)).toBe('subtract')
    expect(getBlendModeName(BlendModeDivide)).toBe('divide')
    expect(getBlendModeName(BlendModeHue)).toBe('hue')
    expect(getBlendModeName(BlendModeSaturation)).toBe('saturation')
    expect(getBlendModeName(BlendModeColor)).toBe('color')
    expect(getBlendModeName(BlendModeLuminosity)).toBe('luminosity')
  })

  it('should return unknown for invalid blend modes', () => {
    expect(getBlendModeName('xxxx')).toBe('unknown-blend-name-xxxx')
    expect(getBlendModeName('test')).toBe('unknown-blend-name-test')
    expect(getBlendModeName('')).toBe('unknown-blend-name-')
  })
})
