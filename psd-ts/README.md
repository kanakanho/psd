# PSD-TS

TypeScript implementation of a PSD (Photoshop Document) file reader.

This is a port of the Go PSD reader library to TypeScript, implemented without using classes (functional programming style).

## Features

- Parse PSD/PSB file headers and configuration
- Read image resources
- Parse layer information and hierarchy
- Decode compressed image data (Raw, RLE, ZIP)
- Support for various color modes (RGB, CMYK, Grayscale, Indexed, etc.)
- Support for different bit depths (1, 8, 16, 32)
- Layer properties (blend mode, opacity, visibility, etc.)
- Layer masks and effects

## Installation

```bash
pnpm install
```

## Usage

```typescript
import * as fs from 'node:fs'
import { decode, decodeConfig } from 'psd-ts'

// Read PSD file
const buffer = fs.readFileSync('image.psd')
const uint8Array = new Uint8Array(buffer)

// Decode full PSD
const psd = decode(uint8Array)

console.log('Image dimensions:', psd.config.rect.width, 'x', psd.config.rect.height)
console.log('Color mode:', psd.config.colorMode)
console.log('Bit depth:', psd.config.depth)
console.log('Number of layers:', psd.layer.length)

// Or just decode config without layers
const { config } = decodeConfig(uint8Array)
console.log('Config:', config)
```

## Decode Options

You can pass options to skip certain parts of the decoding:

```typescript
const psd = decode(uint8Array, {
  skipLayerImage: true, // Skip decoding layer image data
  skipMergedImage: true, // Skip decoding merged/flattened image
})
```

## API

### Main Functions

- `decode(buffer: Uint8Array, options?: DecodeOptions): PSD` - Decode full PSD file
- `decodeConfig(buffer: Uint8Array): { config: Config, bytesRead: number }` - Decode only header and config

### Helper Functions

- `isLayerVisible(layer: Layer): boolean` - Check if layer is visible
- `hasLayerImage(layer: Layer): boolean` - Check if layer has image data
- `isLayerFolder(layer: Layer): boolean` - Check if layer is a folder/group
- `getColorModeChannels(colorMode: ColorMode): number` - Get number of channels for a color mode
- `getBlendModeName(blendMode: BlendMode): string` - Get human-readable blend mode name

### Types

All types are exported from the main module:

- `PSD` - Complete PSD structure
- `Config` - PSD configuration/header
- `Layer` - Layer information
- `Channel` - Channel data
- `Mask` - Layer mask information
- `Rectangle` - Rectangle coordinates
- And more...

## Build

```bash
npm run build
```

This will generate CommonJS and ESM builds in the `dist` directory.

## Lint

```bash
npm run lint
# or fix automatically
npm run lint:fix
```

## Limitations

This is a read-only implementation. It does not support:

- Writing/creating PSD files
- Layer composition/rendering
- All color modes (Lab, Duotone not fully supported)
- Some advanced layer effects

## Credits

This is a TypeScript port of the [oov/psd](https://github.com/oov/psd) Go library.

## License

See the main project LICENSE file.
