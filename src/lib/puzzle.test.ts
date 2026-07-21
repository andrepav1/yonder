import { describe, it, expect } from 'vitest'
import { generatePuzzle, utcDateString } from './puzzle'
import { haversineKm } from './geo'
import { defaultRules } from '@/config/rules'
import { allCities } from './cities'

// A spread of dates across the year to exercise the generator broadly.
function datesOf(year: number): string[] {
  const out: string[] = []
  const d = new Date(Date.UTC(year, 0, 1))
  while (d.getUTCFullYear() === year) {
    out.push(utcDateString(d))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

describe('generatePuzzle — determinism', () => {
  it('produces an identical puzzle for the same date', () => {
    const a = generatePuzzle('2026-07-15')
    const b = generatePuzzle('2026-07-15')
    expect(a).toEqual(b)
  })

  it('is serializable (round-trips through JSON unchanged)', () => {
    const p = generatePuzzle('2026-07-15')
    expect(JSON.parse(JSON.stringify(p))).toEqual(p)
  })

  it('generally differs across dates', () => {
    const starts = new Set(
      ['2026-01-01', '2026-03-14', '2026-07-15', '2026-11-02'].map(
        (d) => generatePuzzle(d).start.id,
      ),
    )
    expect(starts.size).toBeGreaterThan(1)
  })
})

describe('generatePuzzle — invariants over a full year', () => {
  const dates = datesOf(2026)

  it('always yields a solvable puzzle (>= minValidAnswers single-hop wins)', () => {
    for (const date of dates) {
      const p = generatePuzzle(date)
      expect(p.validAnswerCount).toBeGreaterThanOrEqual(
        defaultRules.generation.minValidAnswers,
      )
      expect(p.answers.length).toBeGreaterThan(0)
      expect(p.answers.length).toBeLessThanOrEqual(defaultRules.generation.revealCount)
    }
  })

  it('keeps the target within the configured range', () => {
    for (const date of dates) {
      const p = generatePuzzle(date)
      expect(p.targetKm).toBeGreaterThanOrEqual(defaultRules.target.minKm)
      expect(p.targetKm).toBeLessThanOrEqual(defaultRules.target.maxKm)
    }
  })

  it('only uses well-known start cities and never lists the start as an answer', () => {
    for (const date of dates) {
      const p = generatePuzzle(date)
      expect(p.start.population).toBeGreaterThanOrEqual(
        defaultRules.startCity.minPopulation,
      )
      for (const a of p.answers) expect(a.city.id).not.toBe(p.start.id)
    }
  })

  it('exposes a larger explore set that is a superset of answers, still in-band', () => {
    for (const date of dates.slice(0, 40)) {
      const p = generatePuzzle(date)
      // exploreAnswers extends answers with the same ordering.
      expect(p.exploreAnswers.length).toBeGreaterThanOrEqual(p.answers.length)
      expect(p.exploreAnswers.length).toBeLessThanOrEqual(
        defaultRules.generation.exploreCount,
      )
      for (let i = 0; i < p.answers.length; i++) {
        expect(p.exploreAnswers[i]!.city.id).toBe(p.answers[i]!.city.id)
      }
      const low = p.targetKm * (1 - p.tolerancePct)
      let prevDelta = -1
      for (const a of p.exploreAnswers) {
        const dist = haversineKm(p.start, a.city)
        expect(dist).toBeGreaterThanOrEqual(low - 0.01)
        expect(dist).toBeLessThanOrEqual(p.targetKm + 0.01)
        const delta = Math.abs(a.distanceKm - p.targetKm)
        expect(delta).toBeGreaterThanOrEqual(prevDelta - 1e-9)
        prevDelta = delta
      }
    }
  })

  it('reveals single-hop wins actually inside the band, ordered by closeness', () => {
    for (const date of dates.slice(0, 40)) {
      const p = generatePuzzle(date)
      const low = p.targetKm * (1 - p.tolerancePct)
      const high = p.targetKm // one-sided: a single-hop win is never over target
      let prevDelta = -1
      for (const a of p.answers) {
        const dist = haversineKm(p.start, a.city)
        expect(dist).toBeGreaterThanOrEqual(low - 0.01)
        expect(dist).toBeLessThanOrEqual(high + 0.01)
        expect(a.distanceKm).toBeCloseTo(dist, 6)
        const delta = Math.abs(a.distanceKm - p.targetKm)
        expect(delta).toBeGreaterThanOrEqual(prevDelta - 1e-9)
        prevDelta = delta
      }
    }
  })
})

describe('generatePuzzle — rules are honoured', () => {
  it('respects a custom tolerance and target range', () => {
    const cities = allCities()
    const rules = {
      ...defaultRules,
      tolerancePct: 0.1,
      target: { minKm: 500, maxKm: 600 },
    }
    const p = generatePuzzle('2026-07-15', { cities, rules })
    expect(p.tolerancePct).toBe(0.1)
    expect(p.targetKm).toBeGreaterThanOrEqual(500)
    expect(p.targetKm).toBeLessThanOrEqual(600)
  })
})
