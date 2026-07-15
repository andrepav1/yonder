// Deterministic, seedable pseudo-random number generation.
//
// Kept separate and pure so the daily puzzle is reproducible for every player
// and trivially testable. No Date.now(), no Math.random() anywhere in here.

/**
 * FNV-1a 32-bit string hash. Turns a date string (or any string) into a
 * well-distributed 32-bit seed.
 */
export function hashString(str: string): number {
  let h = 2166136261 >>> 0
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/**
 * mulberry32 PRNG. Given a 32-bit seed, returns a function producing a
 * deterministic stream of floats in [0, 1).
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Convenience: a seeded rng keyed directly on a string (e.g. a UTC date). */
export function rngFromString(str: string): () => number {
  return mulberry32(hashString(str))
}
