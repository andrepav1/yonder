// Build the globe's hypsometric elevation bands — the blue (ocean depth) + brown
// (land height) shading layers the Globe paints beneath the coastline.
//
// Source: NOAA ETOPO 2022 global relief (topography + bathymetry, 1 arc-minute),
// streamed at a coarse stride via OPeNDAP so we never download the full ~450 MB
// grid. We contour that grid into a fixed set of elevation/depth thresholds
// (d3-contour), reproject the contour coordinates from grid space to lon/lat,
// and emit a quantized + simplified TopoJSON to src/data/elevation.json.
//
// The output is a plain, bundled artifact: the app imports it directly, so no
// download is needed to run or deploy. Re-run with `npm run data:elevation`.
//
// Each emitted feature carries `properties.v` — the lower bound (metres) of the
// elevation band it fills. The Globe sorts bands ascending and paints each as a
// nested "value ≥ threshold" region, deepest first, so higher bands overpaint
// lower ones into a hypsometric tint. Keep THRESHOLDS in sync with the
// `--hypso-*` colour ramp in src/styles/globals.css (one colour per band, in the
// same order, plus the sphere base for values below the deepest threshold).

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

// OPeNDAP endpoint for the ETOPO 2022 60 arc-second surface-elevation grid.
const DODS =
  'https://www.ngdc.noaa.gov/thredds/dodsC/global/ETOPO2022/60s/60s_surface_elev_netcdf/ETOPO_2022_v1_60s_N90W180_surface.nc'
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

async function fetchGrid() {
  const latStop = FULL_LAT - 1
  const lonStop = FULL_LON - 1
  const url = `${DODS}.ascii?z[0:${STRIDE}:${latStop}][0:${STRIDE}:${lonStop}]`
  process.stderr.write(`Fetching ETOPO grid (stride ${STRIDE})…\n`)
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

function buildFeatures({ values, width, height }) {
  const gen = contours().size([width, height]).thresholds(THRESHOLDS)
  // d3-contour returns one MultiPolygon per threshold (regions where value ≥
  // threshold), already in ascending-threshold order.
  const bands = gen(values)
  return bands.map((band) => ({
    type: 'Feature',
    properties: { v: band.value },
    geometry: {
      type: 'MultiPolygon',
      coordinates: band.coordinates.map((poly) => poly.map(project)),
    },
  }))
}

async function main() {
  const raw = await fetchGrid()
  const grid = downsample(raw, DOWNSAMPLE)
  process.stderr.write(`Grid ${grid.width}×${grid.height}. Contouring…\n`)
  const features = buildFeatures(grid)
  const fc = { type: 'FeatureCollection', features }

  // Quantize + simplify to shrink the bundle: even a 0.5° grid carries far more
  // detail than a small orthographic globe needs.
  let topo = topology({ bands: fc }, 1e4)
  topo = presimplify(topo)
  // Drop the smallest triangles (area in deg², visibly sub-pixel at globe
  // scale) — raise to trade detail for size.
  topo = simplify(topo, 0.4)
  topo = quantize(topo, 1e4)

  const json = JSON.stringify(topo)
  writeFileSync(OUT, json)
  const kb = (Buffer.byteLength(json) / 1024).toFixed(0)
  process.stderr.write(`Wrote ${OUT} (${kb} KB, ${features.length} bands)\n`)
}

main().catch((err) => {
  process.stderr.write(`build-elevation failed: ${err.message}\n`)
  process.exit(1)
})
