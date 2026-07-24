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
  feedback: {
    /**
     * Remaining-fraction cutoffs (fraction of the target still to cover) for the
     * hot→cold ramp, hottest first: ≤ [0] → level 3, ≤ [1] → 2, ≤ [2] → 1, else
     * 0. (A win is level 4 and an overshoot 0, regardless of these.)
     */
    hotColdBands: [number, number, number]
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
    /**
     * Minimum number of dataset cities that must sit within [target·(1−tol),
     * target] of the start — i.e. cities that win in a single hop. Guarantees
     * every daily puzzle is solvable (multi-hop paths only add more options).
     */
    minValidAnswers: number
    /** How many closest single-hop wins to reveal at the end of a round. */
    revealCount: number
    /**
     * How many closest single-hop wins to surface in the end-of-round
     * "explore" reveal — the learning layer where a finished player scrolls
     * the globe to see cities they could have guessed. A superset of
     * `revealCount`, sorted the same way (closest to the target first).
     */
    exploreCount: number
    /** Max seeded re-draws before generation gives up (safety valve). */
    maxAttempts: number
  }
  overshoot: {
    /**
     * What happens when a hop would push the running total past the target.
     * Legs only ever *add* distance, so an overshoot can never be undone — the
     * total can't come back down. `true` (the default) makes that sudden death:
     * the hop lands and the round is lost. `false` instead **blocks** the hop —
     * it's rejected without consuming a turn — which never *loses* the round but
     * can strand a player whose remaining distance is shorter than the nearest
     * city, leaving a round that can neither be won nor ended. See DECISIONS.md.
     */
    endsRound: boolean
  }
  hidden: {
    /**
     * Hidden Destination proximity cutoffs (km) for the hot→cold ramp toward the
     * mystery capital: ≤[0] → 3 (hot), ≤[1] → 2, ≤[2] → 1, else 0. An exact
     * match (you found it) is 4.
     */
    hotColdKm: [number, number, number]
  }
  units: {
    /** Default display unit. Players can toggle at runtime. */
    default: Unit
  }
  explore: {
    /** Minimum zoom factor (1 = the full globe fits the board). */
    minZoom: number
    /** Maximum zoom factor (the board magnifies the globe up to this). */
    maxZoom: number
    /**
     * Population floor for the *fully zoomed-out* globe — only cities at/above
     * this show at `minZoom`. As zoom climbs toward `maxZoom` the floor eases
     * down (log-interpolated) to `dataset.minPopulation`, so smaller cities
     * appear progressively. Biggest cities are always shown first.
     */
    zoomedOutMinPopulation: number
    /** Hard cap on how many explorable city dots render at once (biggest kept). */
    maxDots: number
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
  feedback: {
    // ≤8% left → hot, ≤20% → warm, ≤45% → cool, else cold.
    hotColdBands: [0.08, 0.2, 0.45],
  },
  target: {
    minKm: 500,
    maxKm: 10000,
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
    // Up to 16 closest single-hop wins power the end-of-round explore reveal.
    // Capped so the globe stays readable; days with fewer valid answers reveal
    // however many exist.
    exploreCount: 16,
    maxAttempts: 1000,
  },
  overshoot: {
    // A bust ends the round. Blocking the hop instead (false) sounds kinder but
    // can leave the player stuck with no legal move and no way to finish —
    // worse than losing. See DECISIONS.md.
    endsRound: true,
  },
  hidden: {
    // ≤300 km → hot, ≤1200 → warm, ≤3500 → cool, else cold. Tuned for a
    // capitals-only pool: a neighbouring capital reads warm, a continent away cold.
    hotColdKm: [300, 1200, 3500],
  },
  units: {
    default: 'km',
  },
  explore: {
    minZoom: 1,
    maxZoom: 6,
    // ~5M keeps the default (zoomed-out) board to a handful of megacities;
    // zooming in eases the floor down to the 100k dataset minimum.
    zoomedOutMinPopulation: 5_000_000,
    // Cap keeps the SVG light; on-screen culling means this is rarely hit.
    maxDots: 320,
  },
  reset: {
    timezone: 'UTC',
  },
}
