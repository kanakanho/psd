/**
 * Constants for PSD file format
 * Ported from Go implementation
 */

import type { BlendMode, ColorMode, CompressionMethod } from './types'

// File signatures
export const HEADER_SIGNATURE = '8BPS'
export const SECTION_SIGNATURE = '8BIM'

// ColorMode values
export const ColorModeBitmap: ColorMode = 0
export const ColorModeGrayscale: ColorMode = 1
export const ColorModeIndexed: ColorMode = 2
export const ColorModeRGB: ColorMode = 3
export const ColorModeCMYK: ColorMode = 4
export const ColorModeMultichannel: ColorMode = 7
export const ColorModeDuotone: ColorMode = 8
export const ColorModeLab: ColorMode = 9

// CompressionMethod values
export const CompressionMethodRaw: CompressionMethod = 0
export const CompressionMethodRLE: CompressionMethod = 1
export const CompressionMethodZIPWithoutPrediction: CompressionMethod = 2
export const CompressionMethodZIPWithPrediction: CompressionMethod = 3

// BlendMode values
export const BlendModePassThrough: BlendMode = 'pass'
export const BlendModeNormal: BlendMode = 'norm'
export const BlendModeDissolve: BlendMode = 'diss'
export const BlendModeDarken: BlendMode = 'dark'
export const BlendModeMultiply: BlendMode = 'mul '
export const BlendModeColorBurn: BlendMode = 'idiv'
export const BlendModeLinearBurn: BlendMode = 'lbrn'
export const BlendModeDarkerColor: BlendMode = 'dkCl'
export const BlendModeLighten: BlendMode = 'lite'
export const BlendModeScreen: BlendMode = 'scrn'
export const BlendModeColorDodge: BlendMode = 'div '
export const BlendModeLinearDodge: BlendMode = 'lddg'
export const BlendModeLighterColor: BlendMode = 'lgCl'
export const BlendModeOverlay: BlendMode = 'over'
export const BlendModeSoftLight: BlendMode = 'sLit'
export const BlendModeHardLight: BlendMode = 'hLit'
export const BlendModeVividLight: BlendMode = 'vLit'
export const BlendModeLinearLight: BlendMode = 'lLit'
export const BlendModePinLight: BlendMode = 'pLit'
export const BlendModeHardMix: BlendMode = 'hMix'
export const BlendModeDifference: BlendMode = 'diff'
export const BlendModeExclusion: BlendMode = 'smud'
export const BlendModeSubtract: BlendMode = 'fsub'
export const BlendModeDivide: BlendMode = 'fdiv'
export const BlendModeHue: BlendMode = 'hue '
export const BlendModeSaturation: BlendMode = 'sat '
export const BlendModeColor: BlendMode = 'colr'
export const BlendModeLuminosity: BlendMode = 'lum '

// Additional Info Keys
export const AdditionalInfoKeyLayerInfo = 'Layr'
export const AdditionalInfoKeyLayerInfo16 = 'Lr16'
export const AdditionalInfoKeyLayerInfo32 = 'Lr32'
export const AdditionalInfoKeyUnicodeLayerName = 'luni'
export const AdditionalInfoKeyBlendClippingElements = 'clbl'
export const AdditionalInfoKeySectionDividerSetting = 'lsct'
export const AdditionalInfoKeySectionDividerSetting2 = 'lsdk'

// Large document keys that use 8-byte length
export const LARGE_DOC_KEYS = [
  'LMsk',
  'Lr16',
  'Lr32',
  'Layr',
  'Mt16',
  'Mt32',
  'Mtrn',
  'Alph',
  'FMsk',
  'lnk2',
  'FEid',
  'FXid',
  'PxSD',
]
