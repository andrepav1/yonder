// The game map: an orthographic globe leaning into the app's globe motif — a real
// Earth (Natural Earth 110m land, bundled — no tiles, no CDN) rotated so the start
// city sits at the centre, with a great-circle arc out to each guess. Shown live
// during play; on the result card `showAnswers` also marks the answer cities (off
// during play so it can't spoil) — the "here's where you actually wandered" payoff.
//
// Lazy-loaded (App + ResultCard), so d3-geo + the land data stay off the initial bundle.

import { useMemo, type CSSProperties } from 'react'
import {
  geoOrthographic,
  geoPath,
  geoGraticule10,
  geoInterpolate,
  geoDistance,
  type GeoSphere,
} from 'd3-geo'
import type { Topology } from 'topojson-specification'
import { feature } from 'topojson-client'
import landTopo from 'world-atlas/land-110m.json'
import type { GuessResult, PuzzleSpec } from '@/lib/types'
import type { GameRules } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'

const land = feature(landTopo as unknown as Topology, 'land')

const SIZE = 264
const PAD = 6
const SPHERE: GeoSphere = { type: 'Sphere' }
const ARC_STEPS = 48

interface GlobeMapProps {
  puzzle: PuzzleSpec
  guesses: GuessResult[]
  rules: GameRules
  /** Reveal the answer cities. Off during play — plotting them would spoil it. */
  showAnswers?: boolean
}

interface Pin {
  x: number
  y: number
  color: string
  latest: boolean
}

export default function GlobeMap({
  puzzle,
  guesses,
  rules,
  showAnswers = false,
}: GlobeMapProps) {
  const scene = useMemo(() => {
    const { lng, lat } = puzzle.start
    const center: [number, number] = [lng, lat]
    const projection = geoOrthographic()
      .rotate([-lng, -lat])
      .fitExtent(
        [
          [PAD, PAD],
          [SIZE - PAD, SIZE - PAD],
        ],
        SPHERE,
      )
    const path = geoPath(projection)
    const onFrontFace = (c: [number, number]) => geoDistance(c, center) < Math.PI / 2 - 1e-3

    const arcs = guesses.flatMap((g, i) => {
      const to: [number, number] = [g.city.lng, g.city.lat]
      const interp = geoInterpolate(center, to)
      const coords = Array.from({ length: ARC_STEPS + 1 }, (_, k) => interp(k / ARC_STEPS))
      const d = path({ type: 'LineString', coordinates: coords })
      if (!d) return []
      const color = g.won ? 'var(--win)' : `var(--temp-${tempLevel(g, rules)})`
      return [{ d, color, key: `${g.city.id}-${i}` }]
    })

    const pin = (c: [number, number], color: string, latest: boolean): Pin | null => {
      if (!onFrontFace(c)) return null
      const p = projection(c)
      return p ? { x: p[0], y: p[1], color, latest } : null
    }

    const lastIdx = guesses.length - 1
    const guessPins = guesses
      .map((g, i) =>
        pin(
          [g.city.lng, g.city.lat],
          g.won ? 'var(--win)' : `var(--temp-${tempLevel(g, rules)})`,
          i === lastIdx,
        ),
      )
      .filter((p): p is Pin => p !== null)

    const answerPins = showAnswers
      ? puzzle.answers
          .map((a) => pin([a.city.lng, a.city.lat], 'var(--win)', false))
          .filter((p): p is Pin => p !== null)
      : []

    const startPoint = projection(center)
    const hidden = guesses.length - guessPins.length

    return {
      sphere: path(SPHERE) ?? '',
      graticule: path(geoGraticule10()) ?? '',
      land: path(land) ?? '',
      arcs,
      guessPins,
      answerPins,
      start: startPoint ? { x: startPoint[0], y: startPoint[1] } : null,
      hidden,
    }
  }, [puzzle, guesses, rules, showAnswers])

  return (
    <div className="globe">
      <div className="globe__title">
        {showAnswers ? 'Where you wandered' : 'Your guesses on the globe'}
      </div>
      <svg
        className="globe__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Globe centred on ${puzzle.start.name}, showing an arc to each guess.`}
      >
        <path className="globe__ocean" d={scene.sphere} />
        <path className="globe__grat" d={scene.graticule} />
        <path className="globe__land" d={scene.land} />
        <path className="globe__ocean-edge" d={scene.sphere} />

        {scene.arcs.map((a) => (
          <path
            key={a.key}
            className="globe__arc"
            d={a.d}
            style={{ '--arc': a.color } as CSSProperties}
          />
        ))}

        {scene.answerPins.map((p, i) => (
          <circle key={`a${i}`} className="globe__answer" cx={p.x} cy={p.y} r={3} />
        ))}

        {scene.guessPins.map((p, i) => (
          <circle
            key={`g${i}`}
            className={`globe__pin${p.latest ? ' globe__pin--latest' : ''}`}
            cx={p.x}
            cy={p.y}
            r={p.latest ? 5 : 3.75}
            style={{ '--pin': p.color } as CSSProperties}
          />
        ))}

        {scene.start && (
          <>
            <circle className="globe__start" cx={scene.start.x} cy={scene.start.y} r={5} />
            <circle
              className="globe__start-dot"
              cx={scene.start.x}
              cy={scene.start.y}
              r={2}
            />
          </>
        )}
      </svg>

      <div className="globe__legend">
        <span className="globe__key globe__key--start">Start</span>
        <span className="globe__key globe__key--guess">Your guesses</span>
        {showAnswers && <span className="globe__key globe__key--answer">Answers</span>}
      </div>
      {scene.hidden > 0 && (
        <div className="globe__note">
          {scene.hidden} guess{scene.hidden === 1 ? '' : 'es'} over the horizon
        </div>
      )}
    </div>
  )
}
