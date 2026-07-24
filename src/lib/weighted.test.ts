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
