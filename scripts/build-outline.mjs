// Build the globe's *fine* coastline + border outline — the detail tier the
// Globe swaps in once a player zooms past `DETAIL_ZOOM`.
//
// The bundled world-atlas 110m outline is right for the whole-globe view, but
// magnified several times it reads as polygons: the Aegean, the Danish
// archipelago and the Visayas simply aren't in it. world-atlas also ships a 50m
// outline that has all of them — and ten times the vertices, which the globe
// would re-project on every drag frame. Most of that detail is finer than a
// 320 px sphere can show even at maximum zoom.
//
// So we thin it once, here, at build time: simplify away the sub-pixel wiggle
// but keep every *ring*, because the small islands are the whole point of the
// tier. The result carries ~2.7× the vertices of 110m (not 10×) and drops from
// 739 KB to ~215 KB, small enough to bundle — so the fine tier costs no runtime
// fetch and the globe keeps working offline.
//
// Output shape deliberately mirrors world-atlas (`objects.land` +
// `objects.countries`), so the Globe hydrates either tier through one code path.
//
// Re-run with `npm run data:outline`. No network needed — the source is the
// world-atlas package.

import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { topology } from 'topojson-server'
import { feature, mesh } from 'topojson-client'
import topojsonSimplify from 'topojson-simplify'

const { presimplify, simplify } = topojsonSimplify

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/data/outline.json')

// Weights (deg²) below which a vertex is dropped — one per layer, because the
// two thin at wildly different rates under the same number.
//
// Simplification scores a vertex by the area of the triangle it forms with its
// neighbours, so it strips *straight* lines hardest. Coastlines are convoluted
// and keep their shape; country borders are long straight or gently curved runs
// and get flattened to almost nothing. One shared weight of 0.02 left the coast
// at 3.4× the 110m detail but the borders at 1.4× — so zooming visibly sharpened
// the coast while the borders stayed exactly as blocky as before, which is the
// bug this split fixes. Borders are cheap (~19k points at 50m, all of them), so
// they keep nearly everything.
const LAND_SIMPLIFY = 0.02
const BORDER_SIMPLIFY = 0.0005

const source = require('world-atlas/countries-50m.json')

// Simplify one layer on its own, at its own weight, and hand back plain GeoJSON.
// The round-trip matters: presimplify stores a weight as a third ordinate on
// every position, and rebuilding from plain coordinates is what drops them.
function thin(build, weight) {
  const simplified = simplify(presimplify(source), weight)
  return build(simplified)
}

function main() {
  const land = thin((t) => feature(t, t.objects.land), LAND_SIMPLIFY)
  // The interior boundaries only — arcs shared by two different countries — so
  // each border is one line and the coastline isn't stroked twice. Meshing here
  // rather than in the app also drops the country names, which the globe never
  // draws, and spares it the work at load.
  const borders = thin(
    (t) => mesh(t, t.objects.countries, (a, b) => a !== b),
    BORDER_SIMPLIFY,
  )

  const topo = topology({ land, borders }, 1e4)
  const json = JSON.stringify(topo)
  writeFileSync(OUT, json)

  const points = (g) => (g.coordinates ?? []).reduce((n, l) => n + l.length, 0)
  process.stderr.write(
    `Wrote ${OUT} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB; ` +
      `land simplify ${LAND_SIMPLIFY}, borders ${BORDER_SIMPLIFY} → ` +
      `${points(borders)} border points)\n`,
  )
}

main()
