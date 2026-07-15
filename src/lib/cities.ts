// City dataset loader + fuzzy autocomplete.
//
// The dataset is a compact array-of-arrays (see scripts/build-cities.mjs). We
// hydrate it once into typed City objects and build light search indexes lazily.

import type { City } from './types'
import rawData from '@/data/cities.json'

interface RawData {
  fields: string[]
  count: number
  cities: [number, string, string, string, number, number, number][]
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
let _folded: string[] | null = null
let _countByName: Map<string, number> | null = null
let _countByNameCountry: Map<string, number> | null = null

function ensureLoaded(): void {
  if (_cities) return
  const cities: City[] = data.cities.map((r) => ({
    id: r[0],
    name: r[1],
    country: r[2],
    admin1: r[3],
    lat: r[4],
    lng: r[5],
    population: r[6],
  }))
  const folded = cities.map((c) => foldText(c.name))
  const countByName = new Map<string, number>()
  const countByNameCountry = new Map<string, number>()
  for (let i = 0; i < cities.length; i++) {
    const nf = folded[i]!
    const c = cities[i]!
    countByName.set(nf, (countByName.get(nf) ?? 0) + 1)
    const nc = `${nf}|${c.country}`
    countByNameCountry.set(nc, (countByNameCountry.get(nc) ?? 0) + 1)
  }
  _cities = cities
  _folded = folded
  _countByName = countByName
  _countByNameCountry = countByNameCountry
}

/** All cities, biggest-population first (as built). */
export function allCities(): City[] {
  ensureLoaded()
  return _cities!
}

/**
 * A human-readable, disambiguated label for a city. Bare name when unique;
 * `"Name, Country"` when the name repeats; `"Name, Region, Country"` when even
 * that repeats.
 */
export function cityLabel(city: City): string {
  ensureLoaded()
  const nf = foldText(city.name)
  if (_countByName!.get(nf) === 1) return city.name
  if (_countByNameCountry!.get(`${nf}|${city.country}`) === 1) {
    return `${city.name}, ${city.country}`
  }
  return city.admin1
    ? `${city.name}, ${city.admin1}, ${city.country}`
    : `${city.name}, ${city.country}`
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

/**
 * Ranked autocomplete. Prefix matches beat substring matches beat fuzzy (typo)
 * matches; ties break by population. Returns at most `limit` results.
 */
export function search(query: string, limit = 8): SearchResult[] {
  ensureLoaded()
  const q = foldText(query)
  if (!q) return []

  const cities = _cities!
  const folded = _folded!
  type Scored = { i: number; rank: number; pop: number }
  const scored: Scored[] = []

  for (let i = 0; i < cities.length; i++) {
    const nf = folded[i]!
    let rank: number
    if (nf === q) rank = 0
    else if (nf.startsWith(q)) rank = 1
    else if (nf.includes(q)) rank = 2
    else continue
    scored.push({ i, rank, pop: cities[i]!.population })
  }

  // Typo tolerance: only fall back to fuzzy when nothing matched directly.
  if (scored.length === 0 && q.length >= 3) {
    const maxDist = q.length <= 5 ? 1 : 2
    for (let i = 0; i < cities.length; i++) {
      const d = boundedLevenshtein(q, folded[i]!, maxDist)
      if (d <= maxDist) scored.push({ i, rank: 3 + d, pop: cities[i]!.population })
    }
  }

  scored.sort((a, b) => a.rank - b.rank || b.pop - a.pop)
  return scored.slice(0, limit).map((s) => ({
    city: cities[s.i]!,
    label: cityLabel(cities[s.i]!),
  }))
}

/**
 * Resolve free-text input to a single city (best match) or null. This is the
 * "free text + fuzzy" behaviour: whatever the player typed maps to the top
 * ranked result.
 */
export function resolveGuess(query: string): City | null {
  const results = search(query, 1)
  return results.length ? results[0]!.city : null
}
