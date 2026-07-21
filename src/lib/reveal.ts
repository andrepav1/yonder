// End-of-round "learning" reveal helpers. Pure + rules-driven.
//
// Layer 1 (the ideal single-hop wins closest to the target) is precomputed in
// the puzzle as `exploreAnswers`. This module owns Layer 2: given where the
// player actually *stopped*, which cities would have completed the run in one
// more hop? That's the personal near-miss — "you were one city away" — so it
// depends on the played round and can't live in the (seed-only) PuzzleSpec.

import type { AnswerCity, City, PuzzleSpec } from './types'
import type { GameRules } from '@/config/rules'
import { haversineKm } from './geo'

/**
 * Cities that would land the running total inside the win band in exactly one
 * more hop from `from` (the player's last city, or the start when they never
 * guessed), given `cumulativeKm` already covered.
 *
 * Returns the `limit` closest-to-a-perfect-landing cities, each paired with the
 * leg distance *from `from`* (not from the start). Empty when the player has
 * already reached or overshot the target — there's nothing left to complete.
 *
 * `excludeIds` skips the start city and any city already on the path, so the
 * reveal only shows moves the player could still have made.
 */
export function findCompletions(
  puzzle: PuzzleSpec,
  from: City,
  cumulativeKm: number,
  cities: City[],
  rules: GameRules,
  limit: number,
  excludeIds: ReadonlySet<number> = new Set(),
): AnswerCity[] {
  // The leg from `from` must carry the total into [target·(1−tol), target].
  const high = puzzle.targetKm - cumulativeKm // exact landing on the target
  const low = puzzle.targetKm * (1 - rules.tolerancePct) - cumulativeKm
  // Already in the band or past it: no next hop can complete the run.
  if (high <= 0) return []

  const found: AnswerCity[] = []
  for (const c of cities) {
    if (c.id === from.id || excludeIds.has(c.id)) continue
    const distanceKm = haversineKm(from, c)
    if (distanceKm >= low && distanceKm <= high) found.push({ city: c, distanceKm })
  }

  // Closest to a perfect landing (the target) first — the most satisfying wins.
  found.sort((a, b) => Math.abs(a.distanceKm - high) - Math.abs(b.distanceKm - high))
  return found.slice(0, limit)
}
