// Replace logo.png with the clean designer version (no stamp box, no license #).
// Source: WhatsApp images from designer.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const B = path.join(__dirname, '..', 'public', 'brand')

const D = 'C:/Users/ahmed/Downloads'
const SRC_LOGO   = path.join(D, 'WhatsApp Image 2026-05-04 at 12.53.40 (2).jpeg')
const SRC_EMBLEM = path.join(D, 'WhatsApp Image 2026-05-04 at 12.53.40.jpeg')

// 1) Clean logo — trim the surrounding whitespace and save as PNG
await sharp(SRC_LOGO)
  .trim({ background: '#ffffff', threshold: 12 })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'logo.png'))
console.log('saved logo.png from designer image')

// 2) Emblem — the blue one, extracted from a black background.
//    The emblem itself is roughly centered. Crop+trim then put on transparent.
const emblemMeta = await sharp(SRC_EMBLEM).metadata()
console.log('emblem source:', emblemMeta.width, 'x', emblemMeta.height)
// The emblem image is on black; we'll keep that look but mostly we want
// just the emblem shape. We'll center-crop to a square and trim near-black.
const sq = Math.min(emblemMeta.width, emblemMeta.height)
await sharp(SRC_EMBLEM)
  .extract({
    left: Math.floor((emblemMeta.width  - sq) / 2),
    top:  Math.floor((emblemMeta.height - sq) / 2),
    width:  sq, height: sq,
  })
  .resize(400, 400, { fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'emblem.png'))
console.log('saved emblem.png from designer blue version')

// 3) Watermark — emblem at large size, faded look applied via CSS opacity
await sharp(path.join(B, 'emblem.png'))
  .resize(600, 600, { fit: 'contain' })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'watermark.png'))
console.log('saved watermark.png')

// 4) Favicon — emblem at 96×96 on navy background
await sharp(SRC_EMBLEM)
  .resize(96, 96, { fit: 'contain' })
  .png()
  .toFile(path.join(B, 'favicon.png'))
console.log('saved favicon.png')

console.log('Done')
