// Seeded population-weighted selection — shared by the puzzle generators. Pure.

interface Weighted {
  population: number
}

/**
 * Build a population-weighted picker over `pool`: a member's selection
 * probability is proportional to `population ** exponent` (1 = linear, favouring
 * megacities; lower spreads the field). Returns a function mapping r ∈ [0, 1) to
 * a pool member via binary search over precomputed cumulative weights, so
 * repeated picks (re-draws against a seeded rng) stay cheap. Deterministic in r.
 */
export function weightedByPopulation<T extends Weighted>(
  pool: T[],
  exponent: number,
): (r: number) => T {
  const cumulative = new Array<number>(pool.length)
  let total = 0
  for (let i = 0; i < pool.length; i++) {
    total += Math.pow(pool[i]!.population, exponent)
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
