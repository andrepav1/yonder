// Shared, serializable domain types. Everything here is plain data (no methods,
// no class instances) so a RoundState / PuzzleSpec can be JSON-round-tripped —
// the seam that lets puzzles be precomputed server-side and, later, synced for
// multiplayer.

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
}

/** A city paired with its great-circle distance from the puzzle's start city. */
export interface AnswerCity {
  city: City
  distanceKm: number
}

/** Outcome of evaluating one guessed city against a puzzle. Serializable. */
export interface GuessResult {
  city: City
  /** Great-circle distance from the start city, in km. */
  distanceKm: number
  /** Signed distance from target (distanceKm − targetKm): + = too far, − = too close. */
  deltaKm: number
  /** |deltaKm| ÷ targetKm — the fraction used for win + score + temperature. */
  errorPct: number
  /** Initial bearing from the start city to this guess, degrees [0,360). */
  bearingDeg: number
  /** True when errorPct ≤ rules.tolerancePct (inside the win band). */
  won: boolean
}

export type RoundStatus = 'playing' | 'won' | 'lost'

/** The full state of one day's round. Plain JSON — savable + (later) syncable. */
export interface RoundState {
  date: string
  status: RoundStatus
  guesses: GuessResult[]
}

/** Graded score breakdown for a finished (or in-progress) round. */
export interface ScoreBreakdown {
  won: boolean
  /** base (proximity) + bonus. */
  score: number
  /** Proximity points from the best guess. */
  base: number
  /** Fewer-guesses bonus (0 unless won). */
  bonus: number
  guessesUsed: number
  /** Best (smallest) errorPct across guesses; Infinity if no guesses. */
  bestErrorPct: number
  /** Signed delta of the best guess in km (NaN if no guesses). */
  bestDeltaKm: number
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
  /** Win band half-width as a fraction of target (mirrors rules.tolerancePct). */
  tolerancePct: number
  /** The `revealCount` cities closest to the target distance. */
  answers: AnswerCity[]
  /** How many dataset cities fall inside the win band. */
  validAnswerCount: number
}
