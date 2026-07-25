// Build the globe's hypsometric elevation layers — the blue (ocean depth) + brown
// (land height) bands the Globe paints beneath the coastline, plus an ice-sheet
// overlay so Greenland and Antarctica read as ice caps, not brown highlands.
//
// Source: NOAA ETOPO 2022 global relief (topography + bathymetry, 1 arc-minute),
// streamed at a coarse stride via OPeNDAP so we never download the full ~450 MB
// grids. We contour the *surface* grid into a fixed set of elevation/depth
// thresholds (d3-contour), reproject the contour coordinates from grid space to
// lon/lat, and emit a quantized + simplified TopoJSON to src/data/elevation.json.
//
// The ice overlay comes from the *same* source: ETOPO also ships a *bedrock*
// grid, and (surface − bedrock) is the ice thickness. ETOPO models thick ice only
// under the two great ice sheets, so contouring that difference at a small
// threshold yields clean Greenland + Antarctica polygons — perfectly aligned with
// the surface bands, no second dataset needed.
//
// The output is a plain, bundled artifact: the app imports it directly, so no
// download is needed to run or deploy. Re-run with `npm run data:elevation`.
//
// Two TopoJSON objects are emitted:
//   • `bands` — each feature's `properties.v` is the band's lower bound (metres).
//     The Globe sorts them ascending and paints each as a nested "value ≥
//     threshold" region, deepest first, so higher bands overpaint lower ones into
//     a hypsometric tint. Keep THRESHOLDS in sync with the `--hypso-*` colour ramp
//     in src/styles/globals.css (one colour per band, in the same order, plus the
//     sphere base for values below the deepest threshold).
//   • `ice` — the ice-sheet polygons, painted on top of the bands as `--globe-ice`.

import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { contours } from 'd3-contour'
import { topology } from 'topojson-server'
import { feature } from 'topojson-client'
import topojsonSimplify from 'topojson-simplify'

const { presimplify, simplify, filter, filterWeight } = topojsonSimplify

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/data/elevation.json')

// OPeNDAP endpoints for the ETOPO 2022 60 arc-second grids: the ice/land surface,
// and the bedrock beneath the ice. Their difference is the ice thickness.
const SURFACE_DODS =
  'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc'
const BED_DODS =
  'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_bed_elev_netcdf/ETOPO_2022_v1_60s_N90W180_bed.nc'
// Full grid is 10800 (lat) × 21600 (lon). Sample every STRIDE cells: 6 → a
// 1800 × 3600 grid (0.1°), streamed from OPeNDAP in ~15 s per grid.
const STRIDE = 6
const FULL_LAT = 10800
const FULL_LON = 21600
// Block-average the fetched grid down by this factor before contouring. Averaging
// (rather than plain subsampling) smooths the contours and kills single-cell
// noise; ×2 gives an effective 0.2° grid — fine enough to keep island chains
// (the Philippines, the Caribbean, the Aegean) as islands rather than blobs.
const DOWNSAMPLE = 2
// Grid-cell centres (degrees). Row 0 is the southernmost sample, column 0 the
// westernmost; both run in increasing index order (S→N, W→E).
const LON0 = -179.99166666666667
const LAT0 = -89.99166666666666

// Band lower-bounds (metres). 5 ocean-depth bands (negative) + 6 land bands.
// Values below the first threshold fall through to the sphere's base colour.
// Keep this array (and its order) in lockstep with the `--hypso-*` CSS ramp.
const THRESHOLDS = [-6000, -4000, -2000, -500, 0, 250, 750, 1500, 3000, 5000]

// Minimum ice thickness (metres, surface − bedrock) to count as an ice sheet.
// ETOPO's bedrock diverges from its surface only under Greenland + Antarctica, so
// anything from ~50–500 m isolates them cleanly; 250 m is a safe midpoint.
const ICE_THICKNESS_MIN = 250

// Simplification is split by what the band is *for*. Coastlines and islands are
// what the eye checks against the country borders, so land bands keep their
// detail; the ocean bands are broad tints whose boundaries nobody reads, and
// left alone they dominate the file — the −4000 m band alone was a third of it,
// almost all abyssal ridge wiggle and seamount speckle invisible at globe scale.
// Simplifying those harder, and dropping their smallest rings outright, pays for
// the finer grid: same land fidelity at roughly half the bytes.
const LAND_SIMPLIFY = 0.1
const OCEAN_SIMPLIFY = 0.5
// Minimum ring weight (deg²) kept in the ocean bands — drops speckle below about
// 1.4° across. Land bands keep every ring: small islands are the point.
const OCEAN_MIN_RING = 2

async function fetchGrid(dods, label) {
  const latStop = FULL_LAT - 1
  const lonStop = FULL_LON - 1
  const url = `${dods}.ascii?z[0:${STRIDE}:${latStop}][0:${STRIDE}:${lonStop}]`
  process.stderr.write(`Fetching ETOPO ${label} grid (stride ${STRIDE})…\n`)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OPeNDAP ${res.status} ${res.statusText}`)
  const text = await res.text()
  return parseAscii(text)
}

// OPeNDAP `.ascii` for a 2-D grid: a DDS header, a `-----` divider, a
// `z.z[H][W]` line, then one row per line as `[rowIndex], v, v, v, …`.
function parseAscii(text) {
  const lines = text.split('\n')
  const start = lines.findIndex((l) => /^z\.z\[/.test(l))
  if (start < 0) throw new Error('unexpected OPeNDAP response (no z.z array)')
  const dims = lines[start].match(/\[(\d+)\]\[(\d+)\]/)
  if (!dims) throw new Error('could not read grid dimensions')
  const height = Number(dims[1])
  const width = Number(dims[2])
  const values = new Float64Array(width * height)
  for (let r = 0; r < height; r++) {
    const line = lines[start + 1 + r]
    if (!line) throw new Error(`missing grid row ${r}`)
    // Drop the leading `[r], ` index marker, then split the numbers.
    const nums = line.slice(line.indexOf(',') + 1).split(',')
    for (let c = 0; c < width; c++) values[r * width + c] = Number(nums[c])
  }
  return { values, width, height }
}

// Block-average the grid down by `factor`, so contours ride a smoother, coarser
// field (fewer, cleaner vertices) than plain subsampling would give.
function downsample({ values, width, height }, factor) {
  if (factor <= 1) return { values, width, height }
  const w = Math.floor(width / factor)
  const h = Math.floor(height / factor)
  const out = new Float64Array(w * h)
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      let sum = 0
      for (let dr = 0; dr < factor; dr++)
        for (let dc = 0; dc < factor; dc++)
          sum += values[(r * factor + dr) * width + (c * factor + dc)]
      out[r * w + c] = sum / (factor * factor)
    }
  }
  return { values: out, width: w, height: h }
}

// Contour grid coordinate → geographic lon/lat. Row 0 is the south edge, so lat
// increases with y; column 0 is the west edge, so lon increases with x.
//
// Two half-cell corrections put the relief where it actually belongs — without
// them the whole map lands ~0.125° north-east of the coastline, which reads as a
// visible offset against the country borders wherever the coast is intricate:
//
//   • d3-contour's coordinate space is offset +0.5 cell from the data indices —
//     a lone hot cell at index (2, 2) contours to a ring centred on (2.5, 2.5) —
//     so a vertex at x describes the data position x − 0.5.
//   • a block-averaged cell speaks for the *centroid* of the members it averaged.
//     Those sit STRIDE/60° apart starting at the block's first sample, putting
//     the centroid (DOWNSAMPLE − 1)/2 subsamples past it.
const clampLon = (v) => Math.max(-180, Math.min(180, v))
const clampLat = (v) => Math.max(-90, Math.min(90, v))

// Build the grid → lon/lat mapping for a given block-average factor, so groups
// contoured at different factors each land in the right place.
function projector(factor) {
  const step = (STRIDE * factor) / 60
  const centroidOffset = ((STRIDE / 60) * (factor - 1)) / 2
  const toLon = (x) => LON0 + (x - 0.5) * step + centroidOffset
  const toLat = (y) => LAT0 + (y - 0.5) * step + centroidOffset
  return (ring) =>
    ring.map(([x, y]) => [
      Number(clampLon(toLon(x)).toFixed(4)),
      Number(clampLat(toLat(y)).toFixed(4)),
    ])
}

// Turn one contour band into a projected GeoJSON Feature.
const bandFeature = (band, props, project) => ({
  type: 'Feature',
  properties: props,
  geometry: {
    type: 'MultiPolygon',
    coordinates: band.coordinates.map((poly) => poly.map(project)),
  },
})

// Contour a grid at the given thresholds. d3-contour returns one MultiPolygon
// per threshold (the region where value ≥ threshold), in ascending order.
function buildBands({ values, width, height }, thresholds, project) {
  const gen = contours().size([width, height]).thresholds(thresholds)
  return gen(values).map((band) => bandFeature(band, { v: band.value }, project))
}

// The ice sheets: contour (surface − bedrock) at the ice-thickness threshold.
function buildIce(surface, bed, project) {
  const { width, height } = surface
  const thickness = new Float64Array(width * height)
  for (let i = 0; i < thickness.length; i++) thickness[i] = surface.values[i] - bed.values[i]
  const gen = contours().size([width, height]).thresholds([ICE_THICKNESS_MIN])
  return gen(thickness).map((band) => bandFeature(band, { ice: true }, project))
}

// Simplify one group of features on its own — its own topology, thinned at its
// own weight — and hand back plain GeoJSON for the final, combined topology.
// The bands are nested "value ≥ threshold" regions, so no two share an arc and
// thinning them apart can't open cracks between them.
function thin(features, weight, minRing = 0) {
  if (features.length === 0) return []
  let topo = presimplify(topology({ g: { type: 'FeatureCollection', features } }, 1e5))
  if (minRing > 0) topo = filter(topo, filterWeight(topo, minRing))
  topo = simplify(topo, weight)
  return feature(topo, topo.objects.g).features
}

async function main() {
  const surface = downsample(await fetchGrid(SURFACE_DODS, 'surface'), DOWNSAMPLE)
  const bed = downsample(await fetchGrid(BED_DODS, 'bedrock'), DOWNSAMPLE)
  process.stderr.write(`Grid ${surface.width}×${surface.height}. Contouring…\n`)
  const project = projector(DOWNSAMPLE)
  const bands = {
    type: 'FeatureCollection',
    features: [
      ...thin(
        buildBands(
          surface,
          THRESHOLDS.filter((t) => t < 0),
          project,
        ),
        OCEAN_SIMPLIFY,
        OCEAN_MIN_RING,
      ),
      ...thin(
        buildBands(
          surface,
          THRESHOLDS.filter((t) => t >= 0),
          project,
        ),
        LAND_SIMPLIFY,
      ),
    ],
  }
  const ice = {
    type: 'FeatureCollection',
    features: thin(buildIce(surface, bed, project), LAND_SIMPLIFY),
  }

  // Quantize into the final bundle. Each group is already thinned, so this only
  // snaps coordinates to a 1e4 grid and builds the shared arc table.
  const topo = topology({ bands, ice }, 1e4)

  const json = JSON.stringify(topo)
  writeFileSync(OUT, json)
  const kb = (Buffer.byteLength(json) / 1024).toFixed(0)
  process.stderr.write(
    `Wrote ${OUT} (${kb} KB, ${bands.features.length} bands + ${ice.features.length} ice)\n`,
  )
}

main().catch((err) => {
  process.stderr.write(`build-elevation failed: ${err.message}\n`)
  process.exit(1)
})
