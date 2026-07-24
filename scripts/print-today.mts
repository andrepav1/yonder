// Prints today's puzzle facts as JSON (used by the screenshot harness to drive
// real guesses in the cumulative-path game). Dev-only.
//
//   answer  — a city that wins in a single hop (distance in the win band).
//   partial — a city ~halfway to the target: a safe first hop that neither
//             wins nor overshoots, for the mid-game "play" screenshot.
//   bust    — a city far past the target: one hop that overshoots and (under
//             the default sudden-death rule) loses, for the "lost" screenshot.
//
// Both names are validated through resolveGuess so the fuzzy input the harness
// types actually resolves back to the intended city (bare names like "Orléans"
// otherwise collide across countries).
import { generatePuzzle, utcDateString } from '@/lib/puzzle'
import { allCities, resolveGuess } from '@/lib/cities'
import { haversineKm } from '@/lib/geo'
import type { City } from '@/lib/types'

const date = process.env.YONDLE_DATE ?? utcDateString()
const p = generatePuzzle(date)

/** True when typing `city.name` into the fuzzy input resolves back to `city`. */
const resolvesToSelf = (city: City): boolean => resolveGuess(city.name)?.id === city.id

// A single-hop win whose bare name is unambiguous (else the closest one).
const answerCity =
  p.answers.find((a) => resolvesToSelf(a.city))?.city ?? p.answers[0]?.city

// The city closest to half the target that is unambiguous and stays short of
// the win band (so guessing it leaves the round in progress).
const half = p.targetKm * 0.5
const bandLow = p.targetKm * (1 - p.tolerancePct)
const partialCity = allCities()
  .filter((c) => c.id !== p.start!.id)
  .map((c) => ({ c, dist: haversineKm(p.start!, c) }))
  .filter(({ dist }) => dist < bandLow)
  .sort((a, b) => Math.abs(a.dist - half) - Math.abs(b.dist - half))
  .find(({ c }) => resolvesToSelf(c))?.c

// The farthest unambiguous city from the start — comfortably past any target,
// so a single hop there busts the round.
const bustCity = allCities()
  .map((c) => ({ c, dist: haversineKm(p.start!, c) }))
  .filter(({ dist }) => dist > p.targetKm)
  .sort((a, b) => b.dist - a.dist)
  .find(({ c }) => resolvesToSelf(c))?.c

process.stdout.write(
  JSON.stringify({
    date,
    start: p.start!.name,
    targetKm: p.targetKm,
    answer: answerCity?.name ?? '',
    partial: partialCity?.name ?? '',
    bust: bustCity?.name ?? '',
  }),
)
