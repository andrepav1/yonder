import { describe, it, expect } from 'vitest'
import { emptyStats, updateStats, isPreviousUtcDay, createStatsStore } from './statsStore'
import { memoryStore } from './storage'
import { defaultRules } from '@/config/rules'
import type { RoundState } from '@/lib/types'

describe('isPreviousUtcDay', () => {
  it('recognizes consecutive UTC days (incl. month/year rollover)', () => {
    expect(isPreviousUtcDay('2026-07-15', '2026-07-16')).toBe(true)
    expect(isPreviousUtcDay('2026-07-31', '2026-08-01')).toBe(true)
    expect(isPreviousUtcDay('2026-12-31', '2027-01-01')).toBe(true)
  })
  it('rejects gaps and same-day', () => {
    expect(isPreviousUtcDay('2026-07-15', '2026-07-17')).toBe(false)
    expect(isPreviousUtcDay('2026-07-15', '2026-07-15')).toBe(false)
  })
})

describe('updateStats', () => {
  const rules = defaultRules

  it('builds and extends a streak across consecutive wins', () => {
    let s = emptyStats(rules)
    s = updateStats(s, { date: '2026-07-15', won: true, guessesUsed: 3 }, rules)
    expect(s.currentStreak).toBe(1)
    s = updateStats(s, { date: '2026-07-16', won: true, guessesUsed: 2 }, rules)
    expect(s.currentStreak).toBe(2)
    expect(s.maxStreak).toBe(2)
    expect(s.wins).toBe(2)
    expect(s.played).toBe(2)
    expect(s.distribution[2]).toBe(1) // solved in 3
    expect(s.distribution[1]).toBe(1) // solved in 2
  })

  it('resets the streak on a loss but keeps maxStreak', () => {
    let s = emptyStats(rules)
    s = updateStats(s, { date: '2026-07-15', won: true, guessesUsed: 1 }, rules)
    s = updateStats(s, { date: '2026-07-16', won: false, guessesUsed: 6 }, rules)
    expect(s.currentStreak).toBe(0)
    expect(s.maxStreak).toBe(1)
    expect(s.played).toBe(2)
    expect(s.wins).toBe(1)
  })

  it('restarts the streak at 1 after a gap day', () => {
    let s = emptyStats(rules)
    s = updateStats(s, { date: '2026-07-15', won: true, guessesUsed: 1 }, rules)
    s = updateStats(s, { date: '2026-07-18', won: true, guessesUsed: 1 }, rules)
    expect(s.currentStreak).toBe(1)
  })

  it('is idempotent for the same date (no double counting on reload)', () => {
    let s = emptyStats(rules)
    s = updateStats(s, { date: '2026-07-15', won: true, guessesUsed: 3 }, rules)
    const again = updateStats(s, { date: '2026-07-15', won: true, guessesUsed: 3 }, rules)
    expect(again).toEqual(s)
  })
})

describe('createStatsStore', () => {
  it('persists round state and restores it for the same date', () => {
    const store = createStatsStore(defaultRules, memoryStore())
    const round: RoundState = {
      date: '2026-07-15',
      status: 'playing',
      guesses: [],
    }
    store.saveRound(round)
    expect(store.loadRound('2026-07-15')).toEqual(round)
    expect(store.loadRound('2026-07-16')).toBeNull()
  })

  it('records a finished round into persisted stats, idempotently', () => {
    const kv = memoryStore()
    const store = createStatsStore(defaultRules, kv)
    const won: RoundState = {
      date: '2026-07-15',
      status: 'won',
      guesses: [
        {
          city: {
            id: 2,
            name: 'C',
            country: 'Y',
            admin1: '',
            lat: 0,
            lng: 9,
            population: 100_000,
          },
          distanceKm: 1000,
          deltaKm: 0,
          errorPct: 0,
          bearingDeg: 90,
          won: true,
        },
      ],
    }
    const s1 = store.recordResult(won)
    expect(s1.wins).toBe(1)
    expect(s1.currentStreak).toBe(1)

    // A second store over the same storage sees the persisted stats,
    // and re-recording the same date does not inflate them.
    const store2 = createStatsStore(defaultRules, kv)
    expect(store2.loadStats().wins).toBe(1)
    const s2 = store2.recordResult(won)
    expect(s2.wins).toBe(1)
    expect(s2.played).toBe(1)
  })
})
