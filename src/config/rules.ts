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
   * Half-width of the win band, in km, applied on **both** sides of the target
   * (500 = the running total wins anywhere in [target−500, target+500]).
   *
   * Absolute rather than a percentage on purpose. A percentage band scales with
   * the target, so the old 2% asked for ~110 km precision on a median 5,600 km
   * day — and the cities that actually fit that ring were mostly obscure: 70%
   * of the closest answers had under 300k population. A flat band keeps the
   * required precision constant and puts recognizable cities inside it on
   * every day. Two-sided because overshooting is no longer a loss — see
   * `overshoot` below and DECISIONS.md.
   */
  toleranceKm: number
  feedback: {
    /**
     * Off-target cutoffs (|target − running total| as a fraction of the target)
     * for the hot→cold ramp, hottest first: ≤ [0] → level 3, ≤ [1] → 2,
     * ≤ [2] → 1, else 0. (A win is level 4 regardless of these.) Measured on
     * the absolute miss, so a small overshoot reads as hot — it *is* close.
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
    /**
     * Divides each candidate's weight by (cities that country contributes to
     * the pool) ** countryBalance, so countries with many big cities stop
     * monopolizing the calendar. 0 = off, 1 = equal weight per country,
     * 0.5 = the default middle ground. See `weightedByPopulation`.
     */
    countryBalance: number
  }
  dataset: {
    /** Population floor of the bundled dataset (must match scripts/build-cities.mjs). */
    minPopulation: number
  }
  generation: {
    /**
     * Minimum number of dataset cities that must sit inside the win band
     * around the start — i.e. cities that win in a single hop. Guarantees
     * every daily puzzle is solvable (multi-hop paths only add more options).
     */
    minValidAnswers: number
    /**
     * Minimum number of those single-hop answers that must be a *recognizable*
     * city (population ≥ `famousPopulation`). Solvable isn't the same as
     * guessable: the old generator happily shipped days whose only answers were
     * 150k-population towns nobody could name. Re-draws until the day has at
     * least this many cities a player has actually heard of.
     */
    minFamousAnswers: number
    /** Population at/above which a city counts as recognizable. */
    famousPopulation: number
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
     * What happens when a hop pushes the running total past the *far* edge of
     * the win band (a small overshoot is a win now — the band is two-sided).
     *
     * - `'continue'` (default) — nothing. The hop lands, the round plays on to
     *   the guess limit and is scored on how close it came. Overshooting is
     *   never an instant loss. Legs only add, so the total can't come back
     *   down and a player past the band can no longer win — but the round ends
     *   on their own terms with the reveal intact, instead of slamming shut on
     *   a guess that was a blind coin flip 68% of the time.
     * - `'block'` — reject the hop without consuming a turn. Gentle, but it can
     *   strand a player whose remaining distance is shorter than the nearest
     *   city, leaving a round that can neither be won nor ended.
     * - `'lose'` — the original sudden death.
     *
     * See DECISIONS.md.
     */
    mode: OvershootMode
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

/** How a hop past the far edge of the win band is treated. See `overshoot`. */
export type OvershootMode = 'continue' | 'block' | 'lose'

export const defaultRules: GameRules = {
  guesses: 6,
  // ±500 km. On the median ~5,600 km day every date then has a recognizable
  // (≥1M) city inside the band; at the old 2% only 76% of days did, and a
  // quarter of days could only be won by naming a town under 300k.
  toleranceKm: 500,
  feedback: {
    // ≤8% off → hot, ≤20% → warm, ≤45% → cool, else cold.
    hotColdBands: [0.08, 0.2, 0.45],
  },
  target: {
    // Floor sits well above `toleranceKm` so the band stays a real constraint —
    // a 600 km target with a ±500 km band would be won by almost anything.
    minKm: 1500,
    maxKm: 10000,
  },
  startCity: {
    // 1M floor keeps the daily start city recognizable (median ~2.8M, no
    // obscure sub-1M starts) while leaving smaller cities available as answers.
    // Tuning notes live in DECISIONS.md.
    minPopulation: 1_000_000,
    weightExponent: 1,
    // Population weight alone left China with ~37% of all days (and China +
    // India nearly half) because China simply has ~100 cities in the pool —
    // lowering the exponent didn't move it. Balancing on country count does:
    // 0.5 takes China to ~7% while keeping starts famous.
    countryBalance: 0.5,
  },
  dataset: {
    minPopulation: 100_000,
  },
  generation: {
    minValidAnswers: 3,
    // At least one answer a player could plausibly name unaided. With the flat
    // band this costs almost nothing — the mean day now has ~18 such cities —
    // but it hard-stops the occasional day that only obscure towns can win.
    minFamousAnswers: 1,
    famousPopulation: 1_000_000,
    revealCount: 3,
    // Up to 16 closest single-hop wins power the end-of-round explore reveal.
    // Capped so the globe stays readable; days with fewer valid answers reveal
    // however many exist.
    exploreCount: 16,
    maxAttempts: 1000,
  },
  overshoot: {
    // No bust. 68% of all cities were an instant loss as a first guess, which
    // made the opening move a coin flip rather than a decision.
    mode: 'continue',
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
