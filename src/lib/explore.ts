// Progressive city reveal — the pure, rules-driven part of "zoom in to see more
// cities". Given the current zoom factor, it answers: *what is the smallest
// population a city may have and still be shown?* Zoomed out → only the biggest
// cities; zoomed in → the floor eases down to the dataset minimum, so smaller
// cities appear the further you zoom. The projection-dependent bits (which of
// those cities actually fall on the near hemisphere / in the viewport) live in
// the Globe component; this stays I/O-free and unit-tested.

import type { GameRules } from '@/config/rules'

/**
 * The population floor at a given zoom: cities at/above this are eligible to be
 * shown. Interpolates **on a log scale** (population is heavy-tailed and zoom is
 * multiplicative) from `explore.zoomedOutMinPopulation` at `minZoom` down to
 * `dataset.minPopulation` at `maxZoom`. Clamped, so out-of-range zooms are safe.
 */
export function exploreMinPopulation(zoom: number, rules: GameRules): number {
  const { minZoom, maxZoom, zoomedOutMinPopulation } = rules.explore
  const floor = rules.dataset.minPopulation
  if (maxZoom <= minZoom) return floor
  const t = Math.max(0, Math.min(1, (zoom - minZoom) / (maxZoom - minZoom)))
  const hi = Math.max(zoomedOutMinPopulation, floor)
  const logPop = Math.log(hi) + (Math.log(floor) - Math.log(hi)) * t
  return Math.round(Math.exp(logPop))
}
