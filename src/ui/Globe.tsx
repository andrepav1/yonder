// The interactive Earth — the main guessing surface. An orthographic globe
// (drag to spin) that renders, over a bundled low-res land outline:
//   • the day's start city (where the journey begins),
//   • the journey so far as a line linking start → each guess in order (the
//     legs whose lengths sum toward the target), pins coloured on the shared
//     hot→cold ramp, and
//   • once finished, the closest single-hop cities pinned as a reveal.
//
// It spins to face the start city on load, and smoothly re-centres on the
// latest guess each time one lands (drag interrupts the spin).
//
// Purely presentational: all geometry comes from props. The projection + d3-geo
// path strings are recomputed from the current rotation; nothing here mutates
// game state. Points on the far hemisphere are hidden via a great-circle test.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection } from 'geojson'
import landTopo from 'world-atlas/land-110m.json'
import type { City, GuessResult } from '@/lib/types'
import type { GameRules } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { cityLabel } from '@/lib/cities'

// world-atlas ships TopoJSON; hydrate the land outline once, at module load.
const land = feature(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  landTopo as any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (landTopo as any).objects.land,
) as unknown as FeatureCollection

const SIZE = 320 // internal SVG units; CSS scales it to the column width
const MARGIN = 3
const RADIUS = SIZE / 2 - MARGIN

type LngLat = [number, number]

interface GlobeProps {
  start: City
  guesses: GuessResult[]
  rules: GameRules
  /** Closest possible answers, revealed on the globe once the round is over. */
  answers?: City[]
  finished?: boolean
}

export function Globe({ start, guesses, rules, answers, finished }: GlobeProps) {
  // Rotation is [λ, φ]: spin the globe so the start city faces the viewer first.
  const [rotation, setRotation] = useState<LngLat>([-start.lng, -start.lat])
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number } | null>(null)
  const rotationRef = useRef<LngLat>(rotation)
  const animRef = useRef<number | null>(null)

  // Mirror the current rotation into a ref so animations/drag can read it
  // without re-subscribing.
  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])

  const stopAnim = () => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current)
      animRef.current = null
    }
  }

  // Smoothly spin the globe so [lng, lat] comes to the centre, taking the
  // shortest way round in longitude. Cancels any spin already in flight.
  const animateTo = (lng: number, lat: number) => {
    stopAnim()
    const from = rotationRef.current
    const to: LngLat = [-lng, -lat]
    const dλ = ((((to[0] - from[0] + 180) % 360) + 360) % 360) - 180
    const dφ = to[1] - from[1]
    const startTime = performance.now()
    const DURATION = 600
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / DURATION)
      // easeInOutQuad
      const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2
      setRotation([from[0] + dλ * e, from[1] + dφ * e])
      animRef.current = p < 1 ? requestAnimationFrame(tick) : null
    }
    animRef.current = requestAnimationFrame(tick)
  }

  // Re-centre on the start city whenever the day (and thus start) changes.
  useEffect(() => {
    stopAnim()
    setRotation([-start.lng, -start.lat])
  }, [start.lng, start.lat])

  // Spin to the latest guess whenever a new one lands.
  const last = guesses[guesses.length - 1]
  const lastLng = last?.city.lng
  const lastLat = last?.city.lat
  useEffect(() => {
    if (lastLng !== undefined && lastLat !== undefined) animateTo(lastLng, lastLat)
  }, [lastLng, lastLat])

  // Stop any in-flight spin on unmount.
  useEffect(() => stopAnim, [])

  const projection = useMemo(
    () =>
      geoOrthographic()
        .scale(RADIUS)
        .translate([SIZE / 2, SIZE / 2])
        .rotate([rotation[0], rotation[1], 0])
        .clipAngle(90),
    [rotation],
  )

  const path = useMemo(() => geoPath(projection), [projection])

  // The geographic point currently facing the viewer — used to hide markers
  // (and the start label) that have rotated round to the far side.
  const viewCenter: LngLat = [-rotation[0], -rotation[1]]
  const isVisible = (lng: number, lat: number): boolean =>
    geoDistance([lng, lat], viewCenter) <= Math.PI / 2
  /** Project a point, or null when it sits on the hidden far hemisphere. */
  const place = (lng: number, lat: number): [number, number] | null =>
    isVisible(lng, lat) ? (projection([lng, lat]) ?? null) : null

  const landPath = useMemo(() => path(land) ?? '', [path])
  const graticulePath = useMemo(() => path(geoGraticule10()) ?? '', [path])
  // The running journey: start → each guessed city, in order.
  const journeyPath = useMemo(() => {
    if (guesses.length === 0) return ''
    const coordinates: LngLat[] = [
      [start.lng, start.lat],
      ...guesses.map((g): LngLat => [g.city.lng, g.city.lat]),
    ]
    return path({ type: 'LineString', coordinates }) ?? ''
  }, [path, start.lng, start.lat, guesses])

  const startXY = place(start.lng, start.lat)

  // ---- Pointer drag → rotation ----------------------------------------
  const onPointerDown = (e: React.PointerEvent) => {
    stopAnim() // hand control to the drag mid-spin
    drag.current = { x: e.clientX, y: e.clientY }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return
    const rect = svgRef.current?.getBoundingClientRect()
    // Convert on-screen pixels → degrees. ~75/scale is the usual d3-globe
    // sensitivity; SIZE/rect.width corrects for the CSS-scaled display size.
    const k = (75 / RADIUS) * (rect ? SIZE / rect.width : 1)
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    drag.current = { x: e.clientX, y: e.clientY }
    setRotation(([λ, φ]) => [λ + dx * k, Math.max(-90, Math.min(90, φ - dy * k))])
  }
  const endDrag = (e: React.PointerEvent) => {
    drag.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
  }

  return (
    <div className="globe">
      <svg
        ref={svgRef}
        className="globe__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Globe centred on ${cityLabel(start)}, showing your journey of guesses. Drag to spin.`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
      >
        {/* Ocean sphere */}
        <circle className="globe__sphere" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
        <path className="globe__graticule" d={graticulePath} />
        <path className="globe__land" d={landPath} />
        <path className="globe__journey" d={journeyPath} />
        <circle className="globe__edge" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />

        {/* Revealed closest answers (after the round ends) */}
        {finished &&
          answers?.map((c) => {
            const p = place(c.lng, c.lat)
            return p ? (
              <circle
                key={`ans-${c.id}`}
                className="globe__answer"
                cx={p[0]}
                cy={p[1]}
                r={3.5}
              />
            ) : null
          })}

        {/* Guess pins, coloured on the hot→cold ramp */}
        {guesses.map((g, i) => {
          const p = place(g.city.lng, g.city.lat)
          if (!p) return null
          const level = tempLevel(g, rules)
          return (
            <circle
              key={`g-${g.city.id}-${i}`}
              className={`globe__pin${g.won ? ' globe__pin--win' : ''}`}
              style={{ '--temp': `var(--temp-${level})` } as CSSProperties}
              cx={p[0]}
              cy={p[1]}
              r={4.5}
            />
          )
        })}

        {/* Start city marker + label */}
        {startXY && (
          <g className="globe__start">
            <circle className="globe__start-halo" cx={startXY[0]} cy={startXY[1]} r={7} />
            <circle
              className="globe__start-dot"
              cx={startXY[0]}
              cy={startXY[1]}
              r={3.5}
            />
            <text className="globe__start-label" x={startXY[0]} y={startXY[1] - 11}>
              {cityLabel(start)}
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}
