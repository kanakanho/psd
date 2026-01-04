/**
 * Type definitions for PSD file structure
 * Ported from Go implementation without using classes
 */

export type ColorMode = 0 | 1 | 2 | 3 | 4 | 7 | 8 | 9

export type CompressionMethod = 0 | 1 | 2 | 3

export type BlendMode = string

export type AdditionalInfoKey = string

export interface Rectangle {
  x: number
  y: number
  width: number
  height: number
}

export interface Config {
  version: number
  rect: Rectangle
  channels: number
  depth: number // 1 or 8 or 16 or 32
  colorMode: ColorMode
  colorModeData: Uint8Array
  res: Map<number, ImageResource>
}

export interface ImageResource {
  name: string
  data: Uint8Array
}

export interface Channel {
  data: Uint8Array
}

export interface Mask {
  rect: Rectangle
  defaultColor: number
  flags: number
  realRect: Rectangle
  realBackgroundColor: number
  realFlags: number
  userMaskDensity: number
  userMaskFeather: number
  vectorMaskDensity: number
  vectorMaskFeather: number
}

export interface SectionDividerSetting {
  type: number
  blendMode: BlendMode
  subType: number
}

export interface Layer {
  seqID: number
  name: string
  unicodeName: string
  mbcsName: string
  rect: Rectangle
  channel: Map<number, Channel>
  blendMode: BlendMode
  opacity: number
  clipping: boolean
  blendClippedElements: boolean
  flags: number
  mask: Mask
  additionalLayerInfo: Map<AdditionalInfoKey, Uint8Array>
  sectionDividerSetting: SectionDividerSetting
  layer: Layer[]
}

export interface PSD {
  config: Config
  channel: Map<number, Channel>
  layer: Layer[]
  additionalLayerInfo: Map<AdditionalInfoKey, Uint8Array>
  data: Uint8Array
}

export interface DecodeOptions {
  skipLayerImage?: boolean
  skipMergedImage?: boolean
}
