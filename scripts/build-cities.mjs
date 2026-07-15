// Builds the compact client-side city dataset from raw GeoNames dumps.
//
// Inputs (place these in ./data-src, or point YONDER_DATA_SRC at their folder):
//   - cities15000.txt        https://download.geonames.org/export/dump/cities15000.zip
//   - countryInfo.txt        https://download.geonames.org/export/dump/countryInfo.txt
//   - admin1CodesASCII.txt   https://download.geonames.org/export/dump/admin1CodesASCII.txt
//
// Output: src/data/cities.json  (array-of-arrays, tuple order in `fields`)
//
// Run: npm run data:build
//
// This script is the single source of truth for how the dataset is shaped.
// Keep README.md's "Data" section in sync with any change here.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const srcDir = process.env.YONDER_DATA_SRC
  ? resolve(process.env.YONDER_DATA_SRC)
  : join(repoRoot, 'data-src')
const outFile = join(repoRoot, 'src', 'data', 'cities.json')

// The single knob that decides the recognizable set. Keep in sync with
// src/config/rules.ts -> dataset.minPopulation (kept here so the build is
// self-contained and doesn't import TS).
const MIN_POPULATION = 100_000
const COORD_DECIMALS = 4 // ~11 m precision — plenty for great-circle distance

const round = (n, d) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

function loadCountryNames() {
  const text = readFileSync(join(srcDir, 'countryInfo.txt'), 'utf8')
  const map = new Map()
  for (const line of text.split('\n')) {
    if (!line || line.startsWith('#')) continue
    const cols = line.split('\t')
    const iso2 = cols[0]
    const name = cols[4]
    if (iso2 && name) map.set(iso2, name)
  }
  return map
}

function loadAdmin1Names() {
  const text = readFileSync(join(srcDir, 'admin1CodesASCII.txt'), 'utf8')
  const map = new Map()
  for (const line of text.split('\n')) {
    if (!line) continue
    const cols = line.split('\t')
    const code = cols[0] // e.g. "US.CA"
    const name = cols[1]
    if (code && name) map.set(code, name)
  }
  return map
}

function build() {
  const countryNames = loadCountryNames()
  const admin1Names = loadAdmin1Names()

  const text = readFileSync(join(srcDir, 'cities15000.txt'), 'utf8')
  const rows = []
  for (const line of text.split('\n')) {
    if (!line) continue
    const c = line.split('\t')
    const population = parseInt(c[14], 10) || 0
    if (population < MIN_POPULATION) continue

    const id = parseInt(c[0], 10)
    const name = c[1]
    const lat = round(parseFloat(c[4]), COORD_DECIMALS)
    const lng = round(parseFloat(c[5]), COORD_DECIMALS)
    const cc = c[8]
    const admin1Code = c[10]
    const country = countryNames.get(cc) || cc || ''
    const admin1 = admin1Names.get(`${cc}.${admin1Code}`) || ''

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    rows.push([id, name, country, admin1, lat, lng, population])
  }

  // Deterministic, human-friendly ordering: biggest cities first.
  rows.sort((a, b) => b[6] - a[6])

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'GeoNames cities15000',
    license: 'CC BY 4.0 (GeoNames)',
    minPopulation: MIN_POPULATION,
    fields: ['id', 'name', 'country', 'admin1', 'lat', 'lng', 'pop'],
    count: rows.length,
    cities: rows,
  }

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, JSON.stringify(payload))
  const kb = Math.round(Buffer.byteLength(JSON.stringify(payload)) / 1024)
  console.log(`Wrote ${rows.length} cities to ${outFile} (${kb} KB)`)
}

build()
