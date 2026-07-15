// Wordle-style shareable result. Pure. No city names (no spoilers).

import type { PuzzleSpec, RoundState } from './types'
import type { GameRules } from '@/config/rules'
import { scoreRound, tempLevel, type TempLevel } from './scoring'
import { bearingArrow } from './geo'

/** Warm → cool squares matching TempLevel (4 = hottest/win ... 0 = coldest). */
const TEMP_SQUARE: Record<TempLevel, string> = {
  4: '🟥',
  3: '🟧',
  2: '🟨',
  1: '🟦',
  0: '⬜',
}

export interface ShareOptions {
  /** Base URL to append (e.g. the deployed site). Omitted if empty. */
  url?: string
}

/**
 * Build the share string for a finished round: a header line, one row per guess
 * (a hot/cold square + a direction arrow), and a score line. Never reveals the
 * guessed or answer city names.
 */
export function buildShareText(
  state: RoundState,
  puzzle: PuzzleSpec,
  rules: GameRules,
  opts: ShareOptions = {},
): string {
  const breakdown = scoreRound(state.guesses, state.status === 'won', rules)
  const attemptLabel =
    state.status === 'won'
      ? `${breakdown.guessesUsed}/${rules.guesses}`
      : `X/${rules.guesses}`

  const header = `Yonder ${puzzle.date} · ${attemptLabel}`

  const rows = state.guesses.map((g) => {
    const square = TEMP_SQUARE[tempLevel(g, rules)]
    return `${square} ${bearingArrow(g.bearingDeg)}`
  })

  const scoreLine = `${breakdown.score} pts`

  const lines = [header, ...rows, scoreLine]
  if (opts.url) lines.push(opts.url)
  return lines.join('\n')
}
