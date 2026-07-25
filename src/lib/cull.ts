// View culling for the globe's map layers — pure geometry, no rendering.
//
// d3-geo walks every vertex it is handed, whatever the zoom, so a zoomed-in
// frame costs the whole planet to paint a sliver of it: at 6× the board shows a
// cap about 10° across, while the coastline, the borders and all eleven relief
// bands are re-projected in full on every drag frame.
//
// The fix is to cut each layer once into independently drawable **pieces** — one
// polygon ring or one line each, with its lon/lat bounding box — and then, per
// frame, keep only the pieces that can reach the visible cap.
//
// The test is deliberately generous. A bounding box is a lon/lat rectangle, not
// a spherical cap, so the nearest-point estimate below is approximate; the
// margin covers that. Getting it wrong in the cheap direction keeps a piece that
// didn't need drawing, which costs only its vertices. Getting it wrong the other
// way punches a hole in the map, so the tests assert the superset property: any
// piece that renders anything on the board must survive the cull.

import { wrapLonDeg } from '@/lib/geo'
import type {
  Feature,
  FeatureCollection,
  LineString,
  MultiLineString,
  Polygon,
  Position,
} from 'geojson'

/** `[minLon, minLat, maxLon, maxLat]`. */
export type BBox = [number, number, number, number]

/** One independently cullable ring or line, with the box that bounds it. */
export interface Piece {
  bbox: BBox
  geom: Polygon | LineString
}

/** Any of the shapes the globe's layers arrive in. */
export type Cullable = FeatureCollection | Feature | MultiLineString

const D2R = Math.PI / 180

/** Bounds a polygon's rings (or a single line, passed as one ring). */
export function bboxOf(rings: Position[][]): BBox {
  let minLon = Infinity
  let minLat = Infinity
  let maxLon = -Infinity
  let maxLat = -Infinity
  for (const ring of rings) {
    for (const p of ring) {
      const lon = p[0]!
      const lat = p[1]!
      if (lon < minLon) minLon = lon
      if (lon > maxLon) maxLon = lon
      if (lat < minLat) minLat = lat
      if (lat > maxLat) maxLat = lat
    }
  }
  return [minLon, minLat, maxLon, maxLat]
}

/** Cut a layer into pieces. Rings of a MultiPolygon cull independently. */
export function toPieces(input: Cullable): Piece[] {
  const out: Piece[] = []
  const add = (g: Feature['geometry'] | null) => {
    if (!g) return
    if (g.type === 'MultiPolygon') {
      for (const rings of g.coordinates)
        out.push({ bbox: bboxOf(rings), geom: { type: 'Polygon', coordinates: rings } })
    } else if (g.type === 'Polygon') {
      out.push({ bbox: bboxOf(g.coordinates), geom: g })
    } else if (g.type === 'MultiLineString') {
      for (const line of g.coordinates)
        out.push({ bbox: bboxOf([line]), geom: { type: 'LineString', coordinates: line } })
    } else if (g.type === 'LineString') {
      out.push({ bbox: bboxOf([g.coordinates]), geom: g })
    }
  }
  if (input.type === 'FeatureCollection') for (const f of input.features) add(f.geometry)
  else if (input.type === 'Feature') add(input.geometry)
  else add(input)
  return out
}

/** Separation between two longitudes in degrees, the short way round. */
export function lonDelta(a: number, b: number): number {
  return Math.abs(wrapLonDeg(a - b))
}

/** Extra degrees kept beyond the visible cap — slack for the bbox estimate. */
const CULL_MARGIN_DEG = 12

/**
 * Angular radius (degrees) of the cap the board can show, plus the margin.
 *
 * An orthographic projection puts a point θ from the centre at `scale·sin θ`, so
 * the board's half-width bounds `sin θ`. Zoomed out far enough the whole near
 * hemisphere fits and nothing can be culled.
 *
 * The board is square, so its *corners* are what bound the cap — a half-width
 * here would cull pieces that still show diagonally, which is exactly the bug
 * the superset test caught.
 *
 * @param scale   projection scale in board units (`RADIUS × zoom`)
 * @param reach   centre-to-corner distance of the board, plus any padding
 */
export function visibleRadiusDeg(scale: number, reach: number): number {
  const ratio = reach / scale
  if (!(ratio < 1)) return 90
  return Math.min(90, (Math.asin(ratio) * 180) / Math.PI + CULL_MARGIN_DEG)
}

/**
 * Is this piece's bounding box within `radiusDeg` of the centre?
 *
 * Hot: this runs over every piece of every layer, every frame, so it works in
 * radians with the centre's cosine hoisted out by the callers below, and does
 * the great-circle angle inline. d3-geo's `geoDistance` is the same maths but
 * routed through its stream machinery, which measured ~50× slower per call —
 * enough to cost more than the culling saves.
 */
function withinCap(
  bbox: BBox,
  cLon: number,
  cLat: number,
  cosCLat: number,
  radiusDeg: number,
  radiusRad: number,
): boolean {
  const [minLon, minLat, maxLon, maxLat] = bbox
  // Nearest point of the box to the centre, each axis clamped on its own.
  const lat = Math.max(minLat, Math.min(maxLat, cLat))
  // Latitude alone is a lower bound on the great-circle distance, and it costs
  // one subtraction. Most of the planet is at some other latitude, so this
  // rejects the bulk of the pieces before any trigonometry.
  if (Math.abs(lat - cLat) > radiusDeg) return false
  let lon = cLon
  // Boxes are built from raw coordinates, so anything crossing ±180° comes out
  // spanning nearly the whole range. Half the globe or wider, treat longitude
  // as unconstrained — the alternative is snapping to an edge on the far side
  // of the planet and culling a piece that covers the view. Otherwise, if the
  // centre's meridian misses the span, take whichever edge is nearer the short
  // way round.
  if (maxLon - minLon < 180 && (cLon < minLon || cLon > maxLon)) {
    lon = lonDelta(cLon, minLon) <= lonDelta(cLon, maxLon) ? minLon : maxLon
  }
  const dLat = (lat - cLat) * D2R
  const dLon = (lon - cLon) * D2R
  const sLat = Math.sin(dLat / 2)
  const sLon = Math.sin(dLon / 2)
  const h = sLat * sLat + cosCLat * Math.cos(lat * D2R) * sLon * sLon
  return 2 * Math.asin(Math.min(1, Math.sqrt(h))) <= radiusRad
}

/** Keep the pieces whose bounding box comes within `radiusDeg` of `center`. */
export function cull(pieces: Piece[], center: [number, number], radiusDeg: number): Piece[] {
  if (radiusDeg >= 90) return pieces
  const [cLon, cLat] = center
  const cosCLat = Math.cos(cLat * D2R)
  const radiusRad = radiusDeg * D2R
  return pieces.filter((p) => withinCap(p.bbox, cLon, cLat, cosCLat, radiusDeg, radiusRad))
}

/** Pieces as one geometry d3-geo can draw in a single path. */
export function asGeometry(pieces: Piece[]) {
  return { type: 'GeometryCollection' as const, geometries: pieces.map((p) => p.geom) }
}

/**
 * A layer ready to cull: the whole thing, plus its pieces cut on first use.
 *
 * Both halves are lazy for the same reason. Culling only engages once the board
 * shows less than a hemisphere (above ~1.5× zoom), so a round that never zooms
 * in never needs the pieces — and cutting them costs real time and thousands of
 * retained objects, which is startup work for a path many players never take.
 */
export interface Layer {
  full: Cullable
  pieces: () => Piece[]
}

/** Prepare a layer for culling. Do this once, not per frame. */
export function toLayer(input: Cullable): Layer {
  let cache: Piece[] | null = null
  return { full: input, pieces: () => (cache ??= toPieces(input)) }
}

/**
 * The part of a layer worth drawing for this view. Zoomed out far enough that
 * nothing can be culled, this hands back the layer whole — d3-geo draws it just
 * the same, and building an array of every ring per frame buys nothing.
 *
 * Otherwise it collects the survivors in one pass; filtering and then mapping
 * would allocate two arrays per layer per frame, thirteen layers deep.
 */
export function visible(layer: Layer, center: [number, number], radiusDeg: number) {
  if (radiusDeg >= 90) return layer.full
  const [cLon, cLat] = center
  const cosCLat = Math.cos(cLat * D2R)
  const radiusRad = radiusDeg * D2R
  const geometries: Piece['geom'][] = []
  for (const piece of layer.pieces()) {
    if (withinCap(piece.bbox, cLon, cLat, cosCLat, radiusDeg, radiusRad)) {
      geometries.push(piece.geom)
    }
  }
  return { type: 'GeometryCollection' as const, geometries }
}
