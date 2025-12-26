/**
 * Unit tests for blendmode functions
 */

import { describe, expect, it } from 'vitest'
import { getBlendModeName } from '../blendmode'
import {
  BlendModeColor,
  BlendModeColorBurn,
  BlendModeDarken,
  BlendModeDifference,
  BlendModeHue,
  BlendModeLuminosity,
  BlendModeMultiply,
  BlendModeNormal,
  BlendModeOverlay,
  BlendModePassThrough,
  BlendModeScreen,
} from '../constants'

describe('blendmode - getBlendModeName', () => {
  it('should return correct names for blend modes', () => {
    expect(getBlendModeName(BlendModePassThrough)).toBe('pass-through')
    expect(getBlendModeName(BlendModeNormal)).toBe('normal')
    expect(getBlendModeName(BlendModeDarken)).toBe('darken')
    expect(getBlendModeName(BlendModeMultiply)).toBe('multiply')
    expect(getBlendModeName(BlendModeColorBurn)).toBe('color-burn')
    expect(getBlendModeName(BlendModeScreen)).toBe('screen')
    expect(getBlendModeName(BlendModeOverlay)).toBe('overlay')
    expect(getBlendModeName(BlendModeDifference)).toBe('difference')
    expect(getBlendModeName(BlendModeHue)).toBe('hue')
    expect(getBlendModeName(BlendModeColor)).toBe('color')
    expect(getBlendModeName(BlendModeLuminosity)).toBe('luminosity')
  })

  it('should return unknown for invalid blend modes', () => {
    expect(getBlendModeName('xxxx')).toBe('unknown-blend-name-xxxx')
  })
})
