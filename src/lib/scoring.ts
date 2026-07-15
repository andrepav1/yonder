// Scoring + guess evaluation. Pure, rules-driven, unit-tested.

import type { City, GuessResult, PuzzleSpec, ScoreBreakdown } from './types'
import type { GameRules } from '@/config/rules'
import { haversineKm, initialBearingDeg } from './geo'

/** Evaluate a guessed city against a puzzle (distance, delta, bearing, win). */
export function evaluateGuess(
  puzzle: PuzzleSpec,
  city: City,
  rules: GameRules,
): GuessResult {
  const distanceKm = haversineKm(puzzle.start, city)
  const deltaKm = distanceKm - puzzle.targetKm
  const errorPct = Math.abs(deltaKm) / puzzle.targetKm
  const bearingDeg = initialBearingDeg(puzzle.start, city)
  return {
    city,
    distanceKm,
    deltaKm,
    errorPct,
    bearingDeg,
    won: errorPct <= rules.tolerancePct,
  }
}

/** Proximity points for a given percent error: max at 0, linearly to 0 at the cap. */
export function proximityBase(errorPct: number, rules: GameRules): number {
  const frac = Math.max(0, 1 - errorPct / rules.score.zeroAtErrorPct)
  return Math.round(rules.score.max * frac)
}

/**
 * Score a round from its guesses. `base` comes from the best (closest) guess;
 * `bonus` rewards finishing in fewer guesses, and only applies on a win.
 */
export function scoreRound(
  guesses: GuessResult[],
  won: boolean,
  rules: GameRules,
): ScoreBreakdown {
  const guessesUsed = guesses.length
  let bestErrorPct = Infinity
  let bestDeltaKm = NaN
  for (const g of guesses) {
    if (g.errorPct < bestErrorPct) {
      bestErrorPct = g.errorPct
      bestDeltaKm = g.deltaKm
    }
  }
  const base = guessesUsed === 0 ? 0 : proximityBase(bestErrorPct, rules)
  const bonus = won ? rules.score.bonusPerUnusedGuess * (rules.guesses - guessesUsed) : 0
  return {
    won,
    score: base + bonus,
    base,
    bonus,
    guessesUsed,
    bestErrorPct,
    bestDeltaKm,
  }
}

/**
 * Temperature level for hot/cold feedback: 4 = win/bullseye (hottest) down to
 * 0 = way off (coldest). Shared by the UI colour ramp and the share squares so
 * they always agree. Thresholds are relative to the score decay cap.
 */
export type TempLevel = 0 | 1 | 2 | 3 | 4

export function tempLevel(result: GuessResult, rules: GameRules): TempLevel {
  if (result.won) return 4
  const cap = rules.score.zeroAtErrorPct // e.g. 0.5
  const e = result.errorPct
  if (e <= cap * 0.2) return 3 // within 10% of target
  if (e <= cap * 0.5) return 2 // within 25%
  if (e <= cap) return 1 // within 50%
  return 0 // beyond the cap — cold
}
