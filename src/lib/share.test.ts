import { describe, it, expect } from 'vitest'
import { buildShareText } from './share'
import { defaultRules } from '@/config/rules'
import type { City, GuessResult, PuzzleSpec, RoundState } from './types'

const puzzle: PuzzleSpec = {
  date: '2026-07-15',
  seed: 0,
  start: {
    id: 1,
    name: 'Start',
    country: 'X',
    admin1: '',
    lat: 0,
    lng: 0,
    population: 1_000_000,
  },
  targetKm: 1000,
  tolerancePct: defaultRules.tolerancePct,
  answers: [],
  validAnswerCount: 0,
}

const city: City = {
  id: 2,
  name: 'Somewhere',
  country: 'Y',
  admin1: '',
  lat: 0,
  lng: 9,
  population: 100_000,
}

function guess(errorPct: number, won: boolean, bearingDeg = 90): GuessResult {
  return {
    city,
    distanceKm: 1000 * (1 + errorPct),
    deltaKm: 1000 * errorPct,
    errorPct,
    bearingDeg,
    won,
  }
}

describe('buildShareText', () => {
  it('formats a win with the attempt count and one row per guess', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(0.3, false), guess(0.01, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules)
    const lines = text.split('\n')
    expect(lines[0]).toBe('Yonder 2026-07-15 · 2/6')
    expect(lines).toHaveLength(4) // header + 2 rows + score
    expect(lines[2]).toContain('🟥') // the winning row is hottest
    expect(lines[3]).toMatch(/pts$/)
  })

  it('marks a loss with X/6', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'lost',
      guesses: [guess(0.6, false), guess(0.4, false)],
    }
    const text = buildShareText(state, puzzle, defaultRules)
    expect(text.split('\n')[0]).toBe('Yonder 2026-07-15 · X/6')
  })

  it('never leaks city names (no spoilers)', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(0.01, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules)
    expect(text).not.toContain('Somewhere')
    expect(text).not.toContain('Start')
  })

  it('appends a url when provided', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(0.01, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules, {
      url: 'https://yonder.example',
    })
    expect(text.split('\n').at(-1)).toBe('https://yonder.example')
  })
})
