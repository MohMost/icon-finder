// Builds src/images.json: local files + every image referenced in silwanenet and the gateway
// (deduped by id; remote candidates are verified against the server).
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs'
import { join, basename } from 'node:path'

const ROOTS = (process.env.SILWANE_SRC ??
  'C:/Users/Mohamed/projects/silwanenet/src;C:/Users/Mohamed/projects/silwane-net-gateway/src').split(';')
process.loadEnvFile()
const REMOTE = process.env.SILWANE_IMAGES_URL
const EXT = /\.(png|svg|jpe?g|gif)$/i
const KEY = /\b(?:Image|ImageId|ImageID|ImageName|Img|ImgLocal|icon|imageUrl|image|img)['"]?\s*[:=]\s*([^,;\n}]{0,160})/g
const STR = /['"`]([A-Za-z0-9_./-]{2,80})['"`]/g

const idOf = (file) => basename(file).replace(EXT, '')
const items = new Map()

for (const f of readdirSync('public/local').filter((f) => EXT.test(f)))
  items.set(idOf(f), { id: idOf(f), file: f, url: `/local/${f}`, local: true })

// candidate paths relative to REMOTE
const candidates = new Set()
const addCandidate = (ref) => {
  if (ref.includes('..') || ref.startsWith('/') || ref.startsWith('public/') || /^pi-?/.test(ref)) return
  if (items.has(idOf(ref))) return
  const file = EXT.test(ref) ? ref : ref + '.png'
  candidates.add(file)
  if (!file.includes('/')) candidates.add('Enums/' + file)
}

const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) walk(p)
    else if (/\.(tsx?|json)$/.test(name)) {
      const text = readFileSync(p, 'utf8')
      for (const m of text.matchAll(/['"`]([A-Za-z0-9_./ -]+\.(?:png|svg|jpe?g|gif))['"`]/gi)) addCandidate(m[1])
      for (const k of text.matchAll(KEY)) for (const s of k[1].matchAll(STR)) addCandidate(s[1])
    }
  }
}
ROOTS.forEach(walk)

const exists = async (path) => (await fetch(REMOTE + path, { method: 'HEAD' }).catch(() => null))?.ok
const queue = [...candidates]
const alive = []
await Promise.all(
  Array.from({ length: 24 }, async () => {
    for (let path; (path = queue.pop()); ) if (await exists(path)) alive.push(path)
  }),
)
// root files win over Enums/ duplicates
alive.sort((a, b) => a.includes('/') - b.includes('/'))
for (const path of alive) {
  const id = idOf(path)
  if (!items.has(id)) items.set(id, { id, file: basename(path), url: REMOTE + path, local: false })
}

// pixel size from the PNG/GIF header (SVG/JPEG stay null)
const size = async (i) => {
  const buf = i.local
    ? readFileSync(join("public", i.url))
    : Buffer.from(await (await fetch(i.url, { headers: { Range: "bytes=0-31" } }).catch(() => null))?.arrayBuffer?.() ?? [])
  if (buf.readUInt32BE(0) === 0x89504e47 && buf.length >= 24) return [buf.readUInt32BE(16), buf.readUInt32BE(20)]
  if (buf.toString("latin1", 0, 3) === "GIF") return [buf.readUInt16LE(6), buf.readUInt16LE(8)]
  return null
}
const sizeQueue = [...items.values()]
await Promise.all(Array.from({ length: 24 }, async () => {
  for (let i; (i = sizeQueue.pop()); ) {
    const wh = await size(i).catch(() => null)
    if (wh) [i.w, i.h] = wh
  }
}))

const list = [...items.values()].sort((a, b) => a.id.localeCompare(b.id, 'en', { sensitivity: 'base' }))
writeFileSync('src/images.json', JSON.stringify(list))
console.log(candidates.size, 'candidates ->', list.length, 'images,', list.filter((i) => i.local).length, 'local')
