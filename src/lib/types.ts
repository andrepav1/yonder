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
