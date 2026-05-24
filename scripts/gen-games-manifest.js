import { readdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dir = join(__dirname, '../public/games')
const files = readdirSync(dir).filter(f => /\.html?$/i.test(f)).sort()
writeFileSync(join(dir, 'manifest.json'), JSON.stringify(files, null, 2))
console.log(`Wrote ${files.length} games to manifest.json`)
