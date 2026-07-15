import { describe, it, expect } from 'vitest'
import { createRound, applyGuess, guessesLeft, isFinished } from './engine'
import { defaultRules } from '@/config/rules'
import type { City, PuzzleSpec } from './types'

const start: City = {
  id: 1,
  name: 'Start',
  country: 'X',
  admin1: '',
  lat: 0,
  lng: 0,
  population: 1_000_000,
}
const east = (deg: number, id: number): City => ({
  id,
  name: `E${id}`,
  country: 'X',
  admin1: '',
  lat: 0,
  lng: deg,
  population: 100_000,
})

const puzzle: PuzzleSpec = {
  date: '2026-07-15',
  seed: 0,
  start,
  targetKm: 1000,
  tolerancePct: defaultRules.tolerancePct,
  answers: [],
  validAnswerCount: 0,
}

describe('engine', () => {
  it('starts playing with a full allowance', () => {
    const s = createRound('2026-07-15')
    expect(s.status).toBe('playing')
    expect(guessesLeft(s, defaultRules)).toBe(defaultRules.guesses)
    expect(isFinished(s)).toBe(false)
  })

  it('records a guess and decrements the allowance', () => {
    const { state, error } = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(20, 2),
      defaultRules,
    )
    expect(error).toBeUndefined()
    expect(state.guesses).toHaveLength(1)
    expect(guessesLeft(state, defaultRules)).toBe(defaultRules.guesses - 1)
    expect(state.status).toBe('playing')
  })

  it('rejects the start city without using a turn', () => {
    const r = applyGuess(createRound('2026-07-15'), puzzle, start, defaultRules)
    expect(r.error).toBe('start-city')
    expect(r.state.guesses).toHaveLength(0)
  })

  it('rejects a duplicate city without using a turn', () => {
    const first = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(20, 2),
      defaultRules,
    ).state
    const dup = applyGuess(first, puzzle, east(20, 2), defaultRules)
    expect(dup.error).toBe('duplicate')
    expect(dup.state.guesses).toHaveLength(1)
  })

  it('transitions to won on a guess inside the band, unused guesses remain', () => {
    const { state } = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(8.983, 3),
      defaultRules,
    )
    expect(state.status).toBe('won')
    expect(guessesLeft(state, defaultRules)).toBeGreaterThan(0)
  })

  it('transitions to lost after exhausting all guesses without a win', () => {
    let s = createRound('2026-07-15')
    for (let i = 0; i < defaultRules.guesses; i++) {
      s = applyGuess(s, puzzle, east(20 + i, 10 + i), defaultRules).state
    }
    expect(s.status).toBe('lost')
    expect(guessesLeft(s, defaultRules)).toBe(0)
  })

  it('rejects guesses after the round is finished', () => {
    const won = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(8.983, 3),
      defaultRules,
    ).state
    const after = applyGuess(won, puzzle, east(20, 4), defaultRules)
    expect(after.error).toBe('finished')
    expect(after.state.guesses).toHaveLength(1)
  })
})
