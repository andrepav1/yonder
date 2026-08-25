// Scoring + guess evaluation for the cumulative-path game. Pure, rules-driven,
// unit-tested. Each guess adds a leg (previous point → guessed city) to a
// running total that must climb into the win band [target−tol, target+tol].
// The band is two-sided, so landing a little past the target still wins.

import type { City, GuessResult, PuzzleSpec, ScoreBreakdown } from './types'
import type { GameRules } from '@/config/rules'
import { haversineKm, initialBearingDeg, type LatLng } from './geo'

/**
 * Evaluate adding `city` to the path. `from` is the previous point (the start
 * city for the first guess), `priorCumulativeKm` the running total before it.
 * The win band comes from the puzzle, so a saved round is always scored against
 * the rules it was generated under.
 */
export function evaluateLeg(
  puzzle: PuzzleSpec,
  from: LatLng,
  priorCumulativeKm: number,
  city: City,
  _rules: GameRules,
): GuessResult {
  const legKm = haversineKm(from, city)
  const cumulativeKm = priorCumulativeKm + legKm
  const remainingKm = puzzle.targetKm - cumulativeKm
  const bearingDeg = initialBearingDeg(from, city)
  // Two-sided band: anywhere within `toleranceKm` of the target wins, so a hop
  // that lands just past it is a win, not a bust.
  const won = Math.abs(remainingKm) <= puzzle.toleranceKm
  // `over` = past the far edge of the band, i.e. no longer winnable. Legs only
  // add, so this can't be undone — but it isn't a loss by itself either; the
  // round's fate is the mode's call (see `rules.overshoot`).
  const over = !won && remainingKm < 0
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
 * to 0 = far from the finish. Graded on the *absolute* miss, so a total that
 * sits 200 km past the target reads as hot — it is close — while one 4,000 km
 * short reads cold. (Overshooting used to force 0 regardless, which lied to the
 * player about how near they were; with a two-sided band and no bust, a small
 * overshoot is genuinely a near-miss.) Shared by the UI colour ramp and the
 * share squares so they agree.
 */
export type TempLevel = 0 | 1 | 2 | 3 | 4

export function tempLevel(result: GuessResult, rules: GameRules): TempLevel {
  if (result.won) return 4
  const targetKm = result.cumulativeKm + result.remainingKm
  const offFrac = targetKm > 0 ? Math.abs(result.remainingKm) / targetKm : 1
  const [hot, warm, cool] = rules.feedback.hotColdBands
  if (offFrac <= hot) return 3 // knocking on the door
  if (offFrac <= warm) return 2
  if (offFrac <= cool) return 1
  return 0 // way off — cold
}
