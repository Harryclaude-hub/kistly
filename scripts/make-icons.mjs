// Erzeugt die PNG-Symbole aus derselben Geometrie wie icons/icon.svg.
// Keine Bildbibliothek noetig, damit das Repo ohne Zusatzpakete baut.
// Aufruf: node scripts/make-icons.mjs
import zlib from 'node:zlib'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// ---------------------------------------------------------------- PNG
const CRC_TABLE = (() => {
  const t = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c
  }
  return t
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body), 0)
  return Buffer.concat([len, body, crc])
}

function writePng(file, size, rgba) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8    // bit depth
  ihdr[9] = 6    // truecolour with alpha
  const raw = Buffer.alloc((size * 4 + 1) * size)
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
  fs.writeFileSync(file, png)
}

// ------------------------------------------------------------ Geometrie
const BLACK = [10, 10, 10]
const WHITE = [255, 255, 255]
const RED = [239, 68, 68]

function roundRect(x, y, x0, y0, x1, y1, r) {
  if (x < x0 || x > x1 || y < y0 || y > y1) return false
  const cx = Math.min(Math.max(x, x0 + r), x1 - r)
  const cy = Math.min(Math.max(y, y0 + r), y1 - r)
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

function circle(x, y, cx, cy, r) {
  const dx = x - cx
  const dy = y - cy
  return dx * dx + dy * dy <= r * r
}

// Liefert die Farbe in einem 512er Koordinatensystem, oder null.
function sample(x, y, opts) {
  const s = opts.inset || 0
  const k = (512 - 2 * s) / 512
  const ux = (x - s) / k
  const uy = (y - s) / k
  if (ux < 0 || ux > 512 || uy < 0 || uy > 512) return opts.pad || null

  const sw = 30
  const bg = opts.squareBg
    ? BLACK
    : roundRect(ux, uy, 0, 0, 512, 512, 116)
      ? BLACK
      : null
  if (!bg) return opts.pad || null

  // rotes Abzeichen mit schwarzem Ring
  if (circle(ux, uy, 378, 378, 54)) return RED
  if (circle(ux, uy, 378, 378, 76)) return BLACK

  // Kistenumriss
  const outer = roundRect(ux, uy, 118, 148, 394, 392, 22)
  const inner = roundRect(ux, uy, 118 + sw, 148 + sw, 394 - sw, 392 - sw, Math.max(0, 22 - sw / 2))
  if (outer && !inner) return WHITE
  // Deckelkante
  if (ux >= 118 && ux <= 394 && Math.abs(uy - 226) <= sw / 2) return WHITE
  // Mittelsteg
  if (uy >= 148 && uy <= 226 && Math.abs(ux - 256) <= sw / 2) return WHITE

  return BLACK
}

function render(size, opts = {}) {
  const buf = Buffer.alloc(size * size * 4)
  const ss = 3
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const x = ((px + (sx + 0.5) / ss) / size) * 512
          const y = ((py + (sy + 0.5) / ss) / size) * 512
          const c = sample(x, y, opts)
          if (c) { r += c[0]; g += c[1]; b += c[2]; a += 255 }
        }
      }
      const n = ss * ss
      const i = (py * size + px) * 4
      buf[i] = Math.round(r / n)
      buf[i + 1] = Math.round(g / n)
      buf[i + 2] = Math.round(b / n)
      buf[i + 3] = Math.round(a / n)
    }
  }
  return buf
}

fs.mkdirSync(OUT, { recursive: true })
const jobs = [
  ['icon-192.png', 192, {}],
  ['icon-512.png', 512, {}],
  ['maskable-512.png', 512, { squareBg: true, inset: 64, pad: BLACK }],
  ['apple-touch-icon.png', 180, { squareBg: true }],
  ['favicon-32.png', 32, {}],
  ['favicon-16.png', 16, {}],
  ['og-icon.png', 512, {}],
]
for (const [name, size, opts] of jobs) {
  writePng(path.join(OUT, name), size, render(size, opts))
  console.log('geschrieben:', name, size + 'px')
}
