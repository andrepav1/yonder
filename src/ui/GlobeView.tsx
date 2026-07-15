// The play surface: an azimuthal-equidistant globe centred on the start city.
//
// Why this projection? Distance from the centre is linear and true, so the
// start city sits at the middle and every guess is plotted at its real
// great-circle distance + initial bearing (that pair *is* the azimuthal-
// equidistant position of a point). The dashed accent ring is the target
// distance. Each guess then draws a circle of that *same* target radius around
// itself — and that circle passes through the centre exactly when the guess is
// the target distance from the start. Ringing the start city = a bullseye.

import type { GuessResult, PuzzleSpec } from '@/lib/types'
import type { GameRules, Unit } from '@/config/rules'
import { tempLevel } from '@/lib/scoring'
import { formatDistance } from '@/lib/format'

interface GlobeViewProps {
  puzzle: PuzzleSpec
  guesses: GuessResult[]
  rules: GameRules
  unit: Unit
}

// SVG canvas + globe geometry (view units).
const VB = 260
const CX = VB / 2
const CY = VB / 2
const DISC_R = 116

const rad = (deg: number): number => (deg * Math.PI) / 180

export function GlobeView({ puzzle, guesses, rules, unit }: GlobeViewProps) {
  const target = puzzle.targetKm

  // Fit the view so the target ring is always comfortably visible and every
  // guess point lands inside the disc. A wild guess is capped (clamped to the
  // rim) so one antipodal miss can't shrink the whole map to nothing.
  const farthest = guesses.reduce((m, g) => Math.max(m, g.distanceKm), 0)
  const maxDist = Math.max(target * 2.2, Math.min(farthest, target * 5) * 1.12)
  const scale = DISC_R / maxDist

  // km → screen point, from great-circle distance + bearing (north = up).
  const plot = (distanceKm: number, bearingDeg: number) => {
    const rr = Math.min(distanceKm, maxDist) * scale
    return {
      x: CX + rr * Math.sin(rad(bearingDeg)),
      y: CY - rr * Math.cos(rad(bearingDeg)),
      beyond: distanceKm > maxDist,
    }
  }

  const targetR = target * scale
  const bandInner = target * (1 - puzzle.tolerancePct) * scale
  const bandOuter = target * (1 + puzzle.tolerancePct) * scale

  // Faint concentric distance rings + N/E/S/W spokes for globe atmosphere.
  const gridRings = [0.25, 0.5, 0.75, 1].map((f) => f * DISC_R)
  const spokes = [0, 90, 180, 270].map((deg) => ({
    x2: CX + DISC_R * Math.sin(rad(deg)),
    y2: CY - DISC_R * Math.cos(rad(deg)),
  }))
  const compass = [
    { c: 'N', x: CX, y: CY - DISC_R - 4 },
    { c: 'E', x: CX + DISC_R + 6, y: CY + 3 },
    { c: 'S', x: CX, y: CY + DISC_R + 10 },
    { c: 'W', x: CX - DISC_R - 6, y: CY + 3 },
  ]

  const clipId = 'globe-disc-clip'
  const gradId = 'globe-shade'

  return (
    <section className="globe" aria-label="Map centred on the start city">
      <svg
        className="globe__svg"
        viewBox={`0 0 ${VB} ${VB}`}
        role="img"
        aria-label={
          `${puzzle.start.name} at centre. Target ring at ` +
          `${formatDistance(target, unit)}. ${guesses.length} guess` +
          `${guesses.length === 1 ? '' : 'es'} plotted.`
        }
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx={CX} cy={CY} r={DISC_R} />
          </clipPath>
          <radialGradient id={gradId} cx="42%" cy="38%" r="75%">
            <stop offset="0%" stopColor="var(--surface)" />
            <stop offset="100%" stopColor="var(--bg-2)" />
          </radialGradient>
        </defs>

        {/* Globe body */}
        <circle
          cx={CX}
          cy={CY}
          r={DISC_R}
          fill={`url(#${gradId})`}
          stroke="var(--border-strong)"
          strokeWidth={1.5}
        />

        {/* Graticule */}
        <g stroke="var(--border-strong)" strokeWidth={0.6} opacity={0.5} fill="none">
          {gridRings.map((r, i) => (
            <circle key={`ring-${i}`} cx={CX} cy={CY} r={r} />
          ))}
          {spokes.map((s, i) => (
            <line key={`spoke-${i}`} x1={CX} y1={CY} x2={s.x2} y2={s.y2} />
          ))}
        </g>

        {/* Win band (the tolerance ring you're aiming to land inside) */}
        <g clipPath={`url(#${clipId})`}>
          <circle
            cx={CX}
            cy={CY}
            r={(bandInner + bandOuter) / 2}
            fill="none"
            stroke="var(--accent)"
            strokeOpacity={0.14}
            strokeWidth={Math.max(2, bandOuter - bandInner)}
          />
        </g>

        {/* Guess circles: each has the target radius, centred on the guess.
            Touching the centre dot means a perfect target-distance guess. */}
        <g clipPath={`url(#${clipId})`}>
          {guesses.map((g, i) => {
            const p = plot(g.distanceKm, g.bearingDeg)
            const latest = i === guesses.length - 1
            const level = tempLevel(g, rules)
            const color = g.won ? 'var(--win)' : `var(--temp-${level})`
            return (
              <circle
                key={`ring-${g.city.id}-${i}`}
                cx={p.x}
                cy={p.y}
                r={targetR}
                fill={color}
                fillOpacity={latest ? 0.13 : 0.05}
                stroke={color}
                strokeOpacity={latest ? 0.95 : 0.5}
                strokeWidth={latest ? 2 : 1.3}
              />
            )
          })}
        </g>

        {/* Target ring — drawn over the guesses so the goal stays legible */}
        <circle
          cx={CX}
          cy={CY}
          r={targetR}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.6}
          strokeDasharray="5 4"
        />

        {/* Guess markers + order numbers */}
        <g clipPath={`url(#${clipId})`}>
          {guesses.map((g, i) => {
            const p = plot(g.distanceKm, g.bearingDeg)
            const level = tempLevel(g, rules)
            const color = g.won ? 'var(--win)' : `var(--temp-${level})`
            return (
              <g key={`mark-${g.city.id}-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r={4}
                  fill={color}
                  stroke="var(--surface)"
                  strokeWidth={1.2}
                />
                <text
                  x={p.x + 6}
                  y={p.y - 5}
                  className="globe__num"
                  fill="var(--fg-muted)"
                >
                  {i + 1}
                </text>
              </g>
            )
          })}
        </g>

        {/* Compass */}
        <g className="globe__compass" fill="var(--fg-muted)">
          {compass.map((c) => (
            <text key={c.c} x={c.x} y={c.y}>
              {c.c}
            </text>
          ))}
        </g>

        {/* Start city — topmost so it's never hidden */}
        <g className="globe__start">
          <circle cx={CX} cy={CY} r={5} fill="var(--accent)" />
          <circle cx={CX} cy={CY} r={5} fill="none" stroke="var(--on-accent)" strokeWidth={1.4} />
          <text x={CX} y={CY + 18} className="globe__start-label">
            {puzzle.start.name}
          </text>
        </g>
      </svg>

      <p className="globe__caption">
        Dashed ring = your target of{' '}
        <strong>{formatDistance(target, unit)}</strong>. Each guess draws a circle
        of that distance — land it on the centre to win.
      </p>
    </section>
  )
}
