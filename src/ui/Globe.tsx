// The interactive Earth — the main guessing surface, an explorable world map,
// and the end-of-round "learn the map" reveal. An orthographic globe (drag to
// spin, pinch/scroll/buttons to zoom) that renders, over a bundled low-res land
// outline:
//   • the day's start city, when the mode has one (where the journey begins —
//     Hidden Destination has no origin, so it opens on a plain world view),
//   • the journey so far as a line linking start → each guess in order (the
//     legs whose lengths sum toward the target), pins coloured on the shared
//     hot→cold ramp,
//   • an explorable layer of real cities — the biggest first, more revealed the
//     further you zoom in (or the whole `cities` pool at once when `exploreAll`,
//     as Hidden Destination does with its capitals) — tap one to read its name, and
//   • once finished, an explorable reveal of cities the player *could* have
//     guessed: the closest single-hop wins from the start (ideal), plus the
//     cities that would have completed the run from where they actually stopped
//     (personal near-misses). Tap any revealed pin to read its name + distance.
//
// It spins to face the start city on load, and smoothly re-centres on the
// latest guess each time one lands (drag interrupts the spin).
//
// Purely presentational: all geometry comes from props. The projection + d3-geo
// path strings are recomputed from the current rotation + zoom; nothing here
// mutates game state. Points on the far hemisphere are hidden via a great-circle
// test; when zoomed in, the globe simply grows past the board and off the screen
// (rendered beneath the surrounding UI, which stays legible on top), and
// off-viewport city dots are culled.

import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { geoOrthographic, geoPath, geoGraticule10, geoDistance } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import type { FeatureCollection } from 'geojson'
import worldTopo from 'world-atlas/countries-110m.json'
import fineTopo from '@/data/outline.json'
import elevationTopo from '@/data/elevation.json'
import type { AnswerCity, City, GuessResult } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { cityLabel, localizedName } from '@/lib/cities'
import { exploreMinPopulation } from '@/lib/explore'
import { toLayer, visible, visibleRadiusDeg, type Layer } from '@/lib/cull'
import { wrapLonDeg } from '@/lib/geo'
import { formatDistance } from '@/lib/format'
import { useI18n } from '@/i18n/context'

/** A coastline + border pair at one level of detail, ready to cull. */
interface OutlineLayers {
  land: Layer
  borders: Layer
}

// Hydrate a topology into the outline pair the globe draws. world-atlas ships
// whole countries, so the interior boundaries are meshed out here — the
// (a, b) => a !== b filter keeps only arcs shared by two different countries, so
// every boundary is one line and the coastline, which `.globe__coast` already
// strokes, isn't painted over a second time. Our own artifact stores that mesh
// ready-made, already thinned at its own weight (borders and coastlines simplify
// at very different rates — see build-outline.mjs).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toOutline(topo: any): OutlineLayers {
  return {
    land: toLayer(feature(topo, topo.objects.land) as unknown as FeatureCollection),
    borders: toLayer(
      topo.objects.borders
        ? (feature(topo, topo.objects.borders) as unknown as FeatureCollection)
        : mesh(topo, topo.objects.countries, (a, b) => a !== b),
    ),
  }
}

/** The relief as the globe draws it: one layer per band, plus the ice sheets. */
interface Relief {
  bands: Layer[]
  ice: Layer
}

// Hydrate a relief topology, bands sorted by threshold ascending — the array
// index *is* the tint (globe__hypso--N), so the order is load-bearing.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toRelief(topo: any): Relief {
  const fc = feature(topo, topo.objects.bands) as unknown as FeatureCollection
  return {
    bands: [...fc.features]
      .sort((a, b) => Number(a.properties?.v ?? 0) - Number(b.properties?.v ?? 0))
      .map((f) => toLayer(f)),
    ice: toLayer(feature(topo, topo.objects.ice) as unknown as FeatureCollection),
  }
}

// Two outline tiers, both bundled. The 110m outline carries the whole-globe
// view; `outline.json` (world-atlas 50m, thinned by scripts/build-outline.mjs)
// takes over past DETAIL_ZOOM, where 110m starts reading as polygons and its
// missing island chains are conspicuous. Zoomed out we stay on the coarse one —
// nothing is gained by re-projecting several times the vertices for a globe the
// size of a coin. The fine tier is hydrated on first use, not at module load: a
// round that never zooms in shouldn't pay for it.
const coarseWorld: OutlineLayers = toOutline(worldTopo)
let fineCache: OutlineLayers | null = null
const fineWorld = (): OutlineLayers => (fineCache ??= toOutline(fineTopo))

const bundledRelief: Relief = toRelief(elevationTopo)
// How many tints the `--hypso-*` CSS ramp defines. A fetched tier with a
// different band count would be mis-coloured, so it is refused instead.
const RAMP_BANDS = bundledRelief.bands.length

// The graticule never changes, so build it once rather than per frame.
const graticule = geoGraticule10()

const SIZE = 320 // internal SVG units; CSS scales it to the column width
const MARGIN = 3
const RADIUS = SIZE / 2 - MARGIN

/**
 * The globe's projection at a given zoom + rotation. One definition, so the
 * frame that gets drawn and the anchor maths in `zoomAbout` can never disagree
 * about scale, centre or clip.
 */
const orthographic = (zoom: number, [λ, φ]: LngLat) =>
  geoOrthographic()
    .scale(RADIUS * zoom)
    .translate([SIZE / 2, SIZE / 2])
    .rotate([λ, φ, 0])
    .clipAngle(90)
// How close (in SVG units) a tap must land to a pin to select it.
const TAP_HIT_RADIUS = 12
// How far a pointer may travel (client px) and still count as a tap, not a drag.
const TAP_MOVE_TOLERANCE = 6
// Drop explore-city dots that project beyond the board by more than this pad.
const CULL_PAD = 8
// Multiplier per press of the +/− zoom buttons.
const ZOOM_STEP = 1.4
// How long the globe takes to spin to a new centre (ms).
const SPIN_DURATION = 600
// How long a button-press zoom takes to ease in (ms). Wheel and pinch are
// already continuous — only the buttons would otherwise cut straight to the new
// scale, which reads as a jump rather than as moving closer.
const ZOOM_DURATION = 320
// Zoom past this and the globe swaps its 110m outline for the finer one (see
// `fineWorld`). Chosen a little above the first button press, so the swap lands
// when a player is clearly going in for a look rather than nudging the scale.
const DETAIL_ZOOM = 2.2
// Zoom past this and the *relief* gets its own finer tier. Unlike the outline,
// that one is too big to bundle (~1.2 MB), so it is fetched on demand the first
// time a player goes in far enough to see 0.2° cells as blocks — and the globe
// carries on with the bundled bands if the fetch never lands.
const FINE_RELIEF_ZOOM = 3.2
// Pinch sensitivity: the change in finger separation is raised to this power
// before it scales the zoom, so a small spread magnifies more (>1 = faster,
// snappier pinch). 1 would track the fingers exactly.
const PINCH_SENSITIVITY = 1.6
// Opening view for a mode with no start city: [λ, φ] facing 20°E / 15°N, which
// puts most of the landmasses on the near hemisphere.
const HOME_ROTATION: LngLat = [-20, -15]

type LngLat = [number, number]

/** The end-of-round learning reveal — the cities a player could have guessed. */
export interface RevealData {
  /** Closest single-hop wins from the start — the ideal solutions. */
  ideal: AnswerCity[]
  /** Cities that would have completed the run from where the player stopped. */
  completions: AnswerCity[]
  /**
   * The point completions are measured from (last guess, or the start). Absent
   * in modes with no journey (Hidden Destination), which reveal only `answer`.
   */
  from?: City
  /**
   * Hidden Destination: the single mystery city, revealed as the answer. It has
   * no distance to report — the round measured nothing from anywhere.
   */
  answer?: City
}

type RevealKind = 'ideal' | 'completion' | 'answer'
interface RevealPin {
  city: City
  /** Distance from `from`, km. Absent on a pin that measures from nowhere. */
  distanceKm?: number
  kind: RevealKind
  /** The point this pin's distance is measured from (start, or the stop point). */
  from?: City
}

/** What the player is pointing at / has pinned: a reveal pin, or a plain city. */
type Selection =
  | { type: 'reveal'; pin: RevealPin }
  | { type: 'city'; city: City }

const selectionCity = (s: Selection): City => (s.type === 'reveal' ? s.pin.city : s.city)

interface GlobeProps {
  /**
   * Where the round begins — drawn as the start marker and the anchor the globe
   * first faces. Omitted by modes with no origin (Hidden Destination), which
   * open on a plain world view.
   */
  start?: City
  guesses: GuessResult[]
  rules: GameRules
  unit: Unit
  /** The explorable city universe (biggest population first). Tap to read a name. */
  cities: City[]
  /**
   * Show every city in `cities` at any zoom instead of filtering by the
   * zoom/population ramp. For modes whose pool is already small and curated —
   * Hidden Destination passes the ~160 capitals, so its hint reveals capitals
   * (the only cities that can be the answer) rather than the whole dataset.
   */
  exploreAll?: boolean
  /**
   * In-round hint reveal (unlocked from the header menu): 0 = no city dots (the
   * default while playing), 1 = dots visible, 2 = dots visible + tappable for
   * names. Once the round is finished the dots always show and are always
   * tappable, regardless of this.
   */
  hintLevel?: number
  /** Learning reveal, shown once the round is over. */
  reveal?: RevealData
  finished?: boolean
  /**
   * Draw the journey line linking start → each guess in order. True for the
   * cumulative-path game (Classic); false for probe modes like Hidden
   * Destination, where guesses aren't a connected route.
   */
  showJourney?: boolean
}

export function Globe({
  start,
  guesses,
  rules,
  unit,
  cities,
  exploreAll = false,
  hintLevel = 0,
  reveal,
  finished,
  showJourney = true,
}: GlobeProps) {
  const { t, locale } = useI18n()
  const { minZoom, maxZoom } = rules.explore
  // The explorable city dots are hidden while playing until a hint unlocks them
  // (level ≥ 1 shows the dots, level ≥ 2 lets you tap one for its name). Once the
  // round is over the dots always show and are always tappable.
  const showCities = !!finished || hintLevel >= 1
  const citiesInteractive = !!finished || hintLevel >= 2
  // Rotation is [λ, φ]: spin the globe so the start city faces the viewer first
  // (a neutral world view when the mode has no start).
  const [rotation, setRotation] = useState<LngLat>(() =>
    start ? [-start.lng, -start.lat] : HOME_ROTATION,
  )
  // Zoom magnifies the globe (1 = the full disc fits the board).
  const [zoom, setZoom] = useState(minZoom)
  // A tap pins a selection; hovering (mouse) previews one transiently. The
  // "active" selection — whichever the player is pointing at, else the pinned
  // one — drives the label, caption, and missed-leg.
  const [selected, setSelected] = useState<Selection | null>(null)
  const [hovered, setHovered] = useState<Selection | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<{ x: number; y: number; id: number } | null>(null)
  // Tap detection rides alongside the drag: remember where a press started and
  // whether it wandered far enough to be a spin rather than a tap.
  const press = useRef<{ x: number; y: number; moved: boolean } | null>(null)
  const rotationRef = useRef<LngLat>(rotation)
  const zoomRef = useRef(zoom)
  const animRef = useRef<number | null>(null)
  const zoomAnimRef = useRef<number | null>(null)
  // Active (pressed) pointers, for pinch-zoom. A plain mouse hover never lands
  // here — only pointers that went down on the globe.
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDist = useRef<number | null>(null)

  // The deep-zoom relief, once fetched. Null until someone zooms in far enough
  // to want it — and if the fetch fails, permanently (the bundled bands stay).
  const [fineRelief, setFineRelief] = useState<Relief | null>(null)
  const wantFineRelief = zoom >= FINE_RELIEF_ZOOM

  const clampZoom = (z: number) => Math.max(minZoom, Math.min(maxZoom, z))

  // Mirror rotation + zoom into refs so animations / native listeners can read
  // the latest without re-subscribing.
  useEffect(() => {
    rotationRef.current = rotation
  }, [rotation])
  useEffect(() => {
    zoomRef.current = zoom
  }, [zoom])

  const stopAt = (ref: React.MutableRefObject<number | null>) => {
    if (ref.current !== null) {
      cancelAnimationFrame(ref.current)
      ref.current = null
    }
  }
  const stopAnim = () => stopAt(animRef)
  const stopZoomAnim = () => stopAt(zoomAnimRef)

  /**
   * Drive `apply` with an eased 0→1 over `duration`, tracking the frame in
   * `ref` so it can be cancelled. Returns false when motion is unwanted, so the
   * caller can jump straight to the end state instead.
   */
  const runEase = (
    ref: React.MutableRefObject<number | null>,
    duration: number,
    apply: (eased: number) => void,
  ): boolean => {
    stopAt(ref)
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return false
    const startTime = performance.now()
    const tick = (now: number) => {
      const p = Math.min(1, (now - startTime) / duration)
      // easeInOutQuad
      apply(p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2)
      ref.current = p < 1 ? requestAnimationFrame(tick) : null
    }
    ref.current = requestAnimationFrame(tick)
    return true
  }

  // Ease the zoom to a target rather than cutting to it, so a button press reads
  // as moving closer. Interpolates *geometrically* — equal ratios per frame —
  // because equal increments of scale visibly decelerate as the globe grows.
  const animateZoom = (target: number) => {
    const from = zoomRef.current
    const to = clampZoom(target)
    if (Math.abs(to - from) < 1e-3) {
      setZoom(to)
      return
    }
    // Interpolate *geometrically* — equal ratios per frame — because equal
    // increments of scale visibly decelerate as the globe grows.
    const eased = runEase(zoomAnimRef, ZOOM_DURATION, (e) =>
      setZoom(from * Math.pow(to / from, e)),
    )
    if (!eased) setZoom(to)
  }

  // Zoom about a point on screen, keeping whatever sits under the pointer (or
  // under the middle of a pinch) *under* it — the thing that makes a zoom feel
  // like moving in rather than like the picture growing.
  //
  // Scaling alone happens about the globe's centre, which slides the anchor
  // outward. An orthographic rotation is not a translation, so we can't cancel
  // that exactly; instead we measure the drift — where the anchor points before
  // versus after the scale change — and spin by the difference. That's exact at
  // the anchor itself, and the small-angle error away from it is invisible.
  const zoomAbout = (target: number, clientX: number, clientY: number) => {
    const next = clampZoom(target)
    const rect = svgRef.current?.getBoundingClientRect()
    setZoom(next)
    if (!rect || rect.width === 0) return
    const toSvg = SIZE / rect.width
    const p: [number, number] = [
      (clientX - rect.left) * toSvg,
      (clientY - rect.top) * toSvg,
    ]
    const rotation = rotationRef.current
    const before = orthographic(zoomRef.current, rotation).invert?.(p)
    const after = orthographic(next, rotation).invert?.(p)
    if (!before || !after) return
    const dλ = wrapLonDeg(after[0] - before[0])
    const dφ = after[1] - before[1]
    // Outside the disc the inverse is meaningless and can swing wildly; a sane
    // anchor only ever drifts a few degrees per step.
    if (!Number.isFinite(dλ) || !Number.isFinite(dφ)) return
    if (Math.abs(dλ) > 45 || Math.abs(dφ) > 45) return
    setRotation(([rλ, rφ]) => [rλ + dλ, Math.max(-90, Math.min(90, rφ + dφ))])
  }

  // Smoothly spin the globe so [lng, lat] comes to the centre, taking the
  // shortest way round in longitude. Cancels any spin already in flight.
  const animateTo = (lng: number, lat: number) => {
    const from = rotationRef.current
    const dλ = wrapLonDeg(-lng - from[0])
    const dφ = -lat - from[1]
    const eased = runEase(animRef, SPIN_DURATION, (e) =>
      setRotation([from[0] + dλ * e, from[1] + dφ * e]),
    )
    // Reduced motion: re-centre instantly instead of spinning.
    if (!eased) setRotation([from[0] + dλ, from[1] + dφ])
  }

  // Re-centre + reset zoom whenever the day (and thus start) changes.
  const startLng = start?.lng
  const startLat = start?.lat
  useEffect(() => {
    stopAnim()
    stopZoomAnim()
    setRotation(
      startLng !== undefined && startLat !== undefined
        ? [-startLng, -startLat]
        : HOME_ROTATION,
    )
    setZoom(minZoom)
  }, [startLng, startLat, minZoom])

  // Spin to the latest guess whenever a new one lands.
  const last = guesses[guesses.length - 1]
  const lastLng = last?.city.lng
  const lastLat = last?.city.lat
  useEffect(() => {
    if (lastLng !== undefined && lastLat !== undefined) animateTo(lastLng, lastLat)
  }, [lastLng, lastLat])

  // Stop any in-flight spin or zoom on unmount.
  useEffect(
    () => () => {
      stopAnim()
      stopZoomAnim()
    },
    [],
  )

  // Fetch the finer relief the first time the player zooms past FINE_RELIEF_ZOOM.
  // It rides in its own chunk, so a round that never goes in close never pays for
  // it. A failure is not something the player needs told: the bundled bands are
  // already on screen and stay there.
  //
  // Depending on the *threshold* rather than on `zoom` matters: `zoom` changes
  // every frame of a drag or an eased press, which would tear this effect down
  // and re-run it constantly — and the cleanup would then cancel the very fetch
  // it had just started. As a boolean that flips once, the ordinary cancel flag
  // is correct again.
  useEffect(() => {
    // Once hydrated, keep it: crossing the threshold again must not re-do the
    // (substantial) work of cutting the tier into pieces.
    if (!wantFineRelief || fineRelief) return
    let cancelled = false
    import('@/data/elevation-fine.json')
      .then((mod) => {
        if (cancelled) return
        const relief = toRelief(mod.default ?? mod)
        // A tier that doesn't match the CSS ramp would be mis-coloured; the
        // bundled bands are already on screen and are the safer fallback.
        if (relief.bands.length === RAMP_BANDS) setFineRelief(relief)
      })
      .catch(() => {
        // Keep the bundled relief.
      })
    return () => {
      cancelled = true
    }
  }, [wantFineRelief, fineRelief])

  // Wheel to zoom. A native, non-passive listener so we can preventDefault and
  // stop the page scrolling under the gesture.
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      stopZoomAnim()
      const factor = Math.exp(-e.deltaY * 0.0015)
      zoomAbout(zoomRef.current * factor, e.clientX, e.clientY)
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    // zoomAbout reads rotation + zoom through refs, so this listener never needs
    // re-subscribing as they change.
    return () => el.removeEventListener('wheel', onWheel)
  }, [minZoom, maxZoom])

  // The revealed pins, completions first so a city that is both takes the more
  // personal "completion" identity (and each id renders once).
  const revealPins = useMemo<RevealPin[]>(() => {
    if (!finished || !reveal) return []
    const pins: RevealPin[] = []
    const seen = new Set<number>()
    // The mystery city stands alone: no origin, so no distance to report.
    if (reveal.answer) {
      seen.add(reveal.answer.id)
      pins.push({ city: reveal.answer, kind: 'answer' })
    }
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

  // When a mode reveals a single answer (Hidden Destination), spin it into view
  // — it's the whole point of the ending, and the last guess may have left it on
  // the far hemisphere. Declared after the spin-to-latest-guess effect so it
  // wins the frame in which the round finishes.
  const answerLng = reveal?.answer?.lng
  const answerLat = reveal?.answer?.lat
  useEffect(() => {
    if (finished && answerLng !== undefined && answerLat !== undefined)
      animateTo(answerLng, answerLat)
  }, [finished, answerLng, answerLat])

  // A selection only makes sense against the current reveal; drop it when the
  // reveal set changes (day / round change).
  useEffect(() => {
    setSelected(null)
    setHovered(null)
  }, [revealPins])

  // The explorable city universe at the current zoom: cities big enough to show,
  // minus the ones that already carry their own marker (start, guesses, reveal).
  // A curated pool (`exploreAll`) is small enough to show whole at any zoom.
  const exploreThreshold = exploreAll ? 0 : exploreMinPopulation(zoom, rules)
  const revealIds = useMemo(() => new Set(revealPins.map((p) => p.city.id)), [revealPins])
  const startId = start?.id
  const exploreCandidates = useMemo(() => {
    const excluded = new Set<number>()
    if (startId !== undefined) excluded.add(startId)
    for (const g of guesses) excluded.add(g.city.id)
    for (const id of revealIds) excluded.add(id)
    const out: City[] = []
    for (const c of cities) {
      if (c.population < exploreThreshold) continue
      if (excluded.has(c.id)) continue
      out.push(c)
    }
    return out
  }, [cities, exploreThreshold, startId, guesses, revealIds])

  // Drop a pinned city that has zoomed out of existence, so its label/caption
  // never outlive its dot.
  useEffect(() => {
    setSelected((s) =>
      s && s.type === 'city' && !exploreCandidates.some((c) => c.id === s.city.id) ? null : s,
    )
  }, [exploreCandidates])

  const projection = useMemo(() => orthographic(zoom, rotation), [rotation, zoom])

  const path = useMemo(() => geoPath(projection), [projection])

  // The geographic point currently facing the viewer — used to hide markers
  // (and the start label) that have rotated round to the far side.
  const viewCenter: LngLat = [-rotation[0], -rotation[1]]
  const isVisible = (lng: number, lat: number): boolean =>
    geoDistance([lng, lat], viewCenter) <= Math.PI / 2
  /** Project a point, or null when it sits on the hidden far hemisphere. */
  const place = (lng: number, lat: number): [number, number] | null =>
    isVisible(lng, lat) ? (projection([lng, lat]) ?? null) : null

  // Which detail tier is on screen (see the tier note by `fineWorld`).
  const outline = zoom >= DETAIL_ZOOM ? fineWorld() : coarseWorld
  // Everything below is drawn from the pieces that fall inside the view, so a
  // zoomed-in frame costs what it shows rather than what the planet holds.
  // Reach the board's corner, not its edge — the diagonal is what stays visible.
  const cullRadius = visibleRadiusDeg(RADIUS * zoom, Math.SQRT2 * (SIZE / 2) + CULL_PAD)
  // Deliberately not memoised, and deliberately not a dependency below: `near`
  // is a pure function of the rotation and zoom that `path` is built from, so
  // `path` changing is exactly when these need recomputing.
  const near = (layer: Layer) => visible(layer, viewCenter, cullRadius)

  const landPath = useMemo(() => path(near(outline.land)) ?? '', [path, outline])
  const bordersPath = useMemo(() => path(near(outline.borders)) ?? '', [path, outline])
  const graticulePath = useMemo(() => path(graticule) ?? '', [path])
  // The hypsometric bands, projected at the current rotation/zoom. One path per
  // elevation band; d3-geo clips each to the near hemisphere for us.
  const relief = fineRelief && wantFineRelief ? fineRelief : bundledRelief
  const bandPaths = useMemo(() => relief.bands.map((layer) => path(near(layer)) ?? ''), [path, relief])
  // The ice sheets, projected the same way (a single combined path).
  const icePath = useMemo(() => path(near(relief.ice)) ?? '', [path, relief])
  // The running journey: start → each guessed city, in order.
  const journeyPath = useMemo(() => {
    if (!showJourney || !start || guesses.length === 0) return ''
    const coordinates: LngLat[] = [
      [start.lng, start.lat],
      ...guesses.map((g): LngLat => [g.city.lng, g.city.lat]),
    ]
    return path({ type: 'LineString', coordinates }) ?? ''
  }, [path, start, guesses, showJourney])

  // The explore dots actually on screen: projected, culled to the near
  // hemisphere + viewport, and capped (biggest kept — candidates are pop-sorted).
  const exploreDots = useMemo(() => {
    const dots: { city: City; x: number; y: number }[] = []
    if (!showCities) return dots
    for (const c of exploreCandidates) {
      if (dots.length >= rules.explore.maxDots) break
      const p = place(c.lng, c.lat)
      if (!p) continue
      if (p[0] < -CULL_PAD || p[0] > SIZE + CULL_PAD || p[1] < -CULL_PAD || p[1] > SIZE + CULL_PAD)
        continue
      dots.push({ city: c, x: p[0], y: p[1] })
    }
    return dots
  }, [exploreCandidates, projection, rules.explore.maxDots, showCities])

  // Whichever selection the player is engaging with — hovered (mouse) beats the
  // pinned tap-selection — drives the label, caption, and missed-leg.
  const active = hovered ?? selected
  const activeCity = active ? selectionCity(active) : null

  // The missing hop for an engaged completion — the leg the player didn't take.
  const activeLegPath = useMemo(() => {
    if (!active || active.type !== 'reveal' || active.pin.kind !== 'completion') return ''
    const from = active.pin.from
    if (!from) return ''
    const coordinates: LngLat[] = [
      [from.lng, from.lat],
      [active.pin.city.lng, active.pin.city.lat],
    ]
    return path({ type: 'LineString', coordinates }) ?? ''
  }, [path, active])

  const startXY = start ? place(start.lng, start.lat) : null

  // ---- Pointer drag → rotation, pinch → zoom --------------------------
  // Pointer capture keeps every move/up for a pressed pointer routed to the SVG
  // even when the finger strays outside the (square) element while spinning the
  // (round) globe. Two pressed pointers switch the gesture from spin to pinch.
  const onPointerDown = (e: React.PointerEvent) => {
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    e.currentTarget.setPointerCapture(e.pointerId)
    if (pointers.current.size >= 2) {
      // Enter pinch: abandon any single-finger spin/tap in progress, and any
      // button zoom still easing — the fingers own the scale now.
      stopAnim()
      stopZoomAnim()
      drag.current = null
      press.current = null
      const [a, b] = [...pointers.current.values()]
      pinchDist.current = a && b ? Math.hypot(a.x - b.x, a.y - b.y) : null
      return
    }
    stopAnim() // hand control to the drag mid-spin
    stopZoomAnim()
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    press.current = { x: e.clientX, y: e.clientY, moved: false }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId))
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    // Pinch: two fingers → zoom by the change in their separation.
    if (pointers.current.size >= 2) {
      const [a, b] = [...pointers.current.values()]
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y)
        // Capture the ratio *now* (against the previous separation) rather than
        // reading pinchDist inside the updater — React runs the updater after
        // we've already reassigned the ref, which would collapse the ratio to 1.
        const prev = pinchDist.current
        pinchDist.current = dist
        if (prev && prev > 0) {
          const ratio = Math.pow(dist / prev, PINCH_SENSITIVITY)
          // Anchor on the middle of the pinch, so the globe grows around the
          // fingers rather than around its own centre.
          zoomAbout(zoomRef.current * ratio, (a.x + b.x) / 2, (a.y + b.y) / 2)
        }
      }
      return
    }
    // Not dragging: preview the pin under the pointer (mouse hover).
    if (!drag.current) {
      if (revealPins.length > 0 || exploreDots.length > 0)
        setHovered(pinAt(e.clientX, e.clientY))
      return
    }
    if (e.pointerId !== drag.current.id) return
    const rect = svgRef.current?.getBoundingClientRect()
    // Convert on-screen pixels → degrees. ~75/scale is the usual d3-globe
    // sensitivity; scale grows with zoom (so a pixel spins less), and
    // SIZE/rect.width corrects for the CSS-scaled display size.
    const k = (75 / (RADIUS * zoomRef.current)) * (rect ? SIZE / rect.width : 1)
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    if (
      press.current &&
      Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) > TAP_MOVE_TOLERANCE
    ) {
      press.current.moved = true
    }
    drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    // Hold off spinning until a fresh press clears the tap tolerance. This buys a
    // brief window for a second finger to land and switch us to pinch — so the
    // opening finger of a (re-)pinch never jerks the globe before the pinch takes
    // over. A resumed drag (leftover finger from a pinch) has no press and spins
    // immediately, as intended.
    if (!press.current || press.current.moved)
      setRotation(([λ, φ]) => [λ + dx * k, Math.max(-90, Math.min(90, φ - dy * k))])
  }
  // Clear the hover preview when the pointer leaves the globe entirely.
  const onPointerLeave = () => setHovered(null)
  // Ends on pointerup and pointercancel — the latter (fired when the browser
  // takes over the touch) must clear the pointer too, or the next gesture starts
  // from stale coordinates. A press that never wandered counts as a tap and
  // selects the nearest pin (or clears the selection).
  const endDrag = (e: React.PointerEvent) => {
    const wasPinch = pointers.current.size >= 2
    pointers.current.delete(e.pointerId)
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId)
    if (wasPinch) {
      pinchDist.current = null
      // Hand a remaining finger back to spinning, from its current spot (so the
      // globe doesn't jump); it's a resumed drag, never a tap.
      const rest = [...pointers.current.entries()][0]
      if (rest) drag.current = { x: rest[1].x, y: rest[1].y, id: rest[0] }
      return
    }
    if (!drag.current || e.pointerId !== drag.current.id) return
    const tap = press.current && !press.current.moved
    drag.current = null
    press.current = null
    if (tap && e.type === 'pointerup') setSelected(pinAt(e.clientX, e.clientY))
  }

  // The closest engageable point to a screen position, within the hit radius, or
  // null (pointing at empty ocean). Considers reveal pins and explore-city dots;
  // shared by tap-select and hover-preview.
  const pinAt = (clientX: number, clientY: number): Selection | null => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect) return null
    const sx = ((clientX - rect.left) / rect.width) * SIZE
    const sy = ((clientY - rect.top) / rect.height) * SIZE
    let best: Selection | null = null
    let bestD = TAP_HIT_RADIUS
    for (const pin of revealPins) {
      const p = place(pin.city.lng, pin.city.lat)
      if (!p) continue
      const d = Math.hypot(p[0] - sx, p[1] - sy)
      if (d <= bestD) {
        bestD = d
        best = { type: 'reveal', pin }
      }
    }
    // City dots are only selectable (name reveal) once hint 2 is unlocked or the
    // round is over; at hint 1 they show but stay anonymous.
    if (citiesInteractive) {
      for (const dot of exploreDots) {
        const d = Math.hypot(dot.x - sx, dot.y - sy)
        if (d <= bestD) {
          bestD = d
          best = { type: 'city', city: dot.city }
        }
      }
    }
    return best
  }

  const activeXY = activeCity ? place(activeCity.lng, activeCity.lat) : null

  // Keep the label in one stable spot: centred above the dot (dropping just
  // below only when the dot sits right at the top edge). It never shifts
  // side-to-side with the dot's position — text-anchor stays middle in CSS.
  const labelLayout = (x: number, y: number) => ({ x, y: y > 26 ? y - 10 : y + 18 })

  const sphereR = RADIUS * zoom

  return (
    <div className="globe">
      <div className="globe__stage">
        <svg
          ref={svgRef}
          className="globe__svg"
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          role="img"
          aria-label={start ? t.globe.label(cityLabel(start, locale)) : t.globe.worldLabel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={onPointerLeave}
        >
          {/* Map layers: the globe grows freely past the board when zoomed
              (the SVG lets it overflow; the whole surface sits below the UI). */}
          <g>
            {/* Ocean sphere (deepest-ocean base tint) */}
            <circle className="globe__sphere" cx={SIZE / 2} cy={SIZE / 2} r={sphereR} />
            {/* Hypsometric relief: ocean-depth + land-height bands, deepest first */}
            {bandPaths.map((d, i) =>
              d ? <path key={`hy-${i}`} className={`globe__hypso globe__hypso--${i}`} d={d} /> : null,
            )}
            {/* Ice caps over the relief, so Greenland/Antarctica read as ice */}
            {icePath && <path className="globe__ice" d={icePath} />}
            <path className="globe__graticule" d={graticulePath} />
            {/* Crisp coastline over the bands */}
            <path className="globe__coast" d={landPath} />
            {/* Political borders, inland only (the coast is stroked above) */}
            <path className="globe__border" d={bordersPath} />

            {/* Explorable cities: biggest first, more as you zoom in */}
            {exploreDots.map((dot) => {
              const isActive = active?.type === 'city' && active.city.id === dot.city.id
              return (
                <g key={`city-${dot.city.id}`}>
                  {isActive && (
                    <circle className="globe__city-halo" cx={dot.x} cy={dot.y} r={7} />
                  )}
                  <circle
                    className={`globe__city${isActive ? ' globe__city--active' : ''}${
                      citiesInteractive ? '' : ' globe__city--static'
                    }`}
                    cx={dot.x}
                    cy={dot.y}
                    r={isActive ? 3.4 : 1.7}
                  />
                </g>
              )
            })}

            <path className="globe__journey" d={journeyPath} />
            {/* The missing hop to an engaged completion — the leg not taken */}
            {activeLegPath && <path className="globe__missed-leg" d={activeLegPath} />}
            <circle className="globe__edge" cx={SIZE / 2} cy={SIZE / 2} r={sphereR} />

            {/* Explore reveal: cities the player could have guessed */}
            {revealPins.map((pin) => {
              const p = place(pin.city.lng, pin.city.lat)
              if (!p) return null
              const isActive = active?.type === 'reveal' && active.pin.city.id === pin.city.id
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
              // Modes that grade a guess themselves (Hidden Destination) carry
              // the level on the result; Classic derives it from the path.
              const level = g.temp ?? tempLevel(g, rules)
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

            {/* Start city marker */}
            {startXY && (
              <g className="globe__start">
                <circle className="globe__start-halo" cx={startXY[0]} cy={startXY[1]} r={7} />
                <circle className="globe__start-dot" cx={startXY[0]} cy={startXY[1]} r={3.5} />
              </g>
            )}
          </g>

          {/* Labels ride above the clip so they can spill a little past the edge */}
          {active &&
            activeXY &&
            (() => {
              const l = labelLayout(activeXY[0], activeXY[1])
              return (
                <text className="globe__reveal-label" x={l.x} y={l.y}>
                  {localizedName(activeCity!, locale)}
                </text>
              )
            })()}

          {start &&
            startXY &&
            (() => {
              const l = labelLayout(startXY[0], startXY[1])
              return (
                <text className="globe__start-label" x={l.x} y={l.y}>
                  {cityLabel(start, locale)}
                </text>
              )
            })()}
        </svg>

        {/* Zoom controls */}
        <div className="globe__zoom" role="group">
          <button
            type="button"
            className="globe__zoom-btn"
            aria-label={t.globe.zoomIn}
            onClick={() => animateZoom(zoomRef.current * ZOOM_STEP)}
            disabled={zoom >= maxZoom - 1e-3}
          >
            +
          </button>
          <button
            type="button"
            className="globe__zoom-btn"
            aria-label={t.globe.zoomOut}
            onClick={() => animateZoom(zoomRef.current / ZOOM_STEP)}
            disabled={zoom <= minZoom + 1e-3}
          >
            −
          </button>
        </div>
      </div>

      {/* Caption: the engaged city's detail, or the end-of-round reveal hint */}
      {(active || (finished && revealPins.length > 0)) && (
        <div className="globe__caption" aria-live="polite">
          {active ? (
            active.type === 'reveal' ? (
              <span className="globe__caption-detail">
                <strong>{cityLabel(active.pin.city, locale)}</strong>
                {active.pin.distanceKm !== undefined && (
                  <span className="globe__caption-dist mono">
                    {formatDistance(active.pin.distanceKm, unit, t)}
                  </span>
                )}
                <span className={`globe__tag globe__tag--${active.pin.kind}`}>
                  {active.pin.kind === 'completion'
                    ? t.globe.reveal.completion
                    : active.pin.kind === 'answer'
                      ? t.globe.reveal.hidden
                      : t.globe.reveal.ideal}
                </span>
              </span>
            ) : (
              <span className="globe__caption-detail">
                <strong>{cityLabel(active.city, locale)}</strong>
              </span>
            )
          ) : (
            t.globe.reveal.hint
          )}
        </div>
      )}
    </div>
  )
}
