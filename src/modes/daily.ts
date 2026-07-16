// The single GameMode descriptor. Bundling generate/apply/score/share behind
// one declarative object is the seam for future modes: adding a mode = adding
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
  generate(date: string): PuzzleSpec
  /** Extend the round's path with a guessed city (adds the next leg). */
  apply(state: RoundState, puzzle: PuzzleSpec, city: City): ApplyResult
  score(state: RoundState): ScoreBreakdown
  share(state: RoundState, puzzle: PuzzleSpec, opts?: ShareOptions): string
}

export const dailyMode: GameMode = {
  id: 'daily',
  label: 'Daily',
  rules: defaultRules,
  generate(date) {
    return generatePuzzle(date, { rules: defaultRules })
  },
  apply(state, puzzle, city) {
    return applyGuess(state, puzzle, city, defaultRules)
  },
  score(state) {
    return scoreRound(state.guesses, state.status === 'won', defaultRules)
  },
  share(state, puzzle, opts) {
    return buildShareText(state, puzzle, defaultRules, opts)
  },
}

/** Registry of available modes (only the daily solo game in v1). */
export const modes: Record<string, GameMode> = {
  [dailyMode.id]: dailyMode,
}
