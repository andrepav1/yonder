// Daily seeded puzzle generator. Pure + deterministic: same date + same dataset
// + same rules => identical puzzle for every player, everywhere. No I/O, no
// clock reads — the caller supplies the UTC date string.

import type { City, PuzzleSpec, AnswerCity } from './types'
import type { GameRules } from '@/config/rules'
import { defaultRules } from '@/config/rules'
import { haversineKm } from './geo'
import { rngFromString, hashString } from './prng'
import { weightedByPopulation } from './weighted'
import { allCities } from './cities'

/** UTC "YYYY-MM-DD" for a given instant (defaults to now). */
export function utcDateString(d: Date = new Date()): string {
  return d.toISOString().slice(0, 10)
}

export interface GenerateOptions {
  cities?: City[]
  rules?: GameRules
}

/**
 * Generate the puzzle for a UTC date string. Deterministic in `date`.
 *
 * Draws a population-weighted start city and a target distance in
 * [minKm, maxKm], then keeps re-drawing (advancing the seeded rng) until at
 * least `minValidAnswers` cities sit within [target·(1−tol), target] of the
 * start — cities that win in a single hop — guaranteeing every daily puzzle is
 * solvable. (Multi-hop paths only add more ways to reach the band.)
 */
export function generatePuzzle(date: string, opts: GenerateOptions = {}): PuzzleSpec {
  const rules = opts.rules ?? defaultRules
  const cities = opts.cities ?? allCities()
  const rng = rngFromString(date)

  // Precompute the start-city pool + weighted picker once.
  const pool = cities.filter((c) => c.population >= rules.startCity.minPopulation)
  if (pool.length === 0) {
    throw new Error('No cities meet startCity.minPopulation')
  }
  const pickStart = weightedByPopulation(pool, rules.startCity.weightExponent)

  const { minKm, maxKm } = rules.target
  const tol = rules.tolerancePct

  for (let attempt = 0; attempt < rules.generation.maxAttempts; attempt++) {
    const start = pickStart(rng())
    const targetKm = Math.round(minKm + rng() * (maxKm - minKm))
    // One-sided win band: a single-hop answer must be at/under the target
    // (reaching it exactly wins; going past it would overshoot and lose).
    const low = targetKm * (1 - tol)
    const high = targetKm

    const answers: AnswerCity[] = []
    let validCount = 0
    for (const c of cities) {
      if (c.id === start.id) continue
      const distanceKm = haversineKm(start, c)
      if (distanceKm >= low && distanceKm <= high) {
        validCount++
        answers.push({ city: c, distanceKm })
      }
    }

    if (validCount >= rules.generation.minValidAnswers) {
      answers.sort(
        (a, b) => Math.abs(a.distanceKm - targetKm) - Math.abs(b.distanceKm - targetKm),
      )
      return {
        date,
        seed: hashString(date),
        start,
        targetKm,
        tolerancePct: tol,
        answers: answers.slice(0, rules.generation.revealCount),
        exploreAnswers: answers.slice(0, rules.generation.exploreCount),
        validAnswerCount: validCount,
      }
    }
  }

  throw new Error(
    `Failed to generate a solvable puzzle for ${date} in ${rules.generation.maxAttempts} attempts`,
  )
}
