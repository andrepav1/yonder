import { describe, it, expect } from 'vitest'
import { createRound, applyGuess, guessesLeft, isFinished } from './engine'
import { classicLogic } from './classic'
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

// Classic is the mode under test — the engine itself is now mode-agnostic.
const guess = (state: Parameters<typeof applyGuess>[0], city: City, rules = defaultRules) =>
  applyGuess(state, puzzle, city, classicLogic, rules)

describe('engine', () => {
  it('starts playing with a full allowance', () => {
    const s = createRound('2026-07-15')
    expect(s.status).toBe('playing')
    expect(guessesLeft(s, defaultRules)).toBe(defaultRules.guesses)
    expect(isFinished(s)).toBe(false)
  })

  it('records a short first hop and decrements the allowance', () => {
    // ~445 km east — short of the band, keeps playing.
    const { state, error } = guess(createRound('2026-07-15'), east(4, 2))
    expect(error).toBeUndefined()
    expect(state.guesses).toHaveLength(1)
    expect(state.guesses[0]!.cumulativeKm).toBeGreaterThan(400)
    expect(guessesLeft(state, defaultRules)).toBe(defaultRules.guesses - 1)
    expect(state.status).toBe('playing')
  })

  it('accumulates the leg from the previous city, not the start', () => {
    let s = guess(createRound('2026-07-15'), east(4, 2)).state
    s = guess(s, east(7, 3)).state
    const [g1, g2] = s.guesses
    // Second leg is (4°→7°), so the total is more than the raw start→7° distance.
    expect(g2!.cumulativeKm).toBeGreaterThan(g1!.cumulativeKm)
    expect(g2!.cumulativeKm).toBeCloseTo(g1!.cumulativeKm + g2!.legKm, 6)
  })

  it('rejects the start city without using a turn', () => {
    const r = guess(createRound('2026-07-15'), start)
    expect(r.error).toBe('start-city')
    expect(r.state.guesses).toHaveLength(0)
  })

  it('rejects a duplicate city without using a turn', () => {
    const first = guess(createRound('2026-07-15'), east(4, 2)).state
    const dup = guess(first, east(4, 2))
    expect(dup.error).toBe('duplicate')
    expect(dup.state.guesses).toHaveLength(1)
  })

  it('transitions to won when the total lands in the band, unused guesses remain', () => {
    // ~999 km in one hop — inside the band.
    const { state } = guess(createRound('2026-07-15'), east(8.983, 3))
    expect(state.status).toBe('won')
    expect(guessesLeft(state, defaultRules)).toBeGreaterThan(0)
  })

  it('blocks an overshooting hop without ending the round or using a turn', () => {
    // ~2225 km — past the target.
    const { state, error } = guess(createRound('2026-07-15'), east(20, 2))
    expect(error).toBe('overshoot')
    expect(state.status).toBe('playing')
    expect(state.guesses).toHaveLength(0)
    expect(guessesLeft(state, defaultRules)).toBe(defaultRules.guesses)
  })

  it('keeps the running total intact after a blocked overshoot', () => {
    const played = guess(createRound('2026-07-15'), east(4, 2)).state // ~445 km first hop
    const blocked = guess(played, east(20, 3)) // would bust
    expect(blocked.error).toBe('overshoot')
    expect(blocked.state.guesses).toHaveLength(1)
    expect(blocked.state.guesses[0]!.cumulativeKm).toBeCloseTo(
      played.guesses[0]!.cumulativeKm,
      6,
    )
    // The player can still finish from where they were.
    const win = guess(blocked.state, east(8.983, 4))
    expect(win.error).toBeUndefined()
  })

  it('loses immediately on an overshoot when overshoot.endsRound is set', () => {
    const suddenDeath = { ...defaultRules, overshoot: { endsRound: true } }
    // ~2225 km — past the target.
    const { state, error } = guess(createRound('2026-07-15'), east(20, 2), suddenDeath)
    expect(error).toBeUndefined()
    expect(state.status).toBe('lost')
    expect(state.guesses[0]!.over).toBe(true)
    expect(guessesLeft(state, suddenDeath)).toBeGreaterThan(0)
  })

  it('transitions to lost after exhausting all guesses without reaching the band', () => {
    let s = createRound('2026-07-15')
    // Six ~111 km hops → total ~667 km, never overshooting and never winning.
    for (let i = 1; i <= defaultRules.guesses; i++) {
      s = guess(s, east(i, 10 + i)).state
    }
    expect(s.status).toBe('lost')
    expect(guessesLeft(s, defaultRules)).toBe(0)
  })

  it('rejects guesses after the round is finished', () => {
    const won = guess(createRound('2026-07-15'), east(8.983, 3)).state
    const after = guess(won, east(4, 4))
    expect(after.error).toBe('finished')
    expect(after.state.guesses).toHaveLength(1)
  })
})
