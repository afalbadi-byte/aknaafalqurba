// Build a dark-bg variant of the logo (logo-white.png):
//   - Navy ink (calligraphy + ALBadi Family + emblem) → white
//   - Gold accents in the calligraphy → kept gold
//   - White paper background → transparent

import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const B = path.join(__dirname, '..', 'public', 'brand')

const SRC = 'C:/Users/ahmed/Downloads/WhatsApp Image 2026-05-04 at 12.53.40 (2).jpeg'

// Brand gold
const GR = 0xb8, GG = 0x93, GB = 0x4b

// Read raw RGB(A) from the source after trimming the white paper margins
const trimmed = await sharp(SRC)
  .trim({ background: '#ffffff', threshold: 10 })
  .raw()
  .toBuffer({ resolveWithObject: true })

const { data, info } = trimmed
console.log('trimmed dims:', info.width, 'x', info.height, 'channels:', info.channels)

const ch = info.channels
const out = Buffer.alloc(info.width * info.height * 4)
for (let i = 0, j = 0; i < data.length; i += ch, j += 4) {
  const r = data[i], g = data[i + 1], b = data[i + 2]
  const brightness = (r + g + b) / 3

  // Skip pure white (paper background) → fully transparent
  if (brightness > 245) {
    out[j + 3] = 0
    continue
  }

  // Alpha follows ink density: dark ink = solid, light ink edges = soft
  // Map brightness 0..240 → alpha 255..0 (so darker = more visible)
  const alpha = Math.min(255, Math.max(0, Math.round((1 - brightness / 245) * 320)))

  // Distinguish gold from navy: gold pixels have noticeably more red than blue
  const isGold = (r - b) > 25 && r > 100

  if (isGold) {
    // Keep brand gold
    out[j]     = GR
    out[j + 1] = GG
    out[j + 2] = GB
  } else {
    // Navy ink → white (for use on dark backgrounds)
    out[j]     = 255
    out[j + 1] = 255
    out[j + 2] = 255
  }
  out[j + 3] = alpha
}

await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
  .png({ compressionLevel: 9 })
  .toFile(path.join(B, 'logo-white.png'))
console.log('saved logo-white.png')
