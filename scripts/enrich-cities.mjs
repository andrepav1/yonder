// Attach (or refresh) localized city names on an already-built src/data/cities.json.
//
// Use this when you want to add/update translations without re-downloading the
// three base GeoNames dumps that scripts/build-cities.mjs needs — you only need
// the alternate-names dump:
//
//   alternateNamesV2.txt   https://download.geonames.org/export/dump/alternateNamesV2.zip
//
// Point it at that file and it rewrites cities.json in place, replacing any
// existing `names` maps with a freshly-selected set (same selection rules as the
// full build — see selectAlternateNames in build-cities.mjs).
//
// Run: npm run data:enrich -- /path/to/alternateNamesV2.txt
//      (or set YONDLE_ALTNAMES to the path)

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'
import { selectAlternateNames } from './build-cities.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const citiesFile = join(repoRoot, 'src', 'data', 'cities.json')

const altPath = process.argv[2] || process.env.YONDLE_ALTNAMES
if (!altPath) {
  console.error(
    'Usage: node scripts/enrich-cities.mjs <alternateNamesV2.txt>\n' +
      '   or: YONDLE_ALTNAMES=<path> npm run data:enrich',
  )
  process.exit(1)
}

async function enrich() {
  const data = JSON.parse(readFileSync(citiesFile, 'utf8'))
  const baseNames = new Map(data.cities.map((r) => [r[0], r[1]]))
  const names = await selectAlternateNames(resolve(altPath), baseNames)

  let translated = 0
  for (const r of data.cities) {
    // Drop any previous 8th element, then re-attach a fresh map when present.
    r.length = 7
    const n = names.get(r[0])
    if (n) {
      r[7] = n
      translated++
    }
  }

  data.source = 'GeoNames cities15000 + alternateNamesV2'
  if (!data.fields.includes('names')) data.fields = [...data.fields, 'names']
  data.translatedCount = translated
  data.enrichedAt = new Date().toISOString()

  writeFileSync(citiesFile, JSON.stringify(data))
  const kb = Math.round(Buffer.byteLength(JSON.stringify(data)) / 1024)
  console.log(
    `Enriched ${translated}/${data.cities.length} cities with translations ` +
      `-> ${citiesFile} (${kb} KB)`,
  )
}

enrich()
