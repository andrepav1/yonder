// City dataset loader + fuzzy autocomplete.
//
// The dataset is a compact array-of-arrays (see scripts/build-cities.mjs). We
// hydrate it once into typed City objects and build light search indexes lazily.

import type { City, CityNames } from './types'
import type { Locale } from '@/i18n/types'
import rawData from '@/data/cities.json'

/**
 * A dataset row is the compact tuple built by `scripts/build-cities.mjs`. The
 * optional 8th element is the localized-names map, present only when the city
 * has at least one name that differs from its canonical `name`.
 */
type RawCity = [number, string, string, string, number, number, number, CityNames?]

interface RawData {
  fields: string[]
  count: number
  cities: RawCity[]
  /** Ids of national capitals (GeoNames PPLC). Absent on older builds. */
  capitals?: number[]
}

const data = rawData as unknown as RawData

/** Fold accents + lowercase for accent/case-insensitive matching. */
export function foldText(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

let _cities: City[] | null = null
let _capitals: City[] | null = null
/**
 * Per-city folded search terms: the canonical name plus every localized name.
 * Matching is locale-agnostic on purpose — a player may type "London",
 * "Londres" or "ロンドン" and reach the same city whatever the UI language.
 */
let _terms: string[][] | null = null
let _countByNameCountry: Map<string, number> | null = null

function ensureLoaded(): void {
  if (_cities) return
  const capitalIds = new Set(data.capitals ?? [])
  const cities: City[] = data.cities.map((r) => {
    const city: City = {
      id: r[0],
      name: r[1],
      country: r[2],
      admin1: r[3],
      lat: r[4],
      lng: r[5],
      population: r[6],
    }
    if (r[7] && Object.keys(r[7]).length > 0) city.names = r[7]
    if (capitalIds.has(r[0])) city.capital = true
    return city
  })
  const terms = cities.map((c) => {
    const set = new Set<string>([foldText(c.name)])
    if (c.names) {
      for (const localized of Object.values(c.names)) {
        if (localized) set.add(foldText(localized))
      }
    }
    return [...set]
  })
  const countByNameCountry = new Map<string, number>()
  for (let i = 0; i < cities.length; i++) {
    const c = cities[i]!
    const nc = `${foldText(c.name)}|${c.country}`
    countByNameCountry.set(nc, (countByNameCountry.get(nc) ?? 0) + 1)
  }
  _cities = cities
  _terms = terms
  _countByNameCountry = countByNameCountry
}

/** All cities, biggest-population first (as built). */
export function allCities(): City[] {
  ensureLoaded()
  return _cities!
}

/** Whether a city is a national capital (GeoNames PPLC). */
export function isCapital(city: City): boolean {
  return city.capital === true
}

/**
 * The national capitals in the dataset (biggest-population first), a small,
 * famous pool (~160). Powers modes like Hidden Destination whose answer set
 * must be reasoned over, not brute-forced. Memoized.
 */
export function capitals(): City[] {
  ensureLoaded()
  if (!_capitals) _capitals = _cities!.filter(isCapital)
  return _capitals
}

/**
 * The display name of a city in a given locale: its localized name when one
 * exists, else the canonical `name`. English (and any untranslated locale)
 * always yields `name`.
 */
export function localizedName(city: City, locale?: Locale): string {
  return (locale && city.names?.[locale]) || city.name
}

/**
 * A human-readable, disambiguated label for a city, in the active locale. Always
 * carries the country: `"Name, Country"`, promoted to `"Name, Region, Country"`
 * when the name repeats within that same country. The country/region qualifiers
 * stay in their dataset (English) form since those aren't translated; the
 * name/country pairing is keyed on the canonical name (a stable, locale-
 * independent key).
 */
export function cityLabel(city: City, locale?: Locale): string {
  ensureLoaded()
  const display = localizedName(city, locale)
  const nf = foldText(city.name)
  if (_countByNameCountry!.get(`${nf}|${city.country}`) === 1) {
    return `${display}, ${city.country}`
  }
  return city.admin1
    ? `${display}, ${city.admin1}, ${city.country}`
    : `${display}, ${city.country}`
}

export interface SearchResult {
  city: City
  label: string
}

/** Bounded Levenshtein distance; returns `max + 1` once it's provably exceeded. */
function boundedLevenshtein(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1
  const prev = new Array<number>(b.length + 1)
  const curr = new Array<number>(b.length + 1)
  for (let j = 0; j <= b.length; j++) prev[j] = j
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i
    let rowMin = curr[0]!
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j]! + 1, curr[j - 1]! + 1, prev[j - 1]! + cost)
      if (curr[j]! < rowMin) rowMin = curr[j]!
    }
    if (rowMin > max) return max + 1
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j]!
  }
  return prev[b.length]!
}

/** Best (lowest) direct-match rank of a query across a city's search terms. */
function bestDirectRank(terms: string[], q: string): number {
  let best = Infinity
  for (const term of terms) {
    let rank: number
    if (term === q) rank = 0
    else if (term.startsWith(q)) rank = 1
    else if (term.includes(q)) rank = 2
    else continue
    if (rank < best) best = rank
    if (best === 0) break
  }
  return best
}

/**
 * Ranked autocomplete. Prefix matches beat substring matches beat fuzzy (typo)
 * matches; ties break by population. Matching considers a city's canonical name
 * *and* all its localized names, so the same city is reachable by typing it in
 * any supported language. `locale` only controls how results are *labelled*.
 * Returns at most `limit` results.
 */
export function search(query: string, limit = 8, locale?: Locale): SearchResult[] {
  ensureLoaded()
  const q = foldText(query)
  if (!q) return []

  const cities = _cities!
  const terms = _terms!
  type Scored = { i: number; rank: number; pop: number }
  const scored: Scored[] = []

  for (let i = 0; i < cities.length; i++) {
    const rank = bestDirectRank(terms[i]!, q)
    if (rank === Infinity) continue
    scored.push({ i, rank, pop: cities[i]!.population })
  }

  // Typo tolerance: only fall back to fuzzy when nothing matched directly.
  if (scored.length === 0 && q.length >= 3) {
    const maxDist = q.length <= 5 ? 1 : 2
    for (let i = 0; i < cities.length; i++) {
      let best = maxDist + 1
      for (const term of terms[i]!) {
        const d = boundedLevenshtein(q, term, maxDist)
        if (d < best) best = d
      }
      if (best <= maxDist) scored.push({ i, rank: 3 + best, pop: cities[i]!.population })
    }
  }

  scored.sort((a, b) => a.rank - b.rank || b.pop - a.pop)
  return scored.slice(0, limit).map((s) => ({
    city: cities[s.i]!,
    label: cityLabel(cities[s.i]!, locale),
  }))
}

/**
 * Resolve free-text input to a single city (best match) or null. This is the
 * "free text + fuzzy" behaviour: whatever the player typed maps to the top
 * ranked result. Locale-agnostic — input in any supported language resolves.
 */
export function resolveGuess(query: string): City | null {
  const results = search(query, 1)
  return results.length ? results[0]!.city : null
}
