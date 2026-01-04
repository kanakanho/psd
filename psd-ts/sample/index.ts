import * as fs from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { decode, decodeConfig } from '../src/index'

// Read PSD file
const dirPath = 'sample/data'
const filePath = fs
  .readdirSync(dirPath)
  .map(fileName => `${dirPath}/${fileName}`)
  .find(filePath => filePath.endsWith('.psd'))!
const buffer = fs.readFileSync(filePath)
const uint8Array = new Uint8Array(buffer)

console.log('Decoding file:', filePath)

// Decode full PSD
const psd = decode(uint8Array)

console.log('Image dimensions:', psd.config.rect.width, 'x', psd.config.rect.height)
console.log('Color mode:', psd.config.colorMode)
console.log('Bit depth:', psd.config.depth)
console.log('Number of layers:', psd.layer.length)

// Or just decode config without layers
const { config } = decodeConfig(uint8Array)
console.log('Config:', config)

const database = new DatabaseSync('sample/data/psd_data.db')

// Create tables
const tableCreationQueries = [
  `CREATE TABLE IF NOT EXISTS root (
    id INTEGER PRIMARY KEY,
    x INTEGER,
    y INTEGER,
    width INTEGER,
    height INTEGER,
    layer_id INTEGER REFERENCES layers(id) ON DELETE CASCADE
);`,

  // 1. layers テーブル
  `CREATE TABLE IF NOT EXISTS layers (
    id INTEGER PRIMARY KEY, -- SQLiteでは INTEGER PRIMARY KEY は自動的に連番になります
    name TEXT,
    unicode_name TEXT,
    mbcs_name TEXT,
    rect_x1 INTEGER,
    rect_y1 INTEGER,
    rect_x2 INTEGER,
    rect_y2 INTEGER,
    blend_mode TEXT,
    opacity INTEGER,
    clipping INTEGER,
    blend_clipped_elements INTEGER,
    flags INTEGER,
    sd_type INTEGER,
    sd_blend_mode TEXT,
    sd_sub_type INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);`,

  // 2. image テーブル
  `CREATE TABLE IF NOT EXISTS image (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer_id INTEGER REFERENCES layers(id) ON DELETE CASCADE,
    image_data BLOB
);`,

  // 3. masks テーブル
  `CREATE TABLE IF NOT EXISTS masks (
    layer_id INTEGER PRIMARY KEY REFERENCES layers(id) ON DELETE CASCADE,
    rect_x1 INTEGER,
    rect_y1 INTEGER,
    rect_x2 INTEGER,
    rect_y2 INTEGER,
    default_color INTEGER,
    flags INTEGER
);`,

  // 4. additional_layer_info テーブル
  `CREATE TABLE IF NOT EXISTS additional_layer_info (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    layer_id INTEGER REFERENCES layers(id) ON DELETE CASCADE,
    info_key TEXT,
    info_data BLOB,
    UNIQUE(layer_id, info_key)
);`,

  // 5. layer_link テーブル
  `CREATE TABLE IF NOT EXISTS layer_link (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    parent_id INTEGER REFERENCES layers(id) ON DELETE CASCADE,
    child_id INTEGER REFERENCES layers(id) ON DELETE CASCADE,
    sort_order INTEGER
);`,
]

for (const query of tableCreationQueries) {
  database.exec(query)
}

function layerToImageData(layer: typeof psd.layer[0]): Uint8ClampedArray {
  const width = layer.rect.width
  const height = layer.rect.height

  const rChannel = layer.channel.get(0)
  const gChannel = layer.channel.get(1)
  const bChannel = layer.channel.get(2)
  const aChannel = layer.channel.get(-1)

  if (!rChannel || !gChannel || !bChannel) {
    throw new Error('Layer is missing one of the RGB channels')
  }

  const rData = rChannel.data
  const gData = gChannel.data
  const bData = bChannel.data
  const aData = aChannel ? aChannel.data : new Uint8Array(width * height).fill(255)

  // ImageData の代わりに Uint8ClampedArray を使用 (RGBA 4チャンネル分)
  const pixelData = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i++) {
    pixelData[i * 4 + 0] = rData[i]
    pixelData[i * 4 + 1] = gData[i]
    pixelData[i * 4 + 2] = bData[i]
    pixelData[i * 4 + 3] = aData[i]
  }

  return pixelData

  // const imageData = new ImageData(width, height);
  // for (let i = 0; i < width * height; i++) {
  //     imageData.data[i * 4 + 0] = rData[i];
  //     imageData.data[i * 4 + 1] = gData[i];
  //     imageData.data[i * 4 + 2] = bData[i];
  //     imageData.data[i * 4 + 3] = aData[i];
  // }

  // return imageData;
}

function InsertPSDData(psdData: typeof psd) {
  // ルート直下のレイヤーから再帰的に処理を開始
  // 親がいない場合は parentID を 0 または NULL (ここでは 0) として扱う
  for (let i = 0; i < psdData.layer.length; i++) {
    recursiveInsertLayer(psdData.layer[i], 0, i)
  }

  // root テーブルへのインサート
  for (let i = 0; i < psdData.layer.length; i++) {
    InsertRootData(psdData, i)
  }
}

function InsertRootData(psdData: typeof psd, index: number) {
  const layer = psdData.layer[index]

  const layerIDStmt = database.prepare(`
    SELECT id FROM layers
    WHERE name = ? AND rect_x1 = ? AND rect_y1 = ? AND rect_x2 = ? AND rect_y2 = ?`)

  const layerRow = layerIDStmt.get(
    layer.name,
    layer.rect.x,
    layer.rect.y,
    layer.rect.x + layer.rect.width,
    layer.rect.y + layer.rect.height,
  )

  if (!layerRow) {
    console.error('Layer not found for root insertion:', layer.name)
    return
  }

  const layerID = layerRow.id

  const insertRootStmt = database.prepare(`
    INSERT INTO root (
      x, y, width, height,layer_id
    ) VALUES (?, ?, ?, ?, ?)`)
  const res = insertRootStmt.run(
    psdData.config.rect.x,
    psdData.config.rect.y,
    psdData.config.rect.width,
    psdData.config.rect.height,
    layerID,
  )

  const rootID = res.lastInsertRowid

  console.log('Inserting root for Root ID:', rootID, 'layer:', layer.name, 'with ID:', layerID)

  // root と最上位レイヤーの関連付け
  const insertLayerLinkStmt = database.prepare(`
    INSERT INTO layer_link (parent_id, child_id, sort_order)
    VALUES (?, ?, ?)`)
  insertLayerLinkStmt.run(rootID, layerID, 0)
}

function recursiveInsertLayer(l: (typeof psd.layer)[0], parentID: number, sortOrder: number) {
  const insertLayerStmt = database.prepare(`
    INSERT INTO layers (
      name, unicode_name, mbcs_name, 
      rect_x1, rect_y1, rect_x2, rect_y2, 
      blend_mode, opacity, clipping, blend_clipped_elements, flags,
      sd_type, sd_blend_mode, sd_sub_type
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
  const res = insertLayerStmt.run(
    l.name,
    l.unicodeName,
    l.mbcsName,
    l.rect.x,
    l.rect.y,
    l.rect.x + l.rect.width,
    l.rect.y + l.rect.height,
    l.blendMode,
    l.opacity,
    String(l.clipping),
    String(l.blendClippedElements),
    l.flags,
    l.sectionDividerSetting.type,
    l.sectionDividerSetting.blendMode,
    l.sectionDividerSetting.subType,
  )

  const layerID = Number(res.lastInsertRowid)

  // channel から pixel data を抽出
  const imageData = layerToImageData(l)

  const insertImageStmt = database.prepare(`
    INSERT INTO image (layer_id, image_data)
    VALUES (?, ?)`)
  insertImageStmt.run(layerID, imageData)

  // 3. layer_link テーブルへの登録 (親子関係がある場合)
  if (parentID > 0) {
    const insertLayerLinkStmt = database.prepare(`
      INSERT INTO layer_link (parent_id, child_id, sort_order)
      VALUES (?, ?, ?)`)
    insertLayerLinkStmt.run(parentID, layerID, sortOrder)
  }

  // 4. masks テーブルへのインサート
  // Maskが有効かどうかをチェック (Rectが空でない等)
  if (!l.mask.rect.width || !l.mask.rect.height) {
    const insertMaskStmt = database.prepare(`
      INSERT INTO masks (layer_id, rect_x1, rect_y1, rect_x2, rect_y2, default_color, flags)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
    insertMaskStmt.run(
      layerID,
      l.mask.rect.x,
      l.mask.rect.y,
      l.mask.rect.x + l.mask.rect.width,
      l.mask.rect.y + l.mask.rect.height,
      l.mask.defaultColor,
      l.mask.flags,
    )
  }

  // 5. additional_layer_info テーブルへのインサート
  for (const [key, data] of Object.entries(l.additionalLayerInfo)) {
    const insertAdditionalInfoStmt = database.prepare(`
      INSERT INTO additional_layer_info (layer_id, info_key, info_data)
      VALUES (?, ?, ?)`)
    insertAdditionalInfoStmt.run(layerID, key, data)
  }

  // 6. 子レイヤーがある場合は再帰呼び出し
  for (let i = 0; i < l.layer.length; i++) {
    recursiveInsertLayer(l.layer[i], layerID, i)
  }
}

InsertPSDData(psd)

database.close()
