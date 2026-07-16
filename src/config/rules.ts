// Yondle — declarative game rules.
//
// This is THE place to tune the game. Every pure module (geo, puzzle, scoring,
// share, engine) takes a `GameRules` value as input and hard-codes nothing, so
// changing a number here changes the whole game with no logic edits.
//
// Keep README.md's "How it works" table in sync when you change these.

export interface GameRules {
  /** Number of guesses (hops) a player gets per round. */
  guesses: number
  /**
   * Win band width as a fraction of the target, applied **below** the target
   * only (0.02 = the running total must land in [target·0.98, target]). The
   * band is one-sided: overshooting the target loses. Unit-independent.
   */
  tolerancePct: number
  target: {
    /** Inclusive lower bound for the daily target distance, in km. */
    minKm: number
    /** Inclusive upper bound for the daily target distance, in km. */
    maxKm: number
  }
  startCity: {
    /** Only cities at/above this population can be the daily start city. */
    minPopulation: number
    /**
     * Start-city selection weight = population ** weightExponent.
     * 1 = linear (favours megacities); lower spreads the field.
     */
    weightExponent: number
  }
  dataset: {
    /** Population floor of the bundled dataset (must match scripts/build-cities.mjs). */
    minPopulation: number
  }
  generation: {
    /**
     * Minimum number of dataset cities that must sit within [target·(1−tol),
     * target] of the start — i.e. cities that win in a single hop. Guarantees
     * every daily puzzle is solvable (multi-hop paths only add more options).
     */
    minValidAnswers: number
    /** How many closest single-hop wins to reveal at the end of a round. */
    revealCount: number
    /** Max seeded re-draws before generation gives up (safety valve). */
    maxAttempts: number
  }
  units: {
    /** Default display unit. Players can toggle at runtime. */
    default: Unit
  }
  reset: {
    /** Timezone whose date string seeds the daily puzzle. */
    timezone: 'UTC'
  }
}

export type Unit = 'km' | 'mi'

export const defaultRules: GameRules = {
  guesses: 6,
  tolerancePct: 0.02,
  target: {
    minKm: 500,
    maxKm: 3000,
  },
  startCity: {
    // 1M floor keeps the daily start city recognizable (median ~2.8M, no
    // obscure sub-1M starts) while leaving smaller cities available as answers.
    // Tuning notes live in DECISIONS.md.
    minPopulation: 1_000_000,
    weightExponent: 1,
  },
  dataset: {
    minPopulation: 100_000,
  },
  generation: {
    minValidAnswers: 3,
    revealCount: 3,
    maxAttempts: 1000,
  },
  units: {
    default: 'km',
  },
  reset: {
    timezone: 'UTC',
  },
}
