// Builds the compact client-side city dataset from raw GeoNames dumps.
//
// Inputs (place these in ./data-src, or point YONDLE_DATA_SRC at their folder):
//   - cities15000.txt         https://download.geonames.org/export/dump/cities15000.zip
//   - countryInfo.txt         https://download.geonames.org/export/dump/countryInfo.txt
//   - admin1CodesASCII.txt    https://download.geonames.org/export/dump/admin1CodesASCII.txt
//   - alternateNamesV2.txt    https://download.geonames.org/export/dump/alternateNamesV2.zip
//     (optional — enables localized city names; absent = English-only dataset)
//
// Output: src/data/cities.json  (array-of-arrays, tuple order in `fields`)
//
// Run: npm run data:build
//
// This script is the single source of truth for how the dataset is shaped.
// Keep README.md's "Data" section in sync with any change here.
//
// `selectAlternateNames` is exported so `enrich-cities.mjs` can attach/refresh
// translations onto an already-built dataset without re-downloading the base
// dumps.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { createReadStream } from 'node:fs'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const repoRoot = resolve(__dirname, '..')
const srcDir = process.env.YONDLE_DATA_SRC
  ? resolve(process.env.YONDLE_DATA_SRC)
  : join(repoRoot, 'data-src')
const outFile = join(repoRoot, 'src', 'data', 'cities.json')

// The single knob that decides the recognizable set. Keep in sync with
// src/config/rules.ts -> dataset.minPopulation (kept here so the build is
// self-contained and doesn't import TS).
const MIN_POPULATION = 100_000
const COORD_DECIMALS = 4 // ~11 m precision — plenty for great-circle distance

// Locales we ship translations for. Mirrors src/i18n/types.ts `Locale`, minus
// 'en': English display always uses the canonical `name`, so an English alt-name
// would be redundant and is never stored.
export const TRANSLATED_LOCALES = ['fr', 'it', 'es', 'zh', 'pt', 'de', 'ja', 'ko']

const round = (n, d) => {
  const f = 10 ** d
  return Math.round(n * f) / f
}

/**
 * Stream GeoNames `alternateNamesV2.txt` and pick, for each requested city id,
 * the best name per translated locale. "Best" = an official/preferred name
 * first, then the shortest candidate; colloquial ("Big Apple") and historic
 * ("Bombay") variants are skipped. Names identical to the city's canonical
 * `baseNames[id]` are dropped so only genuine translations are stored.
 *
 * @param {string} altPath  path to alternateNamesV2.txt
 * @param {Map<number,string>} baseNames  id -> canonical name (the drop key)
 * @returns {Promise<Map<number, Record<string,string>>>} id -> { locale: name }
 */
export async function selectAlternateNames(altPath, baseNames) {
  const locales = new Set(TRANSLATED_LOCALES)
  // id -> locale -> { name, pref, len } best-so-far
  const picks = new Map()
  const rl = createInterface({
    input: createReadStream(altPath),
    crlfDelay: Infinity,
  })
  for await (const line of rl) {
    if (!line) continue
    const c = line.split('\t')
    const id = parseInt(c[1], 10)
    if (!baseNames.has(id)) continue
    const lang = c[2]
    if (!locales.has(lang)) continue
    if (c[6] === '1' || c[7] === '1') continue // isColloquial / isHistoric
    const name = c[3]
    if (!name) continue
    const pref = c[4] === '1'
    let byLang = picks.get(id)
    if (!byLang) {
      byLang = new Map()
      picks.set(id, byLang)
    }
    const cur = byLang.get(lang)
    // Prefer official/preferred names; break ties by shorter (cleaner) form.
    const better =
      !cur || (pref && !cur.pref) || (pref === cur.pref && name.length < cur.len)
    if (better) byLang.set(lang, { name, pref, len: name.length })
  }

  const out = new Map()
  for (const [id, byLang] of picks) {
    const base = baseNames.get(id)
    const names = {}
    for (const [lang, v] of byLang) {
      if (v.name === base) continue // identical to canonical name -> redundant
      names[lang] = v.name
    }
    if (Object.keys(names).length > 0) out.set(id, names)
  }
  return out
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

async function build() {
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

  // Optional localized-names enrichment. The tuple gains an 8th element (a
  // { locale: name } map) only for cities that actually have translations.
  const altPath = join(srcDir, 'alternateNamesV2.txt')
  let translated = 0
  if (existsSync(altPath)) {
    const baseNames = new Map(rows.map((r) => [r[0], r[1]]))
    const names = await selectAlternateNames(altPath, baseNames)
    for (const r of rows) {
      const n = names.get(r[0])
      if (n) {
        r[7] = n
        translated++
      }
    }
    console.log(`Attached translations to ${translated}/${rows.length} cities`)
  } else {
    console.log(`No alternateNamesV2.txt in ${srcDir} — building English-only`)
  }

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'GeoNames cities15000 + alternateNamesV2',
    license: 'CC BY 4.0 (GeoNames)',
    minPopulation: MIN_POPULATION,
    fields: ['id', 'name', 'country', 'admin1', 'lat', 'lng', 'pop', 'names'],
    count: rows.length,
    translatedCount: translated,
    cities: rows,
  }

  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, JSON.stringify(payload))
  const kb = Math.round(Buffer.byteLength(JSON.stringify(payload)) / 1024)
  console.log(`Wrote ${rows.length} cities to ${outFile} (${kb} KB)`)
}

// Only run when invoked directly (not when imported by enrich-cities.mjs).
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  build()
}
