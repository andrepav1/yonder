// Seeded population-weighted selection — shared by the puzzle generators. Pure.

interface Weighted {
  population: number
  /** Grouping key for `countryBalance`. Ignored when balancing is off. */
  country?: string
}

/**
 * Build a weighted picker over `pool`: a member's selection probability is
 * proportional to `population ** exponent` (1 = linear, favouring megacities;
 * lower spreads the field), optionally divided by how many pool members share
 * its `country`, raised to `countryBalance`.
 *
 * The country term exists because the exponent alone can't fix geographic
 * skew: China puts ~100 cities into the ≥1M pool, so it won ~35% of days at
 * *every* exponent from 1 down to 0 (flat) — it's a member-count problem, not
 * a weight problem. 0 = off, 1 = every country gets equal total weight
 * (over-corrects: the field fills with the only city some country has), and
 * 0.5 is the middle ground the default uses. See DECISIONS.md.
 *
 * Returns a function mapping r ∈ [0, 1) to a pool member via binary search over
 * precomputed cumulative weights, so repeated picks (re-draws against a seeded
 * rng) stay cheap. Deterministic in r.
 */
export function weightedByPopulation<T extends Weighted>(
  pool: T[],
  exponent: number,
  countryBalance = 0,
): (r: number) => T {
  const perCountry = new Map<string, number>()
  if (countryBalance > 0) {
    for (const member of pool) {
      const key = member.country ?? ''
      perCountry.set(key, (perCountry.get(key) ?? 0) + 1)
    }
  }

  const cumulative = new Array<number>(pool.length)
  let total = 0
  for (let i = 0; i < pool.length; i++) {
    const member = pool[i]!
    let weight = Math.pow(member.population, exponent)
    if (countryBalance > 0) {
      weight /= Math.pow(perCountry.get(member.country ?? '') ?? 1, countryBalance)
    }
    total += weight
    cumulative[i] = total
  }
  return (r: number): T => {
    const target = r * total
    let lo = 0
    let hi = pool.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (cumulative[mid]! < target) lo = mid + 1
      else hi = mid
    }
    return pool[lo]!
  }
}
