import { describe, it, expect } from 'vitest'
import { findCompletions } from './reveal'
import { generatePuzzle } from './puzzle'
import { haversineKm } from './geo'
import { defaultRules } from '@/config/rules'
import { allCities } from './cities'

const rules = defaultRules
const cities = allCities()

describe('findCompletions', () => {
  it('returns cities whose next hop lands the total in the win band', () => {
    const puzzle = generatePuzzle('2026-07-15')
    // Player has covered nothing yet: complete straight from the start.
    const out = findCompletions(puzzle, puzzle.start!, 0, cities, rules, 20)
    expect(out.length).toBeGreaterThan(0)
    for (const { city, distanceKm } of out) {
      const total = 0 + distanceKm
      expect(total).toBeGreaterThanOrEqual(puzzle.targetKm * (1 - rules.tolerancePct))
      expect(total).toBeLessThanOrEqual(puzzle.targetKm)
      // The leg distance we report matches the great-circle from `from`.
      expect(distanceKm).toBeCloseTo(haversineKm(puzzle.start!, city), 6)
    }
  })

  it('measures the leg from the stopping point, not the start', () => {
    const puzzle = generatePuzzle('2026-07-15')
    const mid = puzzle.targetKm * 0.6
    // Pretend the player sits at their first explore answer having covered `mid`.
    const from = puzzle.exploreAnswers[0]!.city
    const out = findCompletions(puzzle, from, mid, cities, rules, 20)
    for (const { city, distanceKm } of out) {
      expect(distanceKm).toBeCloseTo(haversineKm(from, city), 6)
      const total = mid + distanceKm
      expect(total).toBeLessThanOrEqual(puzzle.targetKm + 1e-6)
      expect(total).toBeGreaterThanOrEqual(puzzle.targetKm * (1 - rules.tolerancePct) - 1e-6)
    }
  })

  it('is empty once the target is reached or overshot', () => {
    const puzzle = generatePuzzle('2026-07-15')
    expect(findCompletions(puzzle, puzzle.start!, puzzle.targetKm, cities, rules, 20)).toEqual([])
    expect(
      findCompletions(puzzle, puzzle.start!, puzzle.targetKm * 1.5, cities, rules, 20),
    ).toEqual([])
  })

  it('excludes the start, the from-city, and any excluded ids', () => {
    const puzzle = generatePuzzle('2026-07-15')
    const exclude = new Set([puzzle.exploreAnswers[0]!.city.id])
    const out = findCompletions(puzzle, puzzle.start!, 0, cities, rules, 50, exclude)
    for (const { city } of out) {
      expect(city.id).not.toBe(puzzle.start!.id)
      expect(exclude.has(city.id)).toBe(false)
    }
  })

  it('honours the limit and sorts closest-to-a-perfect-landing first', () => {
    const puzzle = generatePuzzle('2026-07-15')
    const out = findCompletions(puzzle, puzzle.start!, 0, cities, rules, 5)
    expect(out.length).toBeLessThanOrEqual(5)
    const errs = out.map((a) => Math.abs(a.distanceKm - puzzle.targetKm))
    for (let i = 1; i < errs.length; i++) expect(errs[i]!).toBeGreaterThanOrEqual(errs[i - 1]!)
  })
})
