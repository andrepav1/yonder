// Shared, serializable domain types. Everything here is plain data (no methods,
// no class instances) so a RoundState / PuzzleSpec can be JSON-round-tripped —
// the seam that lets puzzles be precomputed server-side and, later, synced for
// multiplayer.

import type { Locale } from '@/i18n/types'

/**
 * Localized city names by locale, carrying only the names that *differ* from the
 * canonical `City.name`. A locale absent here falls back to `name` — so the
 * default English name is never duplicated, and Latin-script cities that read
 * the same in several languages (e.g. "Berlin") stay compact. Type-only import
 * of `Locale`; no runtime coupling to i18n.
 */
export type CityNames = Partial<Record<Locale, string>>

/** A city from the bundled dataset. `id` is the stable GeoNames id. */
export interface City {
  id: number
  name: string
  country: string
  /** Admin-1 region name (state/province). May be '' when unknown. */
  admin1: string
  lat: number
  lng: number
  population: number
  /**
   * Localized display names, present only for locales whose name differs from
   * `name`. Absent on cities with no translations. English always uses `name`.
   */
  names?: CityNames
}

/** A city paired with its great-circle distance from the puzzle's start city. */
export interface AnswerCity {
  city: City
  distanceKm: number
}

/**
 * Outcome of adding one guessed city to the running path. The score is
 * cumulative: each guess contributes the great-circle distance from the
 * *previous* point (the start city for the first guess) to this city, and the
 * running total climbs toward the target. Serializable.
 */
export interface GuessResult {
  city: City
  /** Distance from the previous point (start for the first guess) to this city, km. */
  legKm: number
  /** Running total of every leg through this guess, km. */
  cumulativeKm: number
  /** targetKm − cumulativeKm: distance still to cover (negative once overshot). */
  remainingKm: number
  /** Initial bearing from the previous point to this city, degrees [0,360). */
  bearingDeg: number
  /** True when the running total has overshot the target (an instant loss). */
  over: boolean
  /** True when the running total lands in [target·(1−tol), target] — a win. */
  won: boolean
}

export type RoundStatus = 'playing' | 'won' | 'lost'

/** The full state of one day's round. Plain JSON — savable + (later) syncable. */
export interface RoundState {
  date: string
  status: RoundStatus
  guesses: GuessResult[]
}

/**
 * Golf-style score breakdown for a finished (or in-progress) round. There are
 * no points — the number that matters is how few guesses reached the band.
 */
export interface ScoreBreakdown {
  won: boolean
  /** Number of guesses (hops) taken. Fewer is better on a win. */
  guessesUsed: number
  /** Final running total across all legs, km (0 with no guesses). */
  totalKm: number
  /** targetKm − totalKm: how far short (or, if negative, past) the finish. */
  remainingKm: number
  /** True when the round ended by overshooting the target. */
  overshot: boolean
}

/** A fully-specified daily puzzle. Pure output of the generator — serializable. */
export interface PuzzleSpec {
  /** UTC date string "YYYY-MM-DD" this puzzle is keyed to. */
  date: string
  /** 32-bit seed derived from `date`. */
  seed: number
  start: City
  /** Target great-circle distance from `start`, in km (rounded). */
  targetKm: number
  /** One-sided win-band width below the target, as a fraction (mirrors rules.tolerancePct). */
  tolerancePct: number
  /** The `revealCount` cities closest to the target distance. */
  answers: AnswerCity[]
  /**
   * The `exploreCount` cities closest to the target distance — the end-of-round
   * "explore" reveal set. A superset of `answers`, sorted the same way. These are
   * the single-hop wins a finished player can browse on the globe.
   */
  exploreAnswers: AnswerCity[]
  /** How many dataset cities fall inside the win band. */
  validAnswerCount: number
}
