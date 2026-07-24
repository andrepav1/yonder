// Attaches the national-capital flag to an already-built src/data/cities.json
// WITHOUT a full rebuild — the cheap analogue of enrich-cities.mjs for capitals.
// It reads cities15000.txt purely for the `PPLC` feature code (which the compact
// dataset doesn't carry), intersects it with the ids already in cities.json, and
// writes the result as the top-level `capitals` id array. Translations and every
// other field are left untouched.
//
// Run: npm run data:capitals -- <path/to/cities15000.txt>

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { collectCapitalIds } from './build-cities.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outFile = join(resolve(__dirname, '..'), 'src', 'data', 'cities.json')

const citiesTxt = process.argv[2]
if (!citiesTxt) {
  console.error('usage: node scripts/enrich-capitals.mjs <cities15000.txt>')
  process.exit(1)
}

const pplc = collectCapitalIds(resolve(citiesTxt))
const payload = JSON.parse(readFileSync(outFile, 'utf8'))
const datasetIds = new Set(payload.cities.map((r) => r[0]))
const capitals = [...pplc].filter((id) => datasetIds.has(id)).sort((a, b) => a - b)

payload.capitalCount = capitals.length
payload.capitals = capitals
writeFileSync(outFile, JSON.stringify(payload))
console.log(`Attached ${capitals.length} capitals to ${outFile}`)
