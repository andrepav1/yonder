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
import { quantize } from 'topojson-client'
import topojsonSimplify from 'topojson-simplify'

const { presimplify, simplify } = topojsonSimplify

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(__dirname, '../src/data/elevation.json')

// OPeNDAP endpoints for the ETOPO 2022 60 arc-second grids: the ice/land surface,
// and the bedrock beneath the ice. Their difference is the ice thickness.
const SURFACE_DODS =
  'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc'
const BED_DODS =
  'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_bed_elev_netcdf/ETOPO_2022_v1_60s_N90W180_bed.nc'
// Full grid is 10800 (lat) × 21600 (lon). Sample every STRIDE cells: 15 → a
// 720 × 1440 grid (0.25°), plenty for a 320 px orthographic globe once the
// contours are simplified, and a small enough OPeNDAP payload to stream.
const STRIDE = 15
const FULL_LAT = 10800
const FULL_LON = 21600
// Block-average the fetched grid down by this factor before contouring. Averaging
// (rather than plain subsampling) smooths the contours and kills single-cell
// noise; ×2 gives an effective 0.5° grid — smooth and compact at globe scale.
const DOWNSAMPLE = 2
// Grid-cell centres (degrees). Row 0 is the southernmost sample, column 0 the
// westernmost; both run in increasing index order (S→N, W→E).
const LON0 = -179.99166666666667
const LAT0 = -89.99166666666666
// Degrees per contour-grid step, after downsampling (1 arc-min × STRIDE × factor).
const DEG_PER_STEP = (STRIDE * DOWNSAMPLE) / 60

// Band lower-bounds (metres). 5 ocean-depth bands (negative) + 6 land bands.
// Values below the first threshold fall through to the sphere's base colour.
// Keep this array (and its order) in lockstep with the `--hypso-*` CSS ramp.
const THRESHOLDS = [-6000, -4000, -2000, -500, 0, 250, 750, 1500, 3000, 5000]

// Minimum ice thickness (metres, surface − bedrock) to count as an ice sheet.
// ETOPO's bedrock diverges from its surface only under Greenland + Antarctica, so
// anything from ~50–500 m isolates them cleanly; 250 m is a safe midpoint.
const ICE_THICKNESS_MIN = 250

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
const toLon = (x) => LON0 + x * DEG_PER_STEP
const toLat = (y) => LAT0 + y * DEG_PER_STEP
const clampLon = (v) => Math.max(-180, Math.min(180, v))
const clampLat = (v) => Math.max(-90, Math.min(90, v))

function project(ring) {
  return ring.map(([x, y]) => [
    Number(clampLon(toLon(x)).toFixed(4)),
    Number(clampLat(toLat(y)).toFixed(4)),
  ])
}

// Turn one contour band into a projected GeoJSON Feature.
const bandFeature = (band, props) => ({
  type: 'Feature',
  properties: props,
  geometry: {
    type: 'MultiPolygon',
    coordinates: band.coordinates.map((poly) => poly.map(project)),
  },
})

function buildBands({ values, width, height }) {
  const gen = contours().size([width, height]).thresholds(THRESHOLDS)
  // d3-contour returns one MultiPolygon per threshold (regions where value ≥
  // threshold), already in ascending-threshold order.
  return gen(values).map((band) => bandFeature(band, { v: band.value }))
}

// The ice sheets: contour (surface − bedrock) at the ice-thickness threshold.
function buildIce(surface, bed) {
  const { width, height } = surface
  const thickness = new Float64Array(width * height)
  for (let i = 0; i < thickness.length; i++) thickness[i] = surface.values[i] - bed.values[i]
  const gen = contours().size([width, height]).thresholds([ICE_THICKNESS_MIN])
  return gen(thickness).map((band) => bandFeature(band, { ice: true }))
}

async function main() {
  const surface = downsample(await fetchGrid(SURFACE_DODS, 'surface'), DOWNSAMPLE)
  const bed = downsample(await fetchGrid(BED_DODS, 'bedrock'), DOWNSAMPLE)
  process.stderr.write(`Grid ${surface.width}×${surface.height}. Contouring…\n`)
  const bands = { type: 'FeatureCollection', features: buildBands(surface) }
  const ice = { type: 'FeatureCollection', features: buildIce(surface, bed) }

  // Quantize + simplify to shrink the bundle: even a 0.5° grid carries far more
  // detail than a small orthographic globe needs.
  let topo = topology({ bands, ice }, 1e4)
  topo = presimplify(topo)
  // Drop the smallest triangles (area in deg², visibly sub-pixel at globe
  // scale) — raise to trade detail for size.
  topo = simplify(topo, 0.4)
  topo = quantize(topo, 1e4)

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
