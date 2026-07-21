// The interactive Earth — the main guessing surface, and the end-of-round
// "learn the map" reveal. An orthographic globe (drag to spin) that renders,
// over a bundled low-res land outline:
//   • the day's start city (where the journey begins),
//   • the journey so far as a line linking start → each guess in order (the
//     legs whose lengths sum toward the target), pins coloured on the shared
//     hot→cold ramp, and
//   • once finished, an explorable reveal of cities the player *could* have
//     guessed: the closest single-hop wins from the start (ideal), plus the
//     cities that would have completed the run from where they actually stopped
//     (personal near-misses). Tap any revealed pin to read its name + distance.
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
import type { AnswerCity, City, GuessResult } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { cityLabel, localizedName } from '@/lib/cities'
import { formatDistance } from '@/lib/format'
import { useI18n } from '@/i18n/context'

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
// How close (in SVG units) a tap must land to a revealed pin to select it.
const TAP_HIT_RADIUS = 12
// How far a pointer may travel (client px) and still count as a tap, not a drag.
const TAP_MOVE_TOLERANCE = 6

type LngLat = [number, number]

/** The end-of-round learning reveal — two kinds of "you could have guessed…". */
export interface RevealData {
  /** Closest single-hop wins from the start — the ideal solutions. */
  ideal: AnswerCity[]
  /** Cities that would have completed the run from where the player stopped. */
  completions: AnswerCity[]
  /** The point completions are measured from (last guess, or the start). */
  from: City
}

type RevealKind = 'ideal' | 'completion'
interface RevealPin {
  city: City
  distanceKm: number
  kind: RevealKind
  /** The point this pin's distance is measured from (start, or the stop point). */
  from: City
}

interface GlobeProps {
  start: City
  guesses: GuessResult[]
  rules: GameRules
  unit: Unit
  /** Learning reveal, shown once the round is over. */
  reveal?: RevealData
  finished?: boolean
}

export function Globe({ start, guesses, rules, unit, reveal, finished }: GlobeProps) {
  const { t, locale } = useI18n()
  // Rotation is [λ, φ]: spin the globe so the start city faces the viewer first.
  const [rotation, setRotation] = useState<LngLat>([-start.lng, -start.lat])
  // A tap pins a selection; hovering (mouse) previews one transiently. The
  // "active" pin — whichever the player is pointing at, else the pinned one —
  // drives the label, caption, and missed-leg.
  const [selected, setSelected] = useState<RevealPin | null>(null)
  const [hovered, setHovered] = useState<RevealPin | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  // Tap detection rides alongside the drag: remember where a press started and
  // whether it wandered far enough to be a spin rather than a tap.
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null)
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
    // Respect reduced-motion: re-centre instantly instead of spinning.
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      setRotation([from[0] + dλ, from[1] + dφ])
      return
    }
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

  // The revealed pins, completions first so a city that is both takes the more
  // personal "completion" identity (and each id renders once).
  const revealPins = useMemo<RevealPin[]>(() => {
    if (!finished || !reveal) return []
    const pins: RevealPin[] = []
    const seen = new Set<number>()
    for (const a of reveal.completions) {
      if (seen.has(a.city.id)) continue
      seen.add(a.city.id)
      pins.push({ city: a.city, distanceKm: a.distanceKm, kind: 'completion', from: reveal.from })
    }
    for (const a of reveal.ideal) {
      if (seen.has(a.city.id)) continue
      seen.add(a.city.id)
      pins.push({ city: a.city, distanceKm: a.distanceKm, kind: 'ideal', from: start })
    }
    return pins
  }, [finished, reveal, start])

  // A selection only makes sense against the current reveal; drop it otherwise.
  useEffect(() => {
    setSelected(null)
    setHovered(null)
  }, [revealPins])

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

  // Whichever pin the player is engaging with — hovered (mouse) beats the
  // pinned tap-selection — drives the label, caption, and missed-leg.
  const active = hovered ?? selected

  // The missing hop for an engaged completion — the leg the player didn't take.
  const activeLegPath = useMemo(() => {
    if (!active || active.kind !== 'completion') return ''
    const coordinates: LngLat[] = [
      [active.from.lng, active.from.lat],
      [active.city.lng, active.city.lat],
    ]
    return path({ type: 'LineString', coordinates }) ?? ''
  }, [path, active])

  const startXY = place(start.lng, start.lat)

  // ---- Pointer drag → rotation ----------------------------------------
  // Pointer capture keeps every move/up for the *dragging* pointer routed to
  // the SVG even when the finger strays outside the (square) element while
  // spinning the (round) globe — so the spin follows the finger unbroken and
  // only ends on pointerup/pointercancel. We deliberately don't end the drag
  // on pointerleave (with capture the finger is never really "gone"), which is
  // what used to freeze the globe mid-spin on touch.
  const onPointerDown = (e: React.PointerEvent) => {
    if (drag.current) return // ignore extra fingers once a drag owns the globe
    stopAnim() // hand control to the drag mid-spin
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    press.current = { x: e.clientX, y: e.clientY, moved: false }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    // Not dragging: preview the revealed pin under the pointer (mouse hover).
    if (!drag.current) {
      if (revealPins.length > 0) setHovered(pinAt(e.clientX, e.clientY))
      return
    }
    if (e.pointerId !== drag.current.id) return
    const rect = svgRef.current?.getBoundingClientRect()
    // Convert on-screen pixels → degrees. ~75/scale is the usual d3-globe
    // sensitivity; SIZE/rect.width corrects for the CSS-scaled display size.
    const k = (75 / RADIUS) * (rect ? SIZE / rect.width : 1)
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    if (press.current && Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > TAP_MOVE_TOLERANCE) {
      press.current.moved = true
    }
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    setRotation(([λ, φ]) => [λ + dx * k, Math.max(-90, Math.min(90, φ - dy * k))])
  }
  // Clear the hover preview when the pointer leaves the globe entirely.
  const onPointerLeave = () => setHovered(null)
  // Ends on pointerup and pointercancel — the latter (fired when the browser
  // takes over the touch) must clear the drag too, or the next gesture starts
  // from stale coordinates. A press that never wandered counts as a tap and
  // selects the nearest revealed pin (or clears the selection).
  const endDrag = (e: React.PointerEvent) => {
    if (!drag.current || e.pointerId !== drag.current.id) return
    const tap = press.current && !press.current.moved
    drag.current = null
    press.current = null
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    if (tap && e.type === 'pointerup') setSelected(pinAt(e.clientX, e.clientY))
  }

  // The closest visible revealed pin to a screen point, within the hit radius,
  // or null (pointing at empty ocean). Shared by tap-select and hover-preview.
  const pinAt = (clientX: number, clientY: number): RevealPin | null => {
    if (revealPins.length === 0) return null
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null
    const sx = ((clientX - rect.left) / rect.width) * SIZE
    const sy = ((clientY - rect.top) / rect.height) * SIZE
    let best: RevealPin | null = null
    let bestD = TAP_HIT_RADIUS
    for (const pin of revealPins) {
      const p = place(pin.city.lng, pin.city.lat)
      if (!p) continue
      const d = Math.hypot(p[0] - sx, p[1] - sy)
      if (d <= bestD) {
        bestD = d
        best = pin
      }
    }
    return best
  }

  const activeXY = active ? place(active.city.lng, active.city.lat) : null

  // Keep the label in one stable spot: centred above the dot (dropping just
  // below only when the dot sits right at the top edge). It never shifts
  // side-to-side with the dot's position — text-anchor stays middle in CSS.
  const labelLayout = (x: number, y: number) => ({ x, y: y > 26 ? y - 10 : y + 18 })

  return (
    <div className="globe">
      <svg
        ref={svgRef}
        className="globe__svg"
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={t.globe.label(cityLabel(start, locale))}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onPointerLeave={onPointerLeave}
      >
        {/* Ocean sphere */}
        <circle className="globe__sphere" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />
        <path className="globe__graticule" d={graticulePath} />
        <path className="globe__land" d={landPath} />
        <path className="globe__journey" d={journeyPath} />
        {/* The missing hop to an engaged completion — the leg not taken */}
        {activeLegPath && <path className="globe__missed-leg" d={activeLegPath} />}
        <circle className="globe__edge" cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} />

        {/* Explore reveal: cities the player could have guessed */}
        {revealPins.map((pin) => {
          const p = place(pin.city.lng, pin.city.lat)
          if (!p) return null
          const isActive = active?.city.id === pin.city.id
          return (
            <g key={`rv-${pin.city.id}`}>
              {isActive && (
                <circle
                  className={`globe__reveal-halo globe__reveal-halo--${pin.kind}`}
                  cx={p[0]}
                  cy={p[1]}
                  r={8}
                />
              )}
              <circle
                className={`globe__reveal globe__reveal--${pin.kind}${isActive ? ' globe__reveal--active' : ''}`}
                cx={p[0]}
                cy={p[1]}
                r={isActive ? 4.5 : 2.8}
              />
            </g>
          )
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
              r={3.2}
            />
          )
        })}

        {/* Label the engaged reveal pin (just the name — the caption has the rest) */}
        {active &&
          activeXY &&
          (() => {
            const l = labelLayout(activeXY[0], activeXY[1])
            return (
              <text className="globe__reveal-label" x={l.x} y={l.y}>
                {localizedName(active.city, locale)}
              </text>
            )
          })()}

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
            {(() => {
              const l = labelLayout(startXY[0], startXY[1])
              return (
                <text className="globe__start-label" x={l.x} y={l.y}>
                  {cityLabel(start, locale)}
                </text>
              )
            })()}
          </g>
        )}
      </svg>

      {/* Caption: the engaged city's detail, or a hint to go exploring */}
      {finished && revealPins.length > 0 && (
        <div className="globe__caption" aria-live="polite">
          {active ? (
            <span className="globe__caption-detail">
              <strong>{cityLabel(active.city, locale)}</strong>
              <span className="globe__caption-dist mono">
                {formatDistance(active.distanceKm, unit, t)}
              </span>
              <span className={`globe__tag globe__tag--${active.kind}`}>
                {active.kind === 'completion'
                  ? t.globe.reveal.completion
                  : t.globe.reveal.ideal}
              </span>
            </span>
          ) : (
            t.globe.reveal.hint
          )}
        </div>
      )}
    </div>
  )
}
