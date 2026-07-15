// Decorative globe — a faint graticule (lat/long grid) behind the app for the
// "somewhere far off" atmosphere. Purely ornamental; aria-hidden.

export function GlobeMotif() {
  const cx = 100
  const cy = 100
  const r = 92
  const meridians = [0, 30, 60].map((deg) => {
    const rx = r * Math.cos((deg * Math.PI) / 180)
    return <ellipse key={`m${deg}`} cx={cx} cy={cy} rx={rx} ry={r} />
  })
  const parallels = [-60, -30, 0, 30, 60].map((lat) => {
    const y = cy - (r * lat) / 90
    const rx = r * Math.cos((lat * Math.PI) / 180)
    const ry = rx * 0.28
    return <ellipse key={`p${lat}`} cx={cx} cy={y} rx={rx} ry={ry} />
  })
  return (
    <div className="app__globe" aria-hidden="true">
      <svg viewBox="0 0 200 200" fill="none" stroke="var(--accent)" strokeWidth="0.5">
        <g opacity="0.5">
          <circle cx={cx} cy={cy} r={r} />
          {meridians}
          {parallels}
        </g>
      </svg>
    </div>
  )
}
