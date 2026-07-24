// Classic — the original Yondle game, expressed as a `ModeLogic` (the first
// mode on the framework seam). Build a journey city by city: each guess adds the
// great-circle leg from the previous point onto a running total that must climb
// into the win band without overshooting. This is the play logic lifted verbatim
// out of the old hard-coded engine; the distance/band primitives still live in
// `scoring.ts` (and stay shared). Pure.

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
  if (city.id === puzzle.start.id) return { error: 'start-city' }
  if (state.guesses.some((g) => g.city.id === city.id)) return { error: 'duplicate' }

  const last = state.guesses[state.guesses.length - 1]
  const from = last ? last.city : puzzle.start
  const priorCumulativeKm = last ? last.cumulativeKm : 0
  const result = evaluateLeg(puzzle, from, priorCumulativeKm, city, rules)
  // Legs only add, so an overshoot is unrecoverable. Unless the rules make it
  // sudden death, block the hop (no turn spent) so a single over-eager guess
  // never ends the round — the player just picks somewhere closer.
  if (result.over && !rules.overshoot.endsRound) return { error: 'overshoot' }

  const willBe = state.guesses.length + 1
  const status: RoundStatus = result.won
    ? 'won'
    : result.over || willBe >= rules.guesses
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
