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
  exploreAnswers: [],
  validAnswerCount: 0,
}

describe('engine', () => {
  it('starts playing with a full allowance', () => {
    const s = createRound('2026-07-15')
    expect(s.status).toBe('playing')
    expect(guessesLeft(s, defaultRules)).toBe(defaultRules.guesses)
    expect(isFinished(s)).toBe(false)
  })

  it('records a short first hop and decrements the allowance', () => {
    const { state, error } = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(4, 2), // ~445 km — short of the band, keeps playing
      defaultRules,
    )
    expect(error).toBeUndefined()
    expect(state.guesses).toHaveLength(1)
    expect(state.guesses[0]!.cumulativeKm).toBeGreaterThan(400)
    expect(guessesLeft(state, defaultRules)).toBe(defaultRules.guesses - 1)
    expect(state.status).toBe('playing')
  })

  it('accumulates the leg from the previous city, not the start', () => {
    let s = applyGuess(createRound('2026-07-15'), puzzle, east(4, 2), defaultRules).state
    s = applyGuess(s, puzzle, east(7, 3), defaultRules).state
    const [g1, g2] = s.guesses
    // Second leg is (4°→7°), so the total is more than the raw start→7° distance.
    expect(g2!.cumulativeKm).toBeGreaterThan(g1!.cumulativeKm)
    expect(g2!.cumulativeKm).toBeCloseTo(g1!.cumulativeKm + g2!.legKm, 6)
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
      east(4, 2),
      defaultRules,
    ).state
    const dup = applyGuess(first, puzzle, east(4, 2), defaultRules)
    expect(dup.error).toBe('duplicate')
    expect(dup.state.guesses).toHaveLength(1)
  })

  it('transitions to won when the total lands in the band, unused guesses remain', () => {
    const { state } = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(8.983, 3), // ~999 km in one hop
      defaultRules,
    )
    expect(state.status).toBe('won')
    expect(guessesLeft(state, defaultRules)).toBeGreaterThan(0)
  })

  it('loses immediately on an overshoot, even with guesses left', () => {
    const { state } = applyGuess(
      createRound('2026-07-15'),
      puzzle,
      east(20, 2), // ~2225 km — past the target
      defaultRules,
    )
    expect(state.status).toBe('lost')
    expect(state.guesses[0]!.over).toBe(true)
    expect(guessesLeft(state, defaultRules)).toBeGreaterThan(0)
  })

  it('transitions to lost after exhausting all guesses without reaching the band', () => {
    let s = createRound('2026-07-15')
    // Six ~111 km hops → total ~667 km, never overshooting and never winning.
    for (let i = 1; i <= defaultRules.guesses; i++) {
      s = applyGuess(s, puzzle, east(i, 10 + i), defaultRules).state
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
    const after = applyGuess(won, puzzle, east(4, 4), defaultRules)
    expect(after.error).toBe('finished')
    expect(after.state.guesses).toHaveLength(1)
  })
})
