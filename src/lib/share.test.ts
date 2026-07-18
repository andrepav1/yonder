import { describe, it, expect } from 'vitest'
import { buildShareText } from './share'
import { catalogs } from '@/i18n'
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

// A finished-leg result for target 1000 (targetKm = cumulative + remaining).
function guess(
  cumulativeKm: number,
  won: boolean,
  over = false,
  bearingDeg = 90,
): GuessResult {
  return {
    city,
    legKm: cumulativeKm,
    cumulativeKm,
    remainingKm: 1000 - cumulativeKm,
    bearingDeg,
    over,
    won,
  }
}

describe('buildShareText', () => {
  it('formats a win with the attempt count and one row per hop', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(300, false), guess(995, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules)
    const lines = text.split('\n')
    expect(lines[0]).toBe('Yondle 2026-07-15 · 2/6')
    expect(lines).toHaveLength(4) // header + 2 rows + reach line
    expect(lines[2]).toContain('🟥') // the winning row is hottest
    expect(lines[3]).toContain('% of target')
  })

  it('marks a loss with X/6 and flags an overshoot', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'lost',
      guesses: [guess(600, false), guess(1100, false, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules)
    const lines = text.split('\n')
    expect(lines[0]).toBe('Yondle 2026-07-15 · X/6')
    expect(lines.at(-1)).toContain('overshot')
  })

  it('never leaks city names (no spoilers)', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(990, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules)
    expect(text).not.toContain('Somewhere')
    expect(text).not.toContain('Start')
  })

  it('localizes the reach line while keeping the brand + date stable', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(300, false), guess(995, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules, { t: catalogs.it })
    const lines = text.split('\n')
    expect(lines[0]).toBe('Yondle 2026-07-15 · 2/6')
    expect(lines.at(-1)).toContain('dell’obiettivo')
    expect(lines.at(-1)).not.toContain('of target')
  })

  it('appends a url when provided', () => {
    const state: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [guess(990, true)],
    }
    const text = buildShareText(state, puzzle, defaultRules, {
      url: 'https://yondle.example',
    })
    expect(text.split('\n').at(-1)).toBe('https://yondle.example')
  })
})
