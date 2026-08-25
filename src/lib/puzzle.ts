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
 * Draws a country-balanced, population-weighted start city and a target
 * distance in [minKm, maxKm], then keeps re-drawing (advancing the seeded rng)
 * until the day is both **solvable** (at least `minValidAnswers` cities sit
 * inside the win band around the start — cities that win in a single hop) and
 * **guessable** (at least `minFamousAnswers` of them are recognizable). Multi-
 * hop paths only add more ways to reach the band.
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
  const pickStart = weightedByPopulation(
    pool,
    rules.startCity.weightExponent,
    rules.startCity.countryBalance,
  )

  const { minKm, maxKm } = rules.target
  const toleranceKm = rules.toleranceKm
  const { minValidAnswers, minFamousAnswers, famousPopulation } = rules.generation

  for (let attempt = 0; attempt < rules.generation.maxAttempts; attempt++) {
    const start = pickStart(rng())
    const targetKm = Math.round(minKm + rng() * (maxKm - minKm))
    // Two-sided win band: landing a little past the target wins too, so a hop
    // that slightly overshoots is a win rather than a bust.
    const low = targetKm - toleranceKm
    const high = targetKm + toleranceKm

    const answers: AnswerCity[] = []
    let famousCount = 0
    for (const c of cities) {
      if (c.id === start.id) continue
      const distanceKm = haversineKm(start, c)
      if (distanceKm >= low && distanceKm <= high) {
        answers.push({ city: c, distanceKm })
        if (c.population >= famousPopulation) famousCount++
      }
    }

    if (answers.length >= minValidAnswers && famousCount >= minFamousAnswers) {
      // Every city in the band wins equally, so there's nothing to gain from
      // revealing the ones that land most precisely on the target — that just
      // surfaced 200k-population towns nobody could have named. Pick the most
      // *recognizable* winners instead (the reveal is the "learn the map"
      // layer), then order the chosen set closest-to-target for display.
      const revealed = answers
        .slice()
        .sort((a, b) => b.city.population - a.city.population)
        .slice(0, rules.generation.exploreCount)
      revealed.sort(
        (a, b) => Math.abs(a.distanceKm - targetKm) - Math.abs(b.distanceKm - targetKm),
      )
      return {
        date,
        seed: hashString(date),
        start,
        targetKm,
        toleranceKm,
        answers: revealed.slice(0, rules.generation.revealCount),
        exploreAnswers: revealed,
        validAnswerCount: answers.length,
      }
    }
  }

  throw new Error(
    `Failed to generate a solvable puzzle for ${date} in ${rules.generation.maxAttempts} attempts`,
  )
}
