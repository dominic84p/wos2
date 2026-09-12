import { readdirSync, statSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '../public/games')

const entries = []
const topFiles = readdirSync(dir)

for (const f of topFiles) {
  if (f === 'asset' || f === 'manifest.json') continue
  const fullPath = join(dir, f)
  const stat = statSync(fullPath)
  if (stat.isDirectory()) {
    try {
      const subFiles = readdirSync(fullPath)
      if (subFiles.includes('index.html')) {
        entries.push(`${f}/index.html`)
      } else if (subFiles.includes(`${f}.html`)) {
        entries.push(`${f}/${f}.html`)
      } else {
        const htmlFile = subFiles.find(sf => /\.html?$/i.test(sf))
        if (htmlFile) entries.push(`${f}/${htmlFile}`)
      }
    } catch {}
  } else if (/\.html?$/i.test(f)) {
    entries.push(f)
  }
}

entries.sort()
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(entries, null, 2))
console.log(`Wrote ${entries.length} games to manifest.json`)

