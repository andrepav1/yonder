// Yonder — declarative game rules.
//
// This is THE place to tune the game. Every pure module (geo, puzzle, scoring,
// share, engine) takes a `GameRules` value as input and hard-codes nothing, so
// changing a number here changes the whole game with no logic edits.
//
// Keep README.md's "How it works" table in sync when you change these.

export interface GameRules {
  /** Number of guesses a player gets per round. */
  guesses: number
  /** Win band as a fraction of the target distance (0.05 = ±5%). Unit-independent. */
  tolerancePct: number
  score: {
    /** Points for a perfect (0 error) best guess, before the guess bonus. */
    max: number
    /** Percent error (fraction) at which the graded score reaches 0. */
    zeroAtErrorPct: number
    /** Bonus points added per unused guess when the round is won. */
    bonusPerUnusedGuess: number
  }
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
    /** Minimum number of dataset cities that must fall inside the win band. */
    minValidAnswers: number
    /** How many closest cities to reveal at the end of a round. */
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
  tolerancePct: 0.05,
  score: {
    max: 1000,
    zeroAtErrorPct: 0.5,
    bonusPerUnusedGuess: 50,
  },
  target: {
    minKm: 200,
    maxKm: 2000,
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
    maxAttempts: 500,
  },
  units: {
    default: 'km',
  },
  reset: {
    timezone: 'UTC',
  },
}
