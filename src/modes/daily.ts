// The GameMode descriptors. Bundling generate/apply/score/share behind one
// declarative object is the seam for multiple modes: adding a mode = adding
// another descriptor to `modes`, no rewrites to the UI or engine.

import type { City, PuzzleSpec, RoundState, ScoreBreakdown } from '@/lib/types'
import { type GameRules, defaultRules } from '@/config/rules'
import { generatePuzzle } from '@/lib/puzzle'
import { applyGuess, type ApplyResult } from '@/lib/engine'
import { scoreRound } from '@/lib/scoring'
import { buildShareText, type ShareOptions } from '@/lib/share'

export interface GameMode {
  id: string
  label: string
  rules: GameRules
  /**
   * Build the puzzle for a `seed` string. Deterministic in the seed: the daily
   * mode passes the UTC date (same puzzle for everyone that day); the practice
   * mode passes a fresh random token per round (a new puzzle every time). The
   * randomness lives at the caller boundary — the generator stays pure.
   */
  generate(seed: string): PuzzleSpec
  /** Extend the round's path with a guessed city (adds the next leg). */
  apply(state: RoundState, puzzle: PuzzleSpec, city: City): ApplyResult
  score(state: RoundState): ScoreBreakdown
  share(state: RoundState, puzzle: PuzzleSpec, opts?: ShareOptions): string
}

/** Build a descriptor over a set of rules — daily and practice share behaviour. */
function makeMode(id: string, label: string, rules: GameRules): GameMode {
  return {
    id,
    label,
    rules,
    generate(seed) {
      return generatePuzzle(seed, { rules })
    },
    apply(state, puzzle, city) {
      return applyGuess(state, puzzle, city, rules)
    },
    score(state) {
      return scoreRound(state.guesses, state.status === 'won', rules)
    },
    share(state, puzzle, opts) {
      return buildShareText(state, puzzle, rules, opts)
    },
  }
}

/** The shared daily puzzle — one per UTC day, streak-tracked, date-locked. */
export const dailyMode: GameMode = makeMode('daily', 'Daily', defaultRules)

/**
 * Free-play mode: unlimited random puzzles for practice/exploration. Same rules
 * as the daily, but each round is a fresh random puzzle and nothing is recorded
 * against the daily streak or stats (that lives in the App orchestration).
 */
export const practiceMode: GameMode = makeMode('practice', 'Practice', defaultRules)

/** Registry of available modes. Adding a mode = adding a descriptor here. */
export const modes: Record<string, GameMode> = {
  [dailyMode.id]: dailyMode,
  [practiceMode.id]: practiceMode,
}
