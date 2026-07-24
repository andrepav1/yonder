// Pure round state machine. No I/O, no clock. Every transition returns a new
// RoundState (immutable), so state can be saved, replayed, or (later) synced.

import type { City, PuzzleSpec, RoundState } from './types'
import type { GameRules } from '@/config/rules'
import { evaluateLeg } from './scoring'

/** Reasons a guess can be rejected without consuming a turn. */
export type GuessError = 'finished' | 'start-city' | 'duplicate' | 'overshoot'

export interface ApplyResult {
  state: RoundState
  /** Set when the guess was rejected; `state` is then returned unchanged. */
  error?: GuessError
}

/** A fresh, unplayed round for a date. */
export function createRound(date: string): RoundState {
  return { date, status: 'playing', guesses: [] }
}

/** Guesses remaining before the round is forced to end. */
export function guessesLeft(state: RoundState, rules: GameRules): number {
  return Math.max(0, rules.guesses - state.guesses.length)
}

export function isFinished(state: RoundState): boolean {
  return state.status !== 'playing'
}

/**
 * Apply a guessed city, extending the path. Rejects (without using a turn) a
 * guess made after the round is over, the start city itself, a city already on
 * the path, or — unless `rules.overshoot.endsRound` — a hop that would push the
 * running total past the target (it can never recover, so it's blocked rather
 * than counted). Otherwise the leg from the previous point to this city is
 * added to the running total, and the round transitions to won (inside the
 * band), lost (out of guesses, or an overshoot under sudden-death rules), or
 * keeps playing.
 */
export function applyGuess(
  state: RoundState,
  puzzle: PuzzleSpec,
  city: City,
  rules: GameRules,
): ApplyResult {
  if (isFinished(state)) return { state, error: 'finished' }
  if (city.id === puzzle.start.id) return { state, error: 'start-city' }
  if (state.guesses.some((g) => g.city.id === city.id)) {
    return { state, error: 'duplicate' }
  }

  const last = state.guesses[state.guesses.length - 1]
  const from = last ? last.city : puzzle.start
  const priorCumulativeKm = last ? last.cumulativeKm : 0
  const result = evaluateLeg(puzzle, from, priorCumulativeKm, city, rules)
  // Legs only add, so an overshoot is unrecoverable. Unless the rules make it
  // sudden death, block the hop (no turn spent) so a single over-eager guess
  // never ends the round — the player just picks somewhere closer.
  if (result.over && !rules.overshoot.endsRound) {
    return { state, error: 'overshoot' }
  }
  const guesses = [...state.guesses, result]
  const status = result.won
    ? 'won'
    : result.over || guesses.length >= rules.guesses
      ? 'lost'
      : 'playing'

  return { state: { ...state, guesses, status } }
}
