// The single GameMode descriptor. Bundling generate/evaluate/score/share behind
// one declarative object is the seam for future modes: adding a mode = adding
// another descriptor to `modes`, no rewrites to the UI or engine.

import type {
  City,
  GuessResult,
  PuzzleSpec,
  RoundState,
  ScoreBreakdown,
} from '@/lib/types'
import { type GameRules, defaultRules } from '@/config/rules'
import { generatePuzzle } from '@/lib/puzzle'
import { evaluateGuess, scoreRound } from '@/lib/scoring'
import { buildShareText, type ShareOptions } from '@/lib/share'

export interface GameMode {
  id: string
  label: string
  rules: GameRules
  generate(date: string): PuzzleSpec
  evaluate(puzzle: PuzzleSpec, city: City): GuessResult
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
  evaluate(puzzle, city) {
    return evaluateGuess(puzzle, city, defaultRules)
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
