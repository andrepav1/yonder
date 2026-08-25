import { describe, it, expect } from 'vitest'
import { weightedByPopulation } from './weighted'

const pool = [{ population: 100 }, { population: 300 }, { population: 600 }]

describe('weightedByPopulation', () => {
  it('maps r to a pool member by cumulative weight, deterministically', () => {
    const pick = weightedByPopulation(pool, 1)
    // total = 1000; band boundaries at 100 and 400.
    expect(pick(0)).toBe(pool[0])
    expect(pick(0.05)).toBe(pool[0]) // 50 < 100
    expect(pick(0.2)).toBe(pool[1]) // 200 ∈ [100, 400)
    expect(pick(0.5)).toBe(pool[2]) // 500 ∈ [400, 1000)
    expect(pick(0.999)).toBe(pool[2])
  })

  it('favours larger populations at exponent 1', () => {
    const pick = weightedByPopulation(pool, 1)
    const counts = [0, 0, 0]
    for (let i = 0; i < 10000; i++) {
      const idx = pool.indexOf(pick(i / 10000))
      counts[idx] = (counts[idx] ?? 0) + 1
    }
    // 100 : 300 : 600 ⇒ roughly 10% : 30% : 60%.
    expect(counts[2]!).toBeGreaterThan(counts[1]!)
    expect(counts[1]!).toBeGreaterThan(counts[0]!)
  })

  it('flattens to uniform at exponent 0', () => {
    const pick = weightedByPopulation(pool, 0) // every weight = 1, equal thirds
    expect(pick(0.1)).toBe(pool[0])
    expect(pick(0.5)).toBe(pool[1])
    expect(pick(0.9)).toBe(pool[2])
  })
})

describe('weightedByPopulation — countryBalance', () => {
  // One country crowds the pool with many equal cities; another has a single
  // city of the same size. Population weight alone hands the crowded country
  // ~80% of picks purely on member count — the China problem in miniature.
  const crowded = Array.from({ length: 4 }, () => ({
    population: 100,
    country: 'Crowded',
  }))
  const skewed = [...crowded, { population: 100, country: 'Lonely' }]

  const shareOfLonely = (countryBalance: number) => {
    const pick = weightedByPopulation(skewed, 1, countryBalance)
    let hits = 0
    for (let i = 0; i < 10000; i++) if (pick(i / 10000).country === 'Lonely') hits++
    return hits / 10000
  }

  it('leaves the split on raw population when off', () => {
    expect(shareOfLonely(0)).toBeCloseTo(0.2, 2)
  })

  it('equalizes countries at 1', () => {
    // Crowded's four cities each carry 1/4 weight ⇒ the two countries tie.
    expect(shareOfLonely(1)).toBeCloseTo(0.5, 2)
  })

  it('lands between the two at the default 0.5', () => {
    const share = shareOfLonely(0.5)
    expect(share).toBeGreaterThan(0.2)
    expect(share).toBeLessThan(0.5)
  })

  it('is unaffected when every member has its own country', () => {
    const distinct = [
      { population: 100, country: 'A' },
      { population: 300, country: 'B' },
      { population: 600, country: 'C' },
    ]
    const balanced = weightedByPopulation(distinct, 1, 0.5)
    const plain = weightedByPopulation(distinct, 1)
    for (const r of [0, 0.05, 0.2, 0.5, 0.999]) expect(balanced(r)).toBe(plain(r))
  })
})
