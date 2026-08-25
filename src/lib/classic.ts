// Classic — the original Yondle game, expressed as a `ModeLogic` (the first
// mode on the framework seam). Build a journey city by city: each guess adds the
// great-circle leg from the previous point onto a running total that must land
// inside the win band around the target. The band is two-sided and overshooting
// no longer ends the round, so the whole game is "get close", not "get close
// without dying". The distance/band primitives live in `scoring.ts` (and stay
// shared). Pure.

import type { ModeLogic, PlayOutcome } from './mode'
import type { RoundState, PuzzleSpec, City, RoundStatus } from './types'
import type { GameRules } from '@/config/rules'
import { evaluateLeg, scoreRound } from './scoring'

function play(
  state: RoundState,
  puzzle: PuzzleSpec,
  city: City,
  rules: GameRules,
): PlayOutcome {
  const start = puzzle.start
  if (!start) throw new Error('classicLogic requires a puzzle.start')
  if (city.id === start.id) return { error: 'start-city' }
  if (state.guesses.some((g) => g.city.id === city.id)) return { error: 'duplicate' }

  const last = state.guesses[state.guesses.length - 1]
  const from = last ? last.city : start
  const priorCumulativeKm = last ? last.cumulativeKm : 0
  const result = evaluateLeg(puzzle, from, priorCumulativeKm, city, rules)
  // Past the far edge of the band. Legs only add, so it can't be undone — but
  // by default that no longer ends anything: the round plays on to the guess
  // limit and is scored on how close it came. See `rules.overshoot`.
  const { mode } = rules.overshoot
  if (result.over && mode === 'block') return { error: 'overshoot' }

  const willBe = state.guesses.length + 1
  const status: RoundStatus = result.won
    ? 'won'
    : (result.over && mode === 'lose') || willBe >= rules.guesses
      ? 'lost'
      : 'playing'
  return { result, status }
}

/** The Classic mode's pure play + scoring logic. */
export const classicLogic: ModeLogic = {
  play,
  score(state, _puzzle, rules) {
    return scoreRound(state.guesses, state.status === 'won', rules)
  },
}
