// The mode seam: the pure, per-mode rules of play that the generic engine
// delegates to. A `ModeLogic` is the heart of a game variant — it owns how a
// guess is validated, evaluated, and how the round transitions — while the
// engine owns only the generic RoundState lifecycle (finished-guard + append).
// Adding a game variant = writing a `ModeLogic` (Classic is the first; see
// `classic.ts`), then wrapping it in a descriptor (`src/modes/*`). Pure and
// serializable-in/serializable-out, like the rest of `lib/*`.

import type { City, GuessResult, PuzzleSpec, RoundState, RoundStatus, ScoreBreakdown } from './types'
import type { GameRules } from '@/config/rules'

/** Reasons a guess can be rejected without consuming a turn. */
export type GuessError = 'finished' | 'start-city' | 'duplicate' | 'overshoot'

export interface ApplyResult {
  state: RoundState
  /** Set when the guess was rejected; `state` is then returned unchanged. */
  error?: GuessError
}

/**
 * The outcome of a mode playing one guess: either a rejection (no turn spent,
 * round unchanged) or the evaluated guess to append plus the resulting status.
 * The mode owns the whole per-guess decision; the engine just appends.
 */
export type PlayOutcome =
  | { error: GuessError }
  | { result: GuessResult; status: RoundStatus }

/** The pure, per-mode rules of play the engine delegates to. */
export interface ModeLogic {
  /**
   * Validate + evaluate a guess (the round is guaranteed to still be `playing`).
   * Returns a rejection, or the `GuessResult` to append and the new status.
   */
  play(state: RoundState, puzzle: PuzzleSpec, city: City, rules: GameRules): PlayOutcome
  /** Golf-style score breakdown for a finished (or in-progress) round. */
  score(state: RoundState, puzzle: PuzzleSpec, rules: GameRules): ScoreBreakdown
}
