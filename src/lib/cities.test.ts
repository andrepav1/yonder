import { describe, it, expect } from 'vitest'
import { allCities, search, resolveGuess, cityLabel, foldText } from './cities'

describe('dataset integrity', () => {
  const cities = allCities()

  it('loads a substantial, recognizable set', () => {
    expect(cities.length).toBeGreaterThan(5000)
  })

  it('every city has valid coordinates, population and names', () => {
    for (const c of cities) {
      expect(c.lat).toBeGreaterThanOrEqual(-90)
      expect(c.lat).toBeLessThanOrEqual(90)
      expect(c.lng).toBeGreaterThanOrEqual(-180)
      expect(c.lng).toBeLessThanOrEqual(180)
      expect(c.population).toBeGreaterThanOrEqual(100_000)
      expect(c.name.length).toBeGreaterThan(0)
      expect(c.country.length).toBeGreaterThan(0)
    }
  })

  it('has unique ids', () => {
    expect(new Set(cities.map((c) => c.id)).size).toBe(cities.length)
  })
})

describe('foldText', () => {
  it('strips accents and lowercases', () => {
    expect(foldText('São Paulo')).toBe('sao paulo')
    expect(foldText('Zürich')).toBe('zurich')
    expect(foldText('  MÁLAGA ')).toBe('malaga')
  })
})

describe('search', () => {
  it('finds a major city by exact name', () => {
    const top = search('paris')[0]
    expect(top?.city.name).toBe('Paris')
    expect(top?.city.country).toBe('France')
  })

  it('ranks prefix matches ahead of substring matches', () => {
    const results = search('york')
    // "York"-prefixed names should outrank "New York" (substring).
    const first = results[0]?.city.name.toLowerCase()
    expect(first?.startsWith('york')).toBe(true)
  })

  it('is accent-insensitive', () => {
    const top = search('sao paulo')[0]
    expect(top?.city.name).toBe('São Paulo')
  })

  it('is case-insensitive and prefix-friendly', () => {
    const results = search('TOK')
    expect(results.some((r) => r.city.name === 'Tokyo')).toBe(true)
  })

  it('tolerates a small typo via fuzzy fallback', () => {
    const top = search('lodnon')[0] // transposed London
    expect(top?.city.name).toBe('London')
  })

  it('returns nothing for empty input', () => {
    expect(search('')).toEqual([])
    expect(search('   ')).toEqual([])
  })

  it('respects the limit', () => {
    expect(search('a', 5).length).toBeLessThanOrEqual(5)
  })

  it('restricts matches to a supplied pool (capitals-only input)', () => {
    const berlin = allCities().find((c) => c.name === 'Berlin' && c.country === 'Germany')!
    const pool = [berlin] // pretend the allowed pool is just Berlin
    // Berlin (in the pool) resolves; Hamburg (not in the pool) is filtered out.
    expect(search('berlin', 8, undefined, pool).map((r) => r.city.id)).toContain(berlin.id)
    expect(search('hamburg', 8, undefined, pool)).toEqual([])
    expect(resolveGuess('hamburg', pool)).toBeNull()
    expect(resolveGuess('berlin', pool)?.id).toBe(berlin.id)
  })
})

describe('cityLabel disambiguation', () => {
  it('always appends the country, even for a unique name', () => {
    const paris = allCities().find((c) => c.name === 'Paris' && c.country === 'France')!
    expect(cityLabel(paris)).toBe('Paris, France')
  })

  it('appends country for a repeated name', () => {
    // "Springfield" occurs in multiple US states -> should carry region + country.
    const springfields = allCities().filter((c) => c.name === 'Springfield')
    if (springfields.length > 1) {
      for (const s of springfields) {
        expect(cityLabel(s)).toContain(s.country)
      }
    }
  })
})

describe('resolveGuess', () => {
  it('maps free text to a single best city', () => {
    expect(resolveGuess('tokyo')?.name).toBe('Tokyo')
  })

  it('returns null when nothing plausibly matches', () => {
    expect(resolveGuess('zzzzzzzzzz')).toBeNull()
  })
})
