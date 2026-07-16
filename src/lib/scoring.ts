// Scoring + guess evaluation for the cumulative-path game. Pure, rules-driven,
// unit-tested. Each guess adds a leg (previous point → guessed city) to a
// running total that must climb into the win band [target·(1−tol), target]
// without overshooting.

import type { City, GuessResult, PuzzleSpec, ScoreBreakdown } from './types'
import type { GameRules } from '@/config/rules'
import { haversineKm, initialBearingDeg, type LatLng } from './geo'

/**
 * Evaluate adding `city` to the path. `from` is the previous point (the start
 * city for the first guess), `priorCumulativeKm` the running total before it.
 */
export function evaluateLeg(
  puzzle: PuzzleSpec,
  from: LatLng,
  priorCumulativeKm: number,
  city: City,
  rules: GameRules,
): GuessResult {
  const legKm = haversineKm(from, city)
  const cumulativeKm = priorCumulativeKm + legKm
  const remainingKm = puzzle.targetKm - cumulativeKm
  const bearingDeg = initialBearingDeg(from, city)
  const over = cumulativeKm > puzzle.targetKm
  // Win = inside the one-sided band below the target (never over).
  const won = !over && remainingKm <= puzzle.targetKm * rules.tolerancePct
  return { city, legKm, cumulativeKm, remainingKm, bearingDeg, over, won }
}

/**
 * Score a finished round, golf-style: what matters is `guessesUsed` on a win.
 * The final total / remaining / overshoot come from the last guess (which is
 * where the round ended).
 */
export function scoreRound(
  guesses: GuessResult[],
  won: boolean,
  _rules: GameRules,
): ScoreBreakdown {
  const guessesUsed = guesses.length
  const last = guesses[guessesUsed - 1]
  return {
    won,
    guessesUsed,
    totalKm: last?.cumulativeKm ?? 0,
    remainingKm: last?.remainingKm ?? NaN,
    overshot: last?.over ?? false,
  }
}

/**
 * Temperature level for hot/cold feedback: 4 = win (in the band, hottest) down
 * to 0 = far from the finish *or* busted (overshot). Graded by how much of the
 * journey remains, so the running total visibly heats up as it nears the
 * target. Shared by the UI colour ramp and the share squares so they agree.
 */
export type TempLevel = 0 | 1 | 2 | 3 | 4

export function tempLevel(result: GuessResult, _rules: GameRules): TempLevel {
  if (result.won) return 4
  if (result.over) return 0 // busted — overshot the target
  const targetKm = result.cumulativeKm + result.remainingKm
  const remainingFrac = targetKm > 0 ? result.remainingKm / targetKm : 1
  if (remainingFrac <= 0.08) return 3 // knocking on the door
  if (remainingFrac <= 0.2) return 2
  if (remainingFrac <= 0.45) return 1
  return 0 // barely started — cold
}
