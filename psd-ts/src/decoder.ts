/**
 * PSD file decoder
 * Ported from Go implementation without using classes
 */

import type {
  AdditionalInfoKey,
  Channel,
  Config,
  DecodeOptions,
  ImageResource,
  Layer,
  Mask,
  PSD,
  Rectangle,
} from './types'
import {
  AdditionalInfoKeyBlendClippingElements,
  AdditionalInfoKeyLayerInfo,
  AdditionalInfoKeyLayerInfo16,
  AdditionalInfoKeyLayerInfo32,
  AdditionalInfoKeySectionDividerSetting,
  AdditionalInfoKeySectionDividerSetting2,
  AdditionalInfoKeyUnicodeLayerName,
  HEADER_SIGNATURE,
  LARGE_DOC_KEYS,
  SECTION_SIGNATURE,
} from './constants'
import { getColorModeChannels } from './colormode'
import { decode as decodeCompress } from './compress'
import {
  adjustAlign2,
  adjustAlign4,
  get4or8,
  getString,
  itoa,
  readPascalString,
  readUint,
  readUint16,
  readUint32,
  readUint64,
  readUnicodeString,
  readFloat64,
} from './util'

/**
 * Decode PSD config from buffer
 */
export function decodeConfig(buffer: Uint8Array): { config: Config, bytesRead: number } {
  let offset = 0

  // Check signature
  const signature = getString(buffer, offset, 4)
  offset += 4
  if (signature !== HEADER_SIGNATURE) {
    throw new Error('psd: invalid format')
  }

  // Version
  const version = readUint16(buffer, offset)
  offset += 2
  if (version !== 1 && version !== 2) {
    throw new Error(`psd: unexpected file version: ${version}`)
  }

  // Reserved (6 bytes)
  offset += 6

  // Channels
  const channels = readUint16(buffer, offset)
  offset += 2
  if (channels < 1 || channels > 56) {
    throw new Error('psd: unexpected the number of channels')
  }

  // Height
  const height = readUint32(buffer, offset)
  offset += 4

  // Width
  const width = readUint32(buffer, offset)
  offset += 4

  if (height < 1 || (version === 1 && height > 30000) || (version === 2 && height > 300000)) {
    throw new Error('psd: unexpected the height of the image')
  }
  if (width < 1 || (version === 1 && width > 30000) || (version === 2 && width > 300000)) {
    throw new Error('psd: unexpected the width of the image')
  }

  const rect: Rectangle = {
    x: 0,
    y: 0,
    width,
    height,
  }

  // Depth
  const depth = readUint16(buffer, offset)
  offset += 2
  if (depth !== 1 && depth !== 8 && depth !== 16 && depth !== 32) {
    throw new Error('psd: unexpected color depth')
  }

  // ColorMode
  const colorMode = readUint16(buffer, offset)
  offset += 2

  // Color mode data
  const colorModeDataLen = readUint32(buffer, offset)
  offset += 4
  const colorModeData = buffer.slice(offset, offset + colorModeDataLen)
  offset += colorModeDataLen

  // Image resources
  const { res, bytesRead: resRead } = readImageResources(buffer.slice(offset))
  offset += resRead

  const config: Config = {
    version,
    rect,
    channels,
    depth,
    colorMode: colorMode as any,
    colorModeData,
    res,
  }

  return { config, bytesRead: offset }
}

/**
 * Read image resources section
 */
function readImageResources(buffer: Uint8Array): { res: Map<number, ImageResource>, bytesRead: number } {
  let offset = 0
  const res = new Map<number, ImageResource>()

  const imageResourceLen = readUint32(buffer, offset)
  offset += 4

  if (imageResourceLen === 0) {
    return { res, bytesRead: offset }
  }

  const endOffset = offset + imageResourceLen

  while (offset < endOffset) {
    // Signature (4 bytes)
    const sig = getString(buffer, offset, 4)
    offset += 4

    // Various signatures are allowed
    if (sig !== '8BIM' && sig !== 'MeSa' && sig !== 'PHUT' && sig !== 'AgHg' && sig !== 'DCSR') {
      throw new Error('psd: invalid image resource signature')
    }

    // Resource ID (2 bytes)
    const id = readUint16(buffer, offset)
    offset += 2

    // Name (Pascal string, padded to even)
    const { str: name, length: nameLen } = readPascalString(buffer, offset)
    offset += nameLen
    offset += adjustAlign2(nameLen)

    // Data length
    const dataLen = readUint32(buffer, offset)
    offset += 4

    // Data
    const data = buffer.slice(offset, offset + dataLen)
    offset += dataLen
    offset += adjustAlign2(dataLen)

    res.set(id, { name, data })
  }

  return { res, bytesRead: offset }
}

/**
 * Check if image has alpha channel based on resource ID
 */
function hasAlphaID0(res: Map<number, ImageResource>): boolean {
  // Resource ID 0x0417 indicates transparency index
  return res.has(0x0417)
}

/**
 * Decode full PSD file
 */
export function decode(buffer: Uint8Array, options: DecodeOptions = {}): PSD {
  const { config, bytesRead: configRead } = decodeConfig(buffer)
  let offset = configRead

  // Layer and mask information
  const { psd, bytesRead: layerRead } = readLayerAndMaskInfo(
    buffer.slice(offset),
    config,
    options,
  )
  offset += layerRead

  // Merged image data
  if (!options.skipMergedImage) {
    const compressionMethod = readUint16(buffer, offset)
    offset += 2

    const plane = ((config.rect.width * config.depth + 7) >> 3) * config.rect.height
    const data = new Uint8Array(plane * config.channels)

    const read = decodeCompress(
      compressionMethod as any,
      data,
      buffer.slice(offset),
      config.rect,
      config.depth,
      config.channels,
      config.version === 2,
    )
    offset += read

    psd.data = data

    // Create channels
    psd.channel = new Map()
    for (let i = 0; i < config.channels; i++) {
      const channelData = data.slice(plane * i, plane * (i + 1))
      psd.channel.set(i, { data: channelData })
    }
  }

  return psd
}

/**
 * Read layer and mask information section
 */
function readLayerAndMaskInfo(
  buffer: Uint8Array,
  config: Config,
  options: DecodeOptions,
): { psd: PSD, bytesRead: number } {
  let offset = 0

  const psd: PSD = {
    config,
    channel: new Map(),
    layer: [],
    additionalLayerInfo: new Map(),
    data: new Uint8Array(0),
  }

  const intSize = get4or8(config.version === 2)
  const layerAndMaskInfoLen = Number(readUint(buffer, offset, intSize))
  offset += intSize

  if (layerAndMaskInfoLen === 0) {
    return { psd, bytesRead: offset }
  }

  const endOffset = offset + layerAndMaskInfoLen

  // Layer info
  let layers: Layer[] = []
  if (offset < endOffset) {
    const { layers: layerList, bytesRead: layerRead } = readLayerInfo(
      buffer.slice(offset),
      config,
      options,
    )
    layers = layerList
    offset += layerRead
  }

  // Global layer mask info
  if (endOffset - offset >= 4) {
    const globalLayerMaskInfoLen = readUint32(buffer, offset)
    offset += 4
    if (globalLayerMaskInfoLen > 0) {
      // Skip global layer mask info (not implemented)
      offset += globalLayerMaskInfoLen
    }
  }

  // Additional layer info
  if (endOffset - offset >= 8) {
    const { info, layers: additionalLayers, bytesRead: infoRead } = readAdditionalLayerInfo(
      buffer.slice(offset),
      endOffset - offset,
      config,
      options,
    )
    psd.additionalLayerInfo = info
    if (additionalLayers.length > 0) {
      layers = additionalLayers
    }
    offset += infoRead
  }

  // Build layer tree
  psd.layer = buildTree(layers)

  // Handle remaining alignment
  if (endOffset - offset > 0 && endOffset - offset < intSize) {
    offset = endOffset
  }

  return { psd, bytesRead: offset }
}

/**
 * Read layer information
 */
function readLayerInfo(
  buffer: Uint8Array,
  config: Config,
  options: DecodeOptions,
): { layers: Layer[], bytesRead: number } {
  let offset = 0
  const intSize = get4or8(config.version === 2)

  const layerInfoLen = Number(readUint(buffer, offset, intSize))
  offset += intSize

  if (layerInfoLen === 0) {
    return { layers: [], bytesRead: offset }
  }

  let numLayers = readUint16(buffer, offset)
  offset += 2

  if ((numLayers & 0x8000) !== 0) {
    numLayers = (~numLayers + 1) & 0xFFFF
  }

  const layers: Layer[] = []
  const layerChannelInfos: Array<{ layer: Layer, channelData: Array<{ chIndex: number, dataLen: number }> }> = []

  // Read layer records
  for (let i = 0; i < numLayers; i++) {
    const layer = createEmptyLayer()
    layer.seqID = i

    // Rectangle
    const top = readUint32(buffer, offset)
    offset += 4
    const left = readUint32(buffer, offset)
    offset += 4
    const bottom = readUint32(buffer, offset)
    offset += 4
    const right = readUint32(buffer, offset)
    offset += 4

    layer.rect = {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    }

    // Number of channels
    const numChannels = readUint16(buffer, offset)
    offset += 2

    const channelData: Array<{ chIndex: number, dataLen: number }> = []
    for (let j = 0; j < numChannels; j++) {
      const chIndex = readUint16(buffer, offset) as any as number
      // Convert to signed
      const signedChIndex = chIndex > 32767 ? chIndex - 65536 : chIndex
      offset += 2

      const dataLen = Number(readUint(buffer, offset, intSize))
      offset += intSize

      channelData.push({ chIndex: signedChIndex, dataLen })
    }

    layerChannelInfos.push({ layer, channelData })

    // Blend mode signature
    const blendSig = getString(buffer, offset, 4)
    offset += 4
    if (blendSig !== SECTION_SIGNATURE) {
      throw new Error('psd: unexpected the blend mode signature')
    }

    // Blend mode
    layer.blendMode = getString(buffer, offset, 4)
    offset += 4

    // Opacity
    layer.opacity = buffer[offset]
    offset += 1

    // Clipping
    layer.clipping = buffer[offset] !== 0
    offset += 1

    // Flags
    layer.flags = buffer[offset]
    offset += 1

    // Filler
    offset += 1

    // Extra data
    const { bytesRead: extraRead } = readLayerExtraData(buffer.slice(offset), layer, config)
    offset += extraRead

    // Set layer name
    if (layer.additionalLayerInfo.has(AdditionalInfoKeyUnicodeLayerName)) {
      const data = layer.additionalLayerInfo.get(AdditionalInfoKeyUnicodeLayerName)!
      layer.unicodeName = readUnicodeString(data)
      layer.name = layer.unicodeName
      layer.additionalLayerInfo.delete(AdditionalInfoKeyUnicodeLayerName)
    }
    else {
      layer.name = layer.mbcsName
    }

    // Blend clipped elements
    if (layer.additionalLayerInfo.has(AdditionalInfoKeyBlendClippingElements)) {
      const data = layer.additionalLayerInfo.get(AdditionalInfoKeyBlendClippingElements)!
      layer.blendClippedElements = data[0] !== 0
      layer.additionalLayerInfo.delete(AdditionalInfoKeyBlendClippingElements)
    }
    else {
      layer.blendClippedElements = true
    }

    // Section divider setting
    readSectionDividerSetting(layer)
    if (layer.sectionDividerSetting.blendMode === '') {
      layer.sectionDividerSetting.blendMode = layer.blendMode
    }
    layer.additionalLayerInfo.delete(AdditionalInfoKeySectionDividerSetting)
    layer.additionalLayerInfo.delete(AdditionalInfoKeySectionDividerSetting2)

    layers.push(layer)
  }

  // Read layer image data
  if (!options.skipLayerImage) {
    const { bytesRead: imageRead } = readLayerImages(
      buffer.slice(offset),
      layerChannelInfos,
      config,
    )
    offset += imageRead
  }

  return { layers, bytesRead: offset }
}

/**
 * Read layer extra data
 */
function readLayerExtraData(
  buffer: Uint8Array,
  layer: Layer,
  config: Config,
): { bytesRead: number } {
  let offset = 0

  const extraDataLen = readUint32(buffer, offset)
  offset += 4

  if (extraDataLen === 0) {
    return { bytesRead: offset }
  }

  const endOffset = offset + extraDataLen

  // Layer mask/adjustment data
  const { bytesRead: maskRead } = readLayerMaskData(buffer.slice(offset), layer)
  offset += maskRead

  // Blending ranges
  const blendingRangesLen = readUint32(buffer, offset)
  offset += 4
  if (blendingRangesLen > 0) {
    offset += blendingRangesLen
  }

  // Layer name
  const { str: name, length: nameLen } = readPascalString(buffer, offset)
  layer.mbcsName = name
  offset += nameLen
  offset += adjustAlign4(nameLen)

  // Additional layer info
  if (offset < endOffset) {
    const { info } = readAdditionalLayerInfo(buffer.slice(offset), endOffset - offset, config, {})
    layer.additionalLayerInfo = info
    offset = endOffset
  }
  else {
    layer.additionalLayerInfo = new Map()
  }

  return { bytesRead: offset }
}

/**
 * Read layer mask data
 */
function readLayerMaskData(buffer: Uint8Array, layer: Layer): { bytesRead: number } {
  let offset = 0

  const maskLen = readUint32(buffer, offset)
  offset += 4

  if (maskLen === 0) {
    return { bytesRead: offset }
  }

  const endOffset = offset + maskLen

  // Rectangle
  if (endOffset - offset >= 16) {
    const top = readUint32(buffer, offset)
    offset += 4
    const left = readUint32(buffer, offset)
    offset += 4
    const bottom = readUint32(buffer, offset)
    offset += 4
    const right = readUint32(buffer, offset)
    offset += 4

    layer.mask.rect = {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    }
  }

  // Default color
  if (endOffset - offset >= 1) {
    layer.mask.defaultColor = buffer[offset]
    offset += 1
  }

  // Flags
  if (endOffset - offset >= 1) {
    layer.mask.flags = buffer[offset]
    offset += 1
  }

  // Initialize densities
  layer.mask.userMaskDensity = 255
  layer.mask.vectorMaskDensity = 255

  // Mask parameters
  if ((layer.mask.flags & 16) !== 0 && endOffset - offset >= 1) {
    const maskParam = buffer[offset]
    offset += 1

    if ((maskParam & 1) !== 0 && endOffset - offset >= 1) {
      layer.mask.userMaskDensity = buffer[offset]
      offset += 1
    }

    if ((maskParam & 2) !== 0 && endOffset - offset >= 8) {
      layer.mask.userMaskFeather = readFloat64(buffer, offset)
      offset += 8
    }

    if ((maskParam & 4) !== 0 && endOffset - offset >= 1) {
      layer.mask.vectorMaskDensity = buffer[offset]
      offset += 1
    }

    if ((maskParam & 8) !== 0 && endOffset - offset >= 8) {
      layer.mask.vectorMaskFeather = readFloat64(buffer, offset)
      offset += 8
    }
  }

  // Padding for size = 20
  if (maskLen === 20) {
    offset = endOffset
    return { bytesRead: offset }
  }

  // Real flags
  if (endOffset - offset >= 1) {
    layer.mask.realFlags = buffer[offset]
    offset += 1
  }

  // Real background color
  if (endOffset - offset >= 1) {
    layer.mask.realBackgroundColor = buffer[offset]
    offset += 1
  }

  // Real rectangle
  if (endOffset - offset >= 16) {
    const top = readUint32(buffer, offset)
    offset += 4
    const left = readUint32(buffer, offset)
    offset += 4
    const bottom = readUint32(buffer, offset)
    offset += 4
    const right = readUint32(buffer, offset)
    offset += 4

    layer.mask.realRect = {
      x: left,
      y: top,
      width: right - left,
      height: bottom - top,
    }
  }

  return { bytesRead: endOffset }
}

/**
 * Read section divider setting
 */
function readSectionDividerSetting(layer: Layer): void {
  let data = layer.additionalLayerInfo.get(AdditionalInfoKeySectionDividerSetting)
  let key = AdditionalInfoKeySectionDividerSetting

  if (!data) {
    data = layer.additionalLayerInfo.get(AdditionalInfoKeySectionDividerSetting2)
    key = AdditionalInfoKeySectionDividerSetting2
  }

  if (!data) {
    layer.sectionDividerSetting = { type: 0, blendMode: '', subType: 0 }
    return
  }

  const type = readUint32(data, 0)

  if (data.length < 12) {
    layer.sectionDividerSetting = { type, blendMode: '', subType: 0 }
    return
  }

  const sig = getString(data, 4, 4)
  if (sig !== SECTION_SIGNATURE) {
    throw new Error(`psd: unexpected signature in section divider setting`)
  }

  const blendMode = getString(data, 8, 4)

  if (data.length < 16) {
    layer.sectionDividerSetting = { type, blendMode, subType: 0 }
    return
  }

  const subType = readUint32(data, 12)
  layer.sectionDividerSetting = { type, blendMode, subType }
}

/**
 * Read layer images
 */
function readLayerImages(
  buffer: Uint8Array,
  layerChannelInfos: Array<{ layer: Layer, channelData: Array<{ chIndex: number, dataLen: number }> }>,
  config: Config,
): { bytesRead: number } {
  let offset = 0

  for (const lci of layerChannelInfos) {
    lci.layer.channel = new Map()

    for (const ch of lci.channelData) {
      let readCh = 0

      // Compression method
      let cmpMethod = 0
      if (ch.dataLen >= 2) {
        cmpMethod = readUint16(buffer, offset)
        offset += 2
        readCh += 2
      }

      // Determine rectangle
      let rect: Rectangle
      if (ch.chIndex === -3) {
        rect = lci.layer.mask.realRect
      }
      else if (ch.chIndex === -2) {
        rect = lci.layer.mask.rect
      }
      else {
        rect = lci.layer.rect
      }

      // Allocate data
      const dataSize = ((rect.width * config.depth + 7) >> 3) * rect.height
      const data = new Uint8Array(dataSize)

      // Decode
      if (ch.dataLen > 2) {
        const read = decodeCompress(
          cmpMethod as any,
          data,
          buffer.slice(offset, offset + ch.dataLen - 2),
          rect,
          config.depth,
          1,
          config.version === 2,
        )
        offset += read
        readCh += read
      }

      // Handle remaining data
      if (readCh < ch.dataLen) {
        offset += ch.dataLen - readCh
        readCh = ch.dataLen
      }

      lci.layer.channel.set(ch.chIndex, { data })
    }
  }

  return { bytesRead: offset }
}

/**
 * Read additional layer information
 */
function readAdditionalLayerInfo(
  buffer: Uint8Array,
  infoLen: number,
  config: Config,
  options: DecodeOptions,
): { info: Map<AdditionalInfoKey, Uint8Array>, layers: Layer[], bytesRead: number } {
  let offset = 0
  const info = new Map<AdditionalInfoKey, Uint8Array>()
  let layers: Layer[] = []

  while (offset < infoLen) {
    // Find signature
    while (offset < infoLen && buffer[offset] !== 0x38) { // '8'
      offset++
    }

    if (offset >= infoLen)
      break

    // Read signature
    const sig = getString(buffer, offset, 4)
    offset += 4

    if (sig !== SECTION_SIGNATURE && sig !== '8B64') {
      throw new Error('psd: unexpected signature in additional layer information')
    }

    // Key
    const key = getString(buffer, offset, 4)
    offset += 4

    // Check if this is a layer info key
    if (
      key === AdditionalInfoKeyLayerInfo
      || key === AdditionalInfoKeyLayerInfo16
      || key === AdditionalInfoKeyLayerInfo32
    ) {
      const { layers: layerList, bytesRead: layerRead } = readLayerInfo(
        buffer.slice(offset),
        config,
        options,
      )
      layers = layers.concat(layerList)
      offset += layerRead
    }
    else {
      // Determine length size
      const intSize = LARGE_DOC_KEYS.includes(key) && config.version === 2 ? 8 : 4
      const dataLen = Number(readUint(buffer, offset, intSize))
      offset += intSize

      const data = buffer.slice(offset, offset + dataLen)
      offset += dataLen

      info.set(key, data)
    }
  }

  return { info, layers, bytesRead: offset }
}

/**
 * Build layer tree from flat layer list
 */
function buildTree(layers: Layer[]): Layer[] {
  const stack: Layer[][] = []
  let current: Layer[] = []

  for (let i = 0; i < layers.length; i++) {
    const layer = layers[i]

    switch (layer.sectionDividerSetting.type) {
      case 1: // Open folder end
      case 2: // Closed folder end
        layer.layer = current
        if (stack.length === 0) {
          throw new Error(`psd: layer tree structure is broken(#${i})`)
        }
        current = stack.pop()!
        current.push(layer)
        break

      case 3: // Folder start
        stack.push(current)
        current = []
        break

      default: // Normal layer
        current.push(layer)
        break
    }
  }

  return current
}

/**
 * Create an empty layer with default values
 */
function createEmptyLayer(): Layer {
  return {
    seqID: 0,
    name: '',
    unicodeName: '',
    mbcsName: '',
    rect: { x: 0, y: 0, width: 0, height: 0 },
    channel: new Map(),
    blendMode: '',
    opacity: 255,
    clipping: false,
    blendClippedElements: true,
    flags: 0,
    mask: {
      rect: { x: 0, y: 0, width: 0, height: 0 },
      defaultColor: 0,
      flags: 0,
      realRect: { x: 0, y: 0, width: 0, height: 0 },
      realBackgroundColor: 0,
      realFlags: 0,
      userMaskDensity: 255,
      userMaskFeather: 0,
      vectorMaskDensity: 255,
      vectorMaskFeather: 0,
    },
    additionalLayerInfo: new Map(),
    sectionDividerSetting: {
      type: 0,
      blendMode: '',
      subType: 0,
    },
    layer: [],
  }
}

/**
 * Helper functions for layer properties
 */
export function isLayerTransparencyProtected(layer: Layer): boolean {
  return (layer.flags & 1) !== 0
}

export function isLayerVisible(layer: Layer): boolean {
  return (layer.flags & 2) === 0
}

export function hasLayerImage(layer: Layer): boolean {
  return layer.sectionDividerSetting.type === 0
}

export function isLayerFolder(layer: Layer): boolean {
  return layer.sectionDividerSetting.type === 1 || layer.sectionDividerSetting.type === 2
}

export function isLayerFolderOpen(layer: Layer): boolean {
  return layer.sectionDividerSetting.type === 1
}

export function isMaskEnabled(mask: Mask): boolean {
  return (mask.flags & 2) === 0
}

export function isRealMaskEnabled(mask: Mask): boolean {
  return (mask.realFlags & 2) === 0
}
