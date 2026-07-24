import { describe, it, expect } from 'vitest'
import { allCities, capitals, isCapital } from './cities'

const find = (name: string, country: string) =>
  allCities().find((c) => c.name === name && c.country === country)

describe('capitals dataset', () => {
  it('exposes a small, famous pool of national capitals', () => {
    const caps = capitals()
    // ~160 today; guard a sensible band so a bad rebuild (0, or the whole
    // dataset) fails loudly without being brittle to a few countries shifting.
    expect(caps.length).toBeGreaterThan(140)
    expect(caps.length).toBeLessThan(210)
    // Every entry really is flagged, and the pool is a subset of all cities.
    expect(caps.every(isCapital)).toBe(true)
    expect(caps.length).toBeLessThan(allCities().length)
  })

  it('flags known national capitals', () => {
    for (const [name, country] of [
      ['Paris', 'France'],
      ['Tokyo', 'Japan'],
      ['Canberra', 'Australia'],
      ['Cairo', 'Egypt'],
      ['Ottawa', 'Canada'],
    ] as const) {
      const city = find(name, country)
      expect(city, `${name}, ${country} in dataset`).toBeDefined()
      expect(isCapital(city!), `${name} is a capital`).toBe(true)
    }
  })

  it('does not flag famous non-capitals', () => {
    for (const [name, country] of [
      ['Sydney', 'Australia'],
      ['New York City', 'United States'],
      ['Istanbul', 'Turkey'],
      ['Rio de Janeiro', 'Brazil'],
    ] as const) {
      const city = find(name, country)
      expect(city, `${name}, ${country} in dataset`).toBeDefined()
      expect(isCapital(city!), `${name} is not a capital`).toBe(false)
    }
  })

  it('memoizes to a stable array', () => {
    expect(capitals()).toBe(capitals())
  })
})
