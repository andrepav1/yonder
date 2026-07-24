// Generic round state machine. No I/O, no clock, and — since the mode seam —
// no game-specific rules of its own: it owns the RoundState lifecycle (create,
// finished-guard, append) and delegates the actual play of a guess to a
// `ModeLogic` (see `mode.ts`; Classic's lives in `classic.ts`). Every
// transition returns a new RoundState (immutable), so state can be saved,
// replayed, or (later) synced.

import type { City, PuzzleSpec, RoundState } from './types'
import type { GameRules } from '@/config/rules'
import type { ApplyResult, ModeLogic } from './mode'

// Re-exported so existing importers of these from `@/lib/engine` keep working;
// the canonical home is `mode.ts`.
export type { GuessError, ApplyResult, PlayOutcome, ModeLogic } from './mode'

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
 * Apply a guessed city by delegating to the mode's `play`. Rejects a guess made
 * after the round is over (the one universal rule); otherwise the mode decides
 * whether the guess is rejected (no turn spent) or appended with a new status.
 */
export function applyGuess(
  state: RoundState,
  puzzle: PuzzleSpec,
  city: City,
  logic: ModeLogic,
  rules: GameRules,
): ApplyResult {
  if (isFinished(state)) return { state, error: 'finished' }
  const outcome = logic.play(state, puzzle, city, rules)
  if ('error' in outcome) return { state, error: outcome.error }
  return {
    state: { ...state, guesses: [...state.guesses, outcome.result], status: outcome.status },
  }
}
