// The GameMode descriptors. Bundling generate/apply/score/share behind one
// declarative object is the seam for multiple modes: adding a mode = adding
// another descriptor to `modes`, no rewrites to the UI or engine.

import type { City, PuzzleSpec, RoundState, ScoreBreakdown } from '@/lib/types'
import { type GameRules, defaultRules } from '@/config/rules'
import { generatePuzzle } from '@/lib/puzzle'
import { applyGuess, type ApplyResult } from '@/lib/engine'
import type { ModeLogic } from '@/lib/mode'
import { classicLogic } from '@/lib/classic'
import { buildShareText, type ShareOptions } from '@/lib/share'

export interface GameMode {
  id: string
  label: string
  rules: GameRules
  /** The pure play + scoring strategy this mode delegates to (the mode seam). */
  logic: ModeLogic
  /**
   * Build the puzzle for a `seed` string. Deterministic in the seed: the daily
   * mode passes the UTC date (same puzzle for everyone that day); the practice
   * mode passes a fresh random token per round (a new puzzle every time). The
   * randomness lives at the caller boundary — the generator stays pure.
   */
  generate(seed: string): PuzzleSpec
  /** Extend the round's path with a guessed city (adds the next leg). */
  apply(state: RoundState, puzzle: PuzzleSpec, city: City): ApplyResult
  score(state: RoundState, puzzle: PuzzleSpec): ScoreBreakdown
  share(state: RoundState, puzzle: PuzzleSpec, opts?: ShareOptions): string
}

/** Build a descriptor over a mode's play logic + rules. */
function makeMode(id: string, label: string, logic: ModeLogic, rules: GameRules): GameMode {
  return {
    id,
    label,
    rules,
    logic,
    generate(seed) {
      return generatePuzzle(seed, { rules })
    },
    apply(state, puzzle, city) {
      return applyGuess(state, puzzle, city, logic, rules)
    },
    score(state, puzzle) {
      return logic.score(state, puzzle, rules)
    },
    share(state, puzzle, opts) {
      return buildShareText(state, puzzle, rules, opts)
    },
  }
}

/** The shared daily puzzle — one per UTC day, streak-tracked, date-locked. */
export const dailyMode: GameMode = makeMode('daily', 'Daily', classicLogic, defaultRules)

/**
 * Classic as a free-play mode: the same rules as the daily, but each round is a
 * fresh random puzzle and nothing is recorded against the streak or stats (that
 * lives in the App orchestration). This is the first card in the Modes modal.
 */
export const classicMode: GameMode = makeMode('classic', 'Classic', classicLogic, defaultRules)

/**
 * The free-play modes offered in the Modes modal, in display order. Their card
 * copy (name + blurb) lives in `t.modes.catalog[id]`; their icon is mapped in
 * the modal. Adding a mode = a `ModeLogic` + a descriptor here (see `MODES.md`).
 */
export const freeModes: GameMode[] = [classicMode]

/** Registry for id lookup — the daily plus every free-play mode. */
export const modes: Record<string, GameMode> = {
  [dailyMode.id]: dailyMode,
  ...Object.fromEntries(freeModes.map((m) => [m.id, m])),
}
