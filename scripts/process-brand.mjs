// Process the rendered PDFs into final web brand assets.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const B = path.join(__dirname, '..', 'public', 'brand')

const SRC = path.join(B, 'logo-full.png')   // The rendered stamp PDF (1559×1059)

// 1) Trim whitespace from the full stamp to make a tight logo
await sharp(SRC)
  .trim({ background: { r: 255, g: 255, b: 255, alpha: 1 }, threshold: 10 })
  .png()
  .toFile(path.join(B, 'logo.png'))
console.log('saved logo.png (full stamp trimmed)')

// 2) Emblem alone — extract from the trimmed logo (599×368).
//    Emblem sits at approximately x=410-560, y=30-180 of the trimmed logo.
await sharp(path.join(B, 'logo.png'))
  .extract({ left: 410, top: 30, width: 155, height: 155 })
  .png()
  .toFile(path.join(B, 'emblem.png'))
console.log('saved emblem.png')

// 3) Watermark: emblem at modest size — kept smaller to save bandwidth
await sharp(path.join(B, 'emblem.png'))
  .resize(600, 600, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'watermark.png'))
console.log('saved watermark.png')

// 4) Favicon: small emblem on navy background
await sharp(path.join(B, 'emblem.png'))
  .resize(96, 96, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
  .flatten({ background: { r: 11, g: 33, b: 53 } })
  .png()
  .toFile(path.join(B, 'favicon.png'))
console.log('saved favicon.png')

console.log('Done')
