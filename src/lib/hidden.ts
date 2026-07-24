// Hidden Destination — a deduction mode: find a secret capital. Unlike Classic,
// there's no cumulative path and no overshoot; each guess is an independent probe
// that reports its great-circle distance + bearing to the mystery city, and you
// win by naming that city exactly. Pure + deterministic in the seed, like the
// rest of `lib/*`. The answer (and the guess pool) is drawn from national
// capitals (see `capitals()` in `cities.ts`) so the search space stays reasonable.

import type { City, GuessResult, PuzzleSpec, RoundState } from './types'
import type { GameRules } from '@/config/rules'
import { defaultRules } from '@/config/rules'
import { haversineKm, initialBearingDeg, bearingArrow } from './geo'
import { rngFromString, hashString } from './prng'
import { weightedByPopulation } from './weighted'
import { allCities, capitals as allCapitals } from './cities'
import type { ModeLogic, PlayOutcome } from './mode'
import { type Messages, en } from '@/i18n'

/**
 * Hot→cold level for how close a guess is to the mystery city: 4 = found it,
 * then graded by distance against `rules.hidden.hotColdKm`. Shared by the UI
 * pins/rows and the share squares so they agree.
 */
export function hiddenTempLevel(toTargetKm: number, won: boolean, rules: GameRules): number {
  if (won) return 4
  const [hot, warm, cool] = rules.hidden.hotColdKm
  if (toTargetKm <= hot) return 3
  if (toTargetKm <= warm) return 2
  if (toTargetKm <= cool) return 1
  return 0
}

export interface HiddenOptions {
  cities?: City[]
  capitals?: City[]
  rules?: GameRules
}

/**
 * Generate a Hidden Destination puzzle. Deterministic in `seed`. Picks a
 * population-weighted mystery capital, then an anchor start city (a big, famous
 * city) at least `rules.hidden.minClueKm` away, so the opening distance+bearing
 * clue is meaningful. Always solvable — the target is itself a guessable capital.
 */
export function generateHidden(seed: string, opts: HiddenOptions = {}): PuzzleSpec {
  const rules = opts.rules ?? defaultRules
  const cities = opts.cities ?? allCities()
  const capitals = opts.capitals ?? allCapitals()
  if (capitals.length === 0) throw new Error('Hidden Destination needs a capital pool')
  const rng = rngFromString(seed)
  const exp = rules.startCity.weightExponent

  const startPool = cities.filter((c) => c.population >= rules.startCity.minPopulation)
  const pickTarget = weightedByPopulation(capitals, exp)
  const pickStart = weightedByPopulation(startPool, exp)

  const target = pickTarget(rng())
  // Redraw the anchor until it's a distinct city a meaningful distance away.
  let start = pickStart(rng())
  let targetKm = haversineKm(start, target)
  for (let i = 0; i < 60 && (start.id === target.id || targetKm < rules.hidden.minClueKm); i++) {
    start = pickStart(rng())
    targetKm = haversineKm(start, target)
  }

  return {
    date: seed,
    seed: hashString(seed),
    start,
    targetKm: Math.round(targetKm),
    tolerancePct: rules.tolerancePct,
    target,
    answers: [],
    exploreAnswers: [],
    validAnswerCount: 1,
  }
}

function play(
  state: RoundState,
  puzzle: PuzzleSpec,
  city: City,
  rules: GameRules,
): PlayOutcome {
  const target = puzzle.target
  if (!target) throw new Error('hiddenLogic requires a puzzle.target')
  if (state.guesses.some((g) => g.city.id === city.id)) return { error: 'duplicate' }

  const toTargetKm = haversineKm(city, target)
  const won = city.id === target.id
  const result: GuessResult = {
    city,
    legKm: 0,
    cumulativeKm: 0,
    remainingKm: 0,
    // Bearing points from the guess *toward* the mystery city.
    bearingDeg: initialBearingDeg(city, target),
    over: false,
    won,
    toTargetKm,
    temp: hiddenTempLevel(toTargetKm, won, rules),
  }
  const willBe = state.guesses.length + 1
  const status = won ? 'won' : willBe >= rules.guesses ? 'lost' : 'playing'
  return { result, status }
}

/** The Hidden Destination mode's pure play + scoring logic. */
export const hiddenLogic: ModeLogic = {
  play,
  score(state) {
    return {
      won: state.status === 'won',
      guessesUsed: state.guesses.length,
      totalKm: 0,
      remainingKm: NaN,
      overshot: false,
    }
  },
}

const TEMP_SQUARE = ['⬜', '🟦', '🟨', '🟧', '🟥'] // index by temp level 0–4

/** Wordle-style share for a finished Hidden Destination round — no city names. */
export function buildHiddenShare(
  state: RoundState,
  _puzzle: PuzzleSpec,
  rules: GameRules,
  opts: { url?: string; t?: Messages } = {},
): string {
  const t = opts.t ?? en
  const won = state.status === 'won'
  const attempt = won ? `${state.guesses.length}/${rules.guesses}` : `X/${rules.guesses}`
  const header = `${t.appName} · ${t.modes.catalog.hidden.name} ${attempt}`
  const rows = state.guesses.map(
    (g) => `${TEMP_SQUARE[g.temp ?? 0]} ${bearingArrow(g.bearingDeg)}`,
  )
  const lines = [header, ...rows]
  if (opts.url) lines.push(opts.url)
  return lines.join('\n')
}
