// Render the brand PDFs into high-res PNGs for use on the web.
// Run: node scripts/render-pdfs.mjs

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createCanvas } from '@napi-rs/canvas'
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT = path.join(__dirname, '..', 'public', 'brand')
fs.mkdirSync(OUT, { recursive: true })

// pdfjs needs a fake DOM bit
globalThis.DOMMatrix = class {
  constructor(init) {
    if (Array.isArray(init)) { [this.a, this.b, this.c, this.d, this.e, this.f] = init }
    else Object.assign(this, init || { a:1, b:0, c:0, d:1, e:0, f:0 })
  }
}

const sources = [
  { in: 'C:/Users/ahmed/Downloads/Stamp.pdf',          out: 'logo-full.png',  scale: 4 },
  { in: 'C:/Users/ahmed/Downloads/Stamp (1).pdf',      out: 'stamp.png',      scale: 4 },
  { in: 'C:/Users/ahmed/Downloads/A4 Letterhead .pdf', out: 'letterhead.png', scale: 2 },
]

async function render(srcPath, outName, scale) {
  if (!fs.existsSync(srcPath)) { console.log(`skip ${srcPath}`); return }
  const data = new Uint8Array(fs.readFileSync(srcPath))
  const doc  = await pdfjs.getDocument({ data, useSystemFonts: true, isEvalSupported: false }).promise
  const page = await doc.getPage(1)
  const vp   = page.getViewport({ scale })
  const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height))
  const ctx = canvas.getContext('2d')
  await page.render({ canvasContext: ctx, viewport: vp, canvas }).promise
  const buf = canvas.toBuffer('image/png')
  fs.writeFileSync(path.join(OUT, outName), buf)
  console.log('saved', outName, `${vp.width}x${vp.height}`)
}

for (const s of sources) {
  try { await render(s.in, s.out, s.scale) }
  catch (e) { console.error(s.in, e.message) }
}
console.log('Done')
