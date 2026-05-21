// Convert the emblem-on-black image into emblem-on-transparent
// so it can be used as a watermark behind the content.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const B = path.join(__dirname, '..', 'public', 'brand')

// Source: the WhatsApp image of the blue emblem on black
const SRC = 'C:/Users/ahmed/Downloads/WhatsApp Image 2026-05-04 at 12.53.40.jpeg'

// 1) Trim the black borders down to the emblem itself
const trimmed = await sharp(SRC)
  .trim({ background: '#000000', threshold: 20 })
  .raw()
  .toBuffer({ resolveWithObject: true })

const { data, info } = trimmed
console.log('trimmed dims:', info.width, 'x', info.height, 'channels:', info.channels)

// 2) Build an RGBA buffer where black pixels become transparent.
//    Use brightness as alpha so anti-aliased edges stay smooth.
const ch = info.channels
const out = Buffer.alloc(info.width * info.height * 4)
for (let i = 0, j = 0; i < data.length; i += ch, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const brightness = (r + g + b) / 3
  // Alpha grows with brightness; pure black → 0, anything reasonably lit → 255
  const alpha = Math.min(255, Math.round(brightness * 1.8))
  out[j]     = r
  out[j + 1] = g
  out[j + 2] = b
  out[j + 3] = alpha
}

// 3) Save as the new emblem (transparent background)
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'emblem.png'))
console.log('saved emblem.png (transparent bg)')

// 4) Make the watermark — bigger emblem at full opacity (CSS handles fading)
await sharp(path.join(B, 'emblem.png'))
  .resize(900, 900, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'watermark.png'))
console.log('saved watermark.png (transparent bg)')

// 5) Favicon — small emblem on navy background
await sharp(path.join(B, 'emblem.png'))
  .resize(96, 96, { fit: 'contain', background: { r: 11, g: 33, b: 53, alpha: 1 } })
  .flatten({ background: { r: 11, g: 33, b: 53 } })
  .png()
  .toFile(path.join(B, 'favicon.png'))
console.log('saved favicon.png')

console.log('Done')
