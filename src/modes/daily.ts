// The GameMode descriptors. Bundling generate/apply/score/share behind one
// declarative object is the seam for multiple modes: adding a mode = adding
// another descriptor to `modes`, no rewrites to the UI or engine.

import type { City, PuzzleSpec, RoundState, ScoreBreakdown } from '@/lib/types'
import { type GameRules, defaultRules } from '@/config/rules'
import { generatePuzzle } from '@/lib/puzzle'
import { applyGuess, type ApplyResult } from '@/lib/engine'
import type { ModeLogic } from '@/lib/mode'
import { classicLogic } from '@/lib/classic'
import { generateHidden, hiddenLogic, buildHiddenShare } from '@/lib/hidden'
import { buildShareText, type ShareOptions } from '@/lib/share'

/**
 * Presentation discriminant — how the UI should render a mode's board, guess
 * rows, and result. Classic uses the cumulative-path layout; Hidden uses the
 * find-the-capital layout. The engine stays kind-agnostic; only `src/ui/*` reads it.
 */
export type ModeKind = 'classic' | 'hidden'

export interface GameMode {
  id: string
  label: string
  kind: ModeKind
  rules: GameRules
  /** The pure play + scoring strategy this mode delegates to (the mode seam). */
  logic: ModeLogic
  /**
   * Build the puzzle for a `seed` string. Deterministic in the seed: the daily
   * mode passes the UTC date (same puzzle for everyone that day); a free-play
   * mode passes a fresh random token per round. The randomness lives at the
   * caller boundary — the generator stays pure.
   */
  generate(seed: string): PuzzleSpec
  /** Play a guessed city into the round (delegates to the mode's logic). */
  apply(state: RoundState, puzzle: PuzzleSpec, city: City): ApplyResult
  score(state: RoundState, puzzle: PuzzleSpec): ScoreBreakdown
  share(state: RoundState, puzzle: PuzzleSpec, opts?: ShareOptions): string
}

interface ModeSpec {
  id: string
  label: string
  kind: ModeKind
  logic: ModeLogic
  rules: GameRules
  /** Puzzle builder; defaults to the Classic `generatePuzzle`. */
  generate?: (seed: string, rules: GameRules) => PuzzleSpec
  /** Share builder; defaults to the Classic `buildShareText`. */
  share?: (
    state: RoundState,
    puzzle: PuzzleSpec,
    rules: GameRules,
    opts?: ShareOptions,
  ) => string
}

/** Build a descriptor from a mode spec, wiring generate/apply/score/share. */
function makeMode(spec: ModeSpec): GameMode {
  const { id, label, kind, logic, rules } = spec
  const generate = spec.generate ?? ((seed, r) => generatePuzzle(seed, { rules: r }))
  const share = spec.share ?? buildShareText
  return {
    id,
    label,
    kind,
    rules,
    logic,
    generate: (seed) => generate(seed, rules),
    apply: (state, puzzle, city) => applyGuess(state, puzzle, city, logic, rules),
    score: (state, puzzle) => logic.score(state, puzzle, rules),
    share: (state, puzzle, opts) => share(state, puzzle, rules, opts),
  }
}

/** The shared daily puzzle — one per UTC day, streak-tracked, date-locked. */
export const dailyMode: GameMode = makeMode({
  id: 'daily',
  label: 'Daily',
  kind: 'classic',
  logic: classicLogic,
  rules: defaultRules,
})

/**
 * Classic as a free-play mode: the same rules as the daily, but each round is a
 * fresh random puzzle and nothing is recorded against the streak or stats (that
 * lives in the App orchestration). The first card in the Modes modal.
 */
export const classicMode: GameMode = makeMode({
  id: 'classic',
  label: 'Classic',
  kind: 'classic',
  logic: classicLogic,
  rules: defaultRules,
})

/** Hidden Destination — find the mystery capital. Free-play, 8 guesses. */
export const hiddenMode: GameMode = makeMode({
  id: 'hidden',
  label: 'Hidden Destination',
  kind: 'hidden',
  logic: hiddenLogic,
  rules: { ...defaultRules, guesses: 8 },
  generate: (seed, rules) => generateHidden(seed, { rules }),
  share: buildHiddenShare,
})

/**
 * The free-play modes offered in the Modes modal, in display order. Their card
 * copy (name + blurb) lives in `t.modes.catalog[id]`; their icon is mapped in
 * the modal. Adding a mode = a `ModeLogic` + a descriptor here (see `MODES.md`).
 */
export const freeModes: GameMode[] = [classicMode, hiddenMode]

/** Registry for id lookup — the daily plus every free-play mode. */
export const modes: Record<string, GameMode> = {
  [dailyMode.id]: dailyMode,
  ...Object.fromEntries(freeModes.map((m) => [m.id, m])),
}
