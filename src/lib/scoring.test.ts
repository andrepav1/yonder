import { describe, it, expect } from 'vitest'
import { evaluateGuess, proximityBase, scoreRound, tempLevel } from './scoring'
import { defaultRules } from '@/config/rules'
import type { City, GuessResult, PuzzleSpec } from './types'

const start: City = {
  id: 1,
  name: 'Start',
  country: 'X',
  admin1: '',
  lat: 0,
  lng: 0,
  population: 1_000_000,
}

// A city due east of (0,0); at the equator, distance ≈ 111.32 km per degree.
function eastCity(deg: number, id = 100): City {
  return {
    id,
    name: `E${deg}`,
    country: 'X',
    admin1: '',
    lat: 0,
    lng: deg,
    population: 100_000,
  }
}

function puzzleWithTarget(targetKm: number): PuzzleSpec {
  return {
    date: '2026-07-15',
    seed: 0,
    start,
    targetKm,
    tolerancePct: defaultRules.tolerancePct,
    answers: [],
    validAnswerCount: 0,
  }
}

describe('evaluateGuess', () => {
  it('computes distance, signed delta, error and bearing', () => {
    const puzzle = puzzleWithTarget(1000)
    const g = evaluateGuess(puzzle, eastCity(9), defaultRules) // ~1001 km east
    expect(g.distanceKm).toBeGreaterThan(990)
    expect(g.distanceKm).toBeLessThan(1015)
    expect(g.deltaKm).toBeCloseTo(g.distanceKm - 1000, 6)
    expect(g.errorPct).toBeCloseTo(Math.abs(g.deltaKm) / 1000, 6)
    expect(g.bearingDeg).toBeCloseTo(90, 0) // due east
  })

  it('wins when inside the ±tolerance band', () => {
    const puzzle = puzzleWithTarget(1000)
    // exactly on target: place a city ~1000 km east (~8.983°)
    const g = evaluateGuess(puzzle, eastCity(8.983), defaultRules)
    expect(g.errorPct).toBeLessThanOrEqual(defaultRules.tolerancePct)
    expect(g.won).toBe(true)
  })

  it('loses when outside the band', () => {
    const puzzle = puzzleWithTarget(1000)
    const g = evaluateGuess(puzzle, eastCity(20), defaultRules) // ~2226 km
    expect(g.won).toBe(false)
  })
})

describe('proximityBase', () => {
  it('is max at zero error and zero at/after the cap', () => {
    expect(proximityBase(0, defaultRules)).toBe(defaultRules.score.max)
    expect(proximityBase(defaultRules.score.zeroAtErrorPct, defaultRules)).toBe(0)
    expect(proximityBase(1, defaultRules)).toBe(0)
  })

  it('is monotonic (closer scores at least as high)', () => {
    expect(proximityBase(0.1, defaultRules)).toBeGreaterThan(
      proximityBase(0.3, defaultRules),
    )
  })

  it('halves at half the cap', () => {
    const half = defaultRules.score.zeroAtErrorPct / 2
    expect(proximityBase(half, defaultRules)).toBe(Math.round(defaultRules.score.max / 2))
  })
})

function mkGuess(errorPct: number, won: boolean): GuessResult {
  return {
    city: eastCity(1),
    distanceKm: 1000 * (1 + errorPct),
    deltaKm: 1000 * errorPct,
    errorPct,
    bearingDeg: 90,
    won,
  }
}

describe('scoreRound', () => {
  it('uses the best guess for base and adds the fewer-guesses bonus on a win', () => {
    // won on the 2nd of 6 guesses, best error 0 -> base = max, bonus = 4 * 50
    const guesses = [mkGuess(0.2, false), mkGuess(0, true)]
    const s = scoreRound(guesses, true, defaultRules)
    expect(s.base).toBe(defaultRules.score.max)
    expect(s.bonus).toBe(
      defaultRules.score.bonusPerUnusedGuess * (defaultRules.guesses - 2),
    )
    expect(s.score).toBe(s.base + s.bonus)
    expect(s.guessesUsed).toBe(2)
    expect(s.bestErrorPct).toBe(0)
  })

  it('awards no bonus on a loss but still scores proximity', () => {
    const guesses = [mkGuess(0.1, false), mkGuess(0.3, false)]
    const s = scoreRound(guesses, false, defaultRules)
    expect(s.bonus).toBe(0)
    expect(s.base).toBe(proximityBase(0.1, defaultRules))
    expect(s.score).toBe(s.base)
  })

  it('scores zero for no guesses', () => {
    const s = scoreRound([], false, defaultRules)
    expect(s.score).toBe(0)
    expect(s.bestErrorPct).toBe(Infinity)
  })
})

describe('tempLevel', () => {
  it('returns the hottest level for a win', () => {
    expect(tempLevel(mkGuess(0.01, true), defaultRules)).toBe(4)
  })
  it('grades cooler as error grows', () => {
    expect(tempLevel(mkGuess(0.08, false), defaultRules)).toBe(3)
    expect(tempLevel(mkGuess(0.2, false), defaultRules)).toBe(2)
    expect(tempLevel(mkGuess(0.4, false), defaultRules)).toBe(1)
    expect(tempLevel(mkGuess(0.9, false), defaultRules)).toBe(0)
  })
})
