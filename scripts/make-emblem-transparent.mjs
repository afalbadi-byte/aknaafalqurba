// Build a crisp navy-blue emblem on transparent background.
// Uses the WhatsApp source's *shape* as an alpha mask, then paints it
// in the official brand navy (#0b2135) so every output stays on-brand.

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const B = path.join(__dirname, '..', 'public', 'brand')

const SRC = 'C:/Users/ahmed/Downloads/WhatsApp Image 2026-05-04 at 12.53.40.jpeg'

// Brand navy
const BR = 0x0b, BG = 0x21, BB = 0x35

// 1) Trim the black margins down to the emblem
const trimmed = await sharp(SRC)
  .trim({ background: '#000000', threshold: 20 })
  .raw()
  .toBuffer({ resolveWithObject: true })

const { data, info } = trimmed
console.log('trimmed dims:', info.width, 'x', info.height, 'channels:', info.channels)

// 2) Build the navy-on-transparent buffer.
//    Anywhere the emblem is drawn we paint pure brand navy. Black background
//    becomes fully transparent. A narrow band near black keeps a soft edge.
const ch = info.channels
const out = Buffer.alloc(info.width * info.height * 4)
for (let i = 0, j = 0; i < data.length; i += ch, j += 4) {
  const brightness = (data[i] + data[i + 1] + data[i + 2]) / 3
  // Threshold curve: pure black (<10) → 0, mid (10-40) → ramp, above 40 → 255
  let alpha
  if      (brightness < 10) alpha = 0
  else if (brightness > 40) alpha = 255
  else                      alpha = Math.round(((brightness - 10) / 30) * 255)
  out[j]     = BR
  out[j + 1] = BG
  out[j + 2] = BB
  out[j + 3] = alpha
}

// 3) Master emblem (512×512, transparent, navy fill)
await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'emblem.png'))
console.log('saved emblem.png (navy on transparent)')

// 4) Watermark — bigger emblem (still transparent + navy)
await sharp(path.join(B, 'emblem.png'))
  .resize(900, 900, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'watermark.png'))
console.log('saved watermark.png')

// 5) Favicon — just the navy emblem, no background, no text, no fill
await sharp(path.join(B, 'emblem.png'))
  .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
  .png()
  .toFile(path.join(B, 'favicon.png'))
console.log('saved favicon.png (clean navy emblem)')

console.log('Done')
