// Stats, streaks, and the daily round save. Pure update logic + a thin store
// wrapper over a KeyValueStore adapter.

import type { RoundState } from '@/lib/types'
import type { GameRules } from '@/config/rules'
import { type KeyValueStore, defaultStore } from './storage'

export interface Stats {
  played: number
  wins: number
  currentStreak: number
  maxStreak: number
  /** Wins by guesses-used: index 0 = solved in 1, … length = rules.guesses. */
  distribution: number[]
  /** UTC date of the last completed round, or null. Guards double-counting. */
  lastCompletedDate: string | null
}

export function emptyStats(rules: GameRules): Stats {
  return {
    played: 0,
    wins: 0,
    currentStreak: 0,
    maxStreak: 0,
    distribution: new Array(rules.guesses).fill(0),
    lastCompletedDate: null,
  }
}

/** True if `cur` (YYYY-MM-DD) is exactly the UTC day after `prev`. */
export function isPreviousUtcDay(prev: string, cur: string): boolean {
  const a = Date.parse(`${prev}T00:00:00Z`)
  const b = Date.parse(`${cur}T00:00:00Z`)
  if (Number.isNaN(a) || Number.isNaN(b)) return false
  return b - a === 86_400_000
}

export interface ResultInput {
  date: string
  won: boolean
  guessesUsed: number
}

/**
 * Pure stats transition. Idempotent per date: recording the same date twice
 * returns the stats unchanged, so a page reload never inflates the numbers.
 */
export function updateStats(prev: Stats, result: ResultInput, rules: GameRules): Stats {
  if (result.date === prev.lastCompletedDate) return prev

  const distribution = prev.distribution.slice()
  if (distribution.length !== rules.guesses) {
    distribution.length = rules.guesses
    for (let i = 0; i < rules.guesses; i++) distribution[i] ??= 0
  }

  let currentStreak: number
  if (result.won) {
    const continues =
      prev.lastCompletedDate !== null &&
      isPreviousUtcDay(prev.lastCompletedDate, result.date)
    currentStreak = continues ? prev.currentStreak + 1 : 1
    if (result.guessesUsed >= 1 && result.guessesUsed <= rules.guesses) {
      distribution[result.guessesUsed - 1]! += 1
    }
  } else {
    currentStreak = 0
  }

  return {
    played: prev.played + 1,
    wins: prev.wins + (result.won ? 1 : 0),
    currentStreak,
    maxStreak: Math.max(prev.maxStreak, currentStreak),
    distribution,
    lastCompletedDate: result.date,
  }
}

const STATS_KEY = 'yonder:stats:v1'
const roundKey = (date: string) => `yonder:round:${date}`

export interface StatsStore {
  loadStats(): Stats
  saveStats(stats: Stats): void
  /** The saved in-progress/finished round for a date, or null. */
  loadRound(date: string): RoundState | null
  saveRound(state: RoundState): void
  /** Fold a finished round into stats (idempotent per date) and persist. */
  recordResult(state: RoundState): Stats
}

/**
 * localStorage-backed StatsStore (inject a memory adapter in tests). `rules` is
 * captured so distribution length + scoring bonus stay in sync with config.
 */
export function createStatsStore(
  rules: GameRules,
  storage: KeyValueStore = defaultStore(),
): StatsStore {
  const loadStats = (): Stats => {
    const raw = storage.getItem(STATS_KEY)
    if (!raw) return emptyStats(rules)
    try {
      const parsed = JSON.parse(raw) as Partial<Stats>
      const base = emptyStats(rules)
      return {
        ...base,
        ...parsed,
        distribution: normalizeDistribution(parsed.distribution, rules.guesses),
      }
    } catch {
      return emptyStats(rules)
    }
  }

  const saveStats = (stats: Stats): void => {
    storage.setItem(STATS_KEY, JSON.stringify(stats))
  }

  const loadRound = (date: string): RoundState | null => {
    const raw = storage.getItem(roundKey(date))
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as RoundState
      return parsed.date === date ? parsed : null
    } catch {
      return null
    }
  }

  const saveRound = (state: RoundState): void => {
    storage.setItem(roundKey(state.date), JSON.stringify(state))
  }

  const recordResult = (state: RoundState): Stats => {
    const won = state.status === 'won'
    const next = updateStats(
      loadStats(),
      { date: state.date, won, guessesUsed: state.guesses.length },
      rules,
    )
    saveStats(next)
    return next
  }

  return { loadStats, saveStats, loadRound, saveRound, recordResult }
}

function normalizeDistribution(dist: number[] | undefined, len: number): number[] {
  const out = new Array<number>(len).fill(0)
  if (dist) for (let i = 0; i < Math.min(len, dist.length); i++) out[i] = dist[i] ?? 0
  return out
}
