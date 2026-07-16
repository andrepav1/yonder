import { describe, it, expect } from 'vitest'
import { evaluateLeg, scoreRound, tempLevel } from './scoring'
import { haversineKm } from './geo'
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

// A city due east of (0,0); at the equator, distance ≈ 111.19 km per degree.
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

describe('evaluateLeg', () => {
  it('computes the leg, running total, remaining and bearing', () => {
    const puzzle = puzzleWithTarget(1000)
    const g = evaluateLeg(puzzle, start, 0, eastCity(4), defaultRules) // ~445 km east
    expect(g.legKm).toBeCloseTo(haversineKm(start, eastCity(4)), 6)
    expect(g.cumulativeKm).toBeCloseTo(g.legKm, 6)
    expect(g.remainingKm).toBeCloseTo(1000 - g.cumulativeKm, 6)
    expect(g.bearingDeg).toBeCloseTo(90, 0) // due east
    expect(g.over).toBe(false)
    expect(g.won).toBe(false)
  })

  it('adds the leg onto the prior cumulative total', () => {
    const puzzle = puzzleWithTarget(1000)
    const g = evaluateLeg(puzzle, start, 500, eastCity(4), defaultRules)
    expect(g.cumulativeKm).toBeCloseTo(500 + g.legKm, 6)
    expect(g.remainingKm).toBeCloseTo(1000 - g.cumulativeKm, 6)
  })

  it('wins when the running total lands in the one-sided band below target', () => {
    const puzzle = puzzleWithTarget(1000)
    // ~999 km east — inside [980, 1000], not over.
    const g = evaluateLeg(puzzle, start, 0, eastCity(8.983), defaultRules)
    expect(g.cumulativeKm).toBeGreaterThanOrEqual(980)
    expect(g.cumulativeKm).toBeLessThanOrEqual(1000)
    expect(g.over).toBe(false)
    expect(g.won).toBe(true)
  })

  it('overshoots (loses) when the running total passes the target', () => {
    const puzzle = puzzleWithTarget(1000)
    const g = evaluateLeg(puzzle, start, 0, eastCity(20), defaultRules) // ~2225 km
    expect(g.over).toBe(true)
    expect(g.won).toBe(false)
    expect(g.remainingKm).toBeLessThan(0)
  })

  it('does not win when still short of the band', () => {
    const puzzle = puzzleWithTarget(1000)
    const g = evaluateLeg(puzzle, start, 0, eastCity(4), defaultRules) // ~445 km, remaining ~555
    expect(g.won).toBe(false)
    expect(g.over).toBe(false)
  })
})

// A finished-leg result for target 1000 (targetKm = cumulative + remaining).
function leg(cumulativeKm: number, won = false, over = false): GuessResult {
  return {
    city: eastCity(1),
    legKm: cumulativeKm,
    cumulativeKm,
    remainingKm: 1000 - cumulativeKm,
    bearingDeg: 90,
    over,
    won,
  }
}

describe('scoreRound', () => {
  it('reports the guess count and final total from the last guess', () => {
    const guesses = [leg(600), leg(990, true)]
    const s = scoreRound(guesses, true, defaultRules)
    expect(s.won).toBe(true)
    expect(s.guessesUsed).toBe(2)
    expect(s.totalKm).toBe(990)
    expect(s.remainingKm).toBe(10)
    expect(s.overshot).toBe(false)
  })

  it('flags an overshoot from the last guess', () => {
    const guesses = [leg(600), leg(1100, false, true)]
    const s = scoreRound(guesses, false, defaultRules)
    expect(s.overshot).toBe(true)
    expect(s.remainingKm).toBeLessThan(0)
  })

  it('is empty for no guesses', () => {
    const s = scoreRound([], false, defaultRules)
    expect(s.guessesUsed).toBe(0)
    expect(s.totalKm).toBe(0)
    expect(s.overshot).toBe(false)
  })
})

describe('tempLevel', () => {
  it('returns the hottest level for a win', () => {
    expect(tempLevel(leg(990, true), defaultRules)).toBe(4)
  })
  it('returns the coldest level for a bust (overshoot)', () => {
    expect(tempLevel(leg(1100, false, true), defaultRules)).toBe(0)
  })
  it('heats up as the running total nears the target', () => {
    expect(tempLevel(leg(940), defaultRules)).toBe(3) // ~6% to go
    expect(tempLevel(leg(850), defaultRules)).toBe(2) // ~15% to go
    expect(tempLevel(leg(700), defaultRules)).toBe(1) // ~30% to go
    expect(tempLevel(leg(300), defaultRules)).toBe(0) // ~70% to go
  })
})
