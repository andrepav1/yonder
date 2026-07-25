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
import { feature } from 'topojson-client'
import topojsonSimplify from 'topojson-simplify'

const { presimplify, simplify } = topojsonSimplify

const require = createRequire(import.meta.url)
const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/data/outline.json')

// Weight (deg²) below which a vertex is dropped. 0.02 lands at ~2.7× the 110m
// vertex count: visibly richer coastlines and every island kept, while a drag at
// full zoom still holds its frame rate. Raising it thins the coast; lowering it
// costs frames — re-measure a drag if you change it.
const SIMPLIFY = 0.02

const source = require('world-atlas/countries-50m.json')

function main() {
  const simplified = simplify(presimplify(source), SIMPLIFY)
  // Round-trip through GeoJSON: presimplify stores a weight as a third ordinate
  // on every position, and rebuilding the topology from plain coordinates is
  // what drops them. Country names go too — the globe draws borders, never
  // labels them.
  const land = feature(simplified, simplified.objects.land)
  const countries = feature(simplified, simplified.objects.countries)
  for (const f of countries.features) delete f.properties

  const topo = topology({ land, countries }, 1e4)
  const json = JSON.stringify(topo)
  writeFileSync(OUT, json)

  const count = (o) => {
    let n = 0
    for (const arc of o.arcs) n += arc.length
    return n
  }
  process.stderr.write(
    `Wrote ${OUT} (${(Buffer.byteLength(json) / 1024).toFixed(0)} KB, ` +
      `${count(topo)} arc points, simplify ${SIMPLIFY})\n`,
  )
}

main()
