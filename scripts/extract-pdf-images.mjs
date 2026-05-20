// Extract embedded images from PDF brand assets so we can use them on the web.
// Run: node scripts/extract-pdf-images.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'brand')
fs.mkdirSync(OUT, { recursive: true })

const sources = [
  { in: 'C:/Users/ahmed/Downloads/Stamp.pdf',          out: 'logo-full.png' },
  { in: 'C:/Users/ahmed/Downloads/Stamp (1).pdf',      out: 'stamp.png' },
  { in: 'C:/Users/ahmed/Downloads/A4 Letterhead .pdf', out: 'letterhead-source.png' },
]

async function extract(srcPath, outName) {
  if (!fs.existsSync(srcPath)) { console.log(`skip ${srcPath}`); return }
  const data = new Uint8Array(fs.readFileSync(srcPath))
  const doc  = await pdfjs.getDocument({ data, useSystemFonts: true, disableFontFace: true }).promise
  const page = await doc.getPage(1)
  const ops  = await page.getOperatorList()
  let found = 0
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i]
    // paintImageXObject (85) or paintJpegXObject (82)
    if (fn === pdfjs.OPS.paintImageXObject || fn === pdfjs.OPS.paintJpegXObject) {
      const imgName = ops.argsArray[i][0]
      try {
        const img = await new Promise(res => {
          page.objs.get(imgName, res)
        })
        if (!img) continue
        const { width, height, kind, data: pixels } = img
        // kind: 1=GRAYSCALE_1BPP, 2=RGB_24BPP, 3=RGBA_32BPP
        let png
        if (pixels && (kind === 2 || kind === 3)) {
          // Convert raw RGB(A) pixels to PNG via simple PNG encoder
          png = await encodePNG(pixels, width, height, kind === 3)
        }
        if (png) {
          const fname = found === 0 ? outName : outName.replace(/\.png$/, `-${found}.png`)
          fs.writeFileSync(path.join(OUT, fname), png)
          console.log('saved', fname, `${width}x${height}`)
          found++
        }
      } catch (e) { console.warn('img err', imgName, e.message) }
    }
  }
  if (!found) console.log(`no images found in ${srcPath}`)
}

// Minimal PNG encoder (uncompressed) using zlib
import zlib from 'node:zlib'
async function encodePNG(rgba, w, h, hasAlpha) {
  // Convert to RGBA if RGB
  let data
  if (hasAlpha) {
    data = Buffer.from(rgba)
  } else {
    data = Buffer.alloc(w * h * 4)
    for (let i = 0, j = 0; i < rgba.length; i += 3, j += 4) {
      data[j]   = rgba[i]
      data[j+1] = rgba[i+1]
      data[j+2] = rgba[i+2]
      data[j+3] = 255
    }
  }
  // Add per-row filter byte (0 = none)
  const filtered = Buffer.alloc(h * (w * 4 + 1))
  for (let y = 0; y < h; y++) {
    filtered[y * (w * 4 + 1)] = 0
    data.copy(filtered, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4)
  }
  const compressed = zlib.deflateSync(filtered)

  const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
    const t = Buffer.from(type)
    const crc = Buffer.alloc(4)
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0)
    return Buffer.concat([len, t, data, crc])
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4)
  ihdr[8] = 8   // bit depth
  ihdr[9] = 6   // RGBA
  return Buffer.concat([SIG, chunk('IHDR', ihdr), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))])
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    t[n] = c
  }
  return t
})()
function crc32(buf) {
  let c = 0xffffffff
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

for (const s of sources) {
  await extract(s.in, s.out).catch(e => console.error(s.in, e.message))
}
console.log('Done')
