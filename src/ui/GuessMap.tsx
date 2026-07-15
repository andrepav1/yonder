// Azimuthal-equidistant "compass map" centred on the puzzle's start city. Each
// guess is plotted by its bearing (angle, clockwise from north) and distance
// (radius) from the start — so the map carries the direction cue that the guess
// rows used to spell out in degrees. The target win-band is highlighted as a
// ring. Purely presentational; the guess rows carry the same data as text.

import type { CSSProperties } from 'react'
import type { GuessResult, PuzzleSpec } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { cityLabel } from '@/lib/cities'
import { formatDistance } from '@/lib/format'

interface GuessMapProps {
  puzzle: PuzzleSpec
  guesses: GuessResult[]
  rules: GameRules
  unit: Unit
}

const SIZE = 240
const C = SIZE / 2 // centre
const MAX_R = 104 // outer boundary radius (px)
const HEADROOM = 1.12 // keep the outermost point off the rim

/** Screen coords for a bearing (deg, clockwise from north) at a given radius. */
function polar(bearingDeg: number, r: number): { x: number; y: number } {
  const rad = (bearingDeg * Math.PI) / 180
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) }
}

/** Even-odd annulus path (outer ring minus inner ring). */
function annulus(rOuter: number, rInner: number): string {
  const ring = (r: number, sweep: number) =>
    `M ${C} ${C - r} A ${r} ${r} 0 1 ${sweep} ${C} ${C + r} A ${r} ${r} 0 1 ${sweep} ${C} ${C - r} Z`
  return `${ring(rOuter, 0)} ${ring(rInner, 1)}`
}

const AXES: Array<{ label: string; bearing: number }> = [
  { label: 'N', bearing: 0 },
  { label: 'E', bearing: 90 },
  { label: 'S', bearing: 180 },
  { label: 'W', bearing: 270 },
]

export function GuessMap({ puzzle, guesses, rules, unit }: GuessMapProps) {
  const tol = puzzle.tolerancePct
  const bandOuterKm = puzzle.targetKm * (1 + tol)
  const bandInnerKm = puzzle.targetKm * (1 - tol)
  const maxGuessKm = guesses.reduce((m, g) => Math.max(m, g.distanceKm), 0)
  const scaleMaxKm = Math.max(bandOuterKm, maxGuessKm) * HEADROOM || 1

  const toR = (km: number) => Math.min(MAX_R, (km / scaleMaxKm) * MAX_R)
  const rTarget = toR(puzzle.targetKm)
  const rBandOuter = toR(bandOuterKm)
  const rBandInner = toR(bandInnerKm)

  const lastIdx = guesses.length - 1
  const label = `Compass map — ${guesses.length} guess${
    guesses.length === 1 ? '' : 'es'
  } around ${cityLabel(puzzle.start)}, plotted by direction and distance.`

  return (
    <section className="map" aria-label={label}>
      <svg
        className="map__svg"
        viewBox={`-14 -14 ${SIZE + 28} ${SIZE + 28}`}
        role="img"
        aria-hidden="true"
      >
        {/* faint concentric range rings for depth */}
        <g className="map__rings">
          {[0.4, 0.7].map((f) => (
            <circle key={f} cx={C} cy={C} r={MAX_R * f} />
          ))}
          <circle cx={C} cy={C} r={MAX_R} className="map__bound" />
        </g>

        {/* radial compass axes */}
        <g className="map__axes">
          {AXES.map(({ label: l, bearing }) => {
            const edge = polar(bearing, MAX_R)
            const text = polar(bearing, MAX_R + 11)
            return (
              <g key={l}>
                <line x1={C} y1={C} x2={edge.x} y2={edge.y} />
                <text x={text.x} y={text.y} className="map__axis-label">
                  {l}
                </text>
              </g>
            )
          })}
        </g>

        {/* target win-band + exact target ring */}
        <path className="map__band" d={annulus(rBandOuter, rBandInner)} fillRule="evenodd" />
        <circle cx={C} cy={C} r={rTarget} className="map__target" />

        {/* guesses: a spoke from the start plus a temperature-coloured pin */}
        <g>
          {guesses.map((g, i) => {
            const p = polar(g.bearingDeg, toR(g.distanceKm))
            const color = g.won ? 'var(--win)' : `var(--temp-${tempLevel(g, rules)})`
            const latest = i === lastIdx
            return (
              <g key={`${g.city.id}-${i}`} style={{ '--pin': color } as CSSProperties}>
                <line className="map__spoke" x1={C} y1={C} x2={p.x} y2={p.y} />
                <circle
                  className={`map__pin${latest ? ' map__pin--latest' : ''}`}
                  cx={p.x}
                  cy={p.y}
                  r={latest ? 5.5 : 4}
                />
              </g>
            )
          })}
        </g>

        {/* start city marker (centre) */}
        <circle cx={C} cy={C} r={5} className="map__start" />
        <circle cx={C} cy={C} r={2} className="map__start-dot" />
      </svg>

      <div className="map__legend">
        <span className="map__key map__key--start">Start</span>
        <span className="map__key map__key--guess">Your guesses</span>
        <span className="map__key map__key--target">
          Target ~{formatDistance(puzzle.targetKm, unit)}
        </span>
      </div>
    </section>
  )
}
