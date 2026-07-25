import { describe, it, expect } from 'vitest'
import { geoContains, geoOrthographic, geoPath } from 'd3-geo'
import { feature, mesh } from 'topojson-client'
import type { FeatureCollection } from 'geojson'
import worldTopo from 'world-atlas/countries-110m.json'
import elevationTopo from '@/data/elevation.json'
import {
  asGeometry,
  bboxOf,
  cull,
  lonDelta,
  toPieces,
  visibleRadiusDeg,
  type Piece,
} from '@/lib/cull'

// Mirrors Globe.tsx's board geometry.
const SIZE = 320
const RADIUS = SIZE / 2 - 3
const REACH = Math.SQRT2 * (SIZE / 2) + 8

describe('bboxOf', () => {
  it('bounds a ring', () => {
    expect(
      bboxOf([
        [
          [-10, -5],
          [20, 5],
          [0, 30],
        ],
      ]),
    ).toEqual([-10, -5, 20, 30])
  })

  it('spans every ring of a polygon, holes included', () => {
    expect(
      bboxOf([
        [
          [0, 0],
          [10, 10],
        ],
        [
          [-4, 2],
          [3, 3],
        ],
      ]),
    ).toEqual([-4, 0, 10, 10])
  })
})

describe('lonDelta', () => {
  it('measures the short way round the antimeridian', () => {
    expect(lonDelta(179, -179)).toBeCloseTo(2)
    expect(lonDelta(-179, 179)).toBeCloseTo(2)
  })

  it('is zero for the same meridian and 180 for the opposite one', () => {
    expect(lonDelta(45, 45)).toBeCloseTo(0)
    expect(lonDelta(0, 180)).toBeCloseTo(180)
  })
})

describe('visibleRadiusDeg', () => {
  it('gives up culling when the whole hemisphere fits the board', () => {
    expect(visibleRadiusDeg(RADIUS * 1, REACH)).toBe(90)
    // Even at 1.5× the board's corners still reach most of the hemisphere.
    expect(visibleRadiusDeg(RADIUS * 1.5, REACH)).toBe(90)
  })

  it('tightens as the globe is magnified', () => {
    const z3 = visibleRadiusDeg(RADIUS * 3, REACH)
    const z6 = visibleRadiusDeg(RADIUS * 6, REACH)
    expect(z6).toBeLessThan(z3)
    expect(z3).toBeLessThan(90)
    // 6× shows a corner-to-corner cap of ~14°, plus the safety margin.
    expect(z6).toBeGreaterThan(20)
    expect(z6).toBeLessThan(40)
  })
})

describe('toPieces', () => {
  it('splits a MultiPolygon so its rings cull independently', () => {
    const fc: FeatureCollection = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: null,
          geometry: {
            type: 'MultiPolygon',
            coordinates: [
              [
                [
                  [0, 0],
                  [1, 0],
                  [1, 1],
                  [0, 0],
                ],
              ],
              [
                [
                  [100, 40],
                  [101, 40],
                  [101, 41],
                  [100, 40],
                ],
              ],
            ],
          },
        },
      ],
    }
    const pieces = toPieces(fc)
    expect(pieces).toHaveLength(2)
    expect(pieces.every((p) => p.geom.type === 'Polygon')).toBe(true)
    expect(pieces[1]!.bbox).toEqual([100, 40, 101, 41])
  })
})

// The property that matters: culling may keep too much, never too little.
// Anything that would have painted inside the board must survive.
describe('cull keeps everything the board can show', () => {
  const world = worldTopo as unknown as Parameters<typeof feature>[0]
  const layers: Record<string, Piece[]> = {
    coast: toPieces(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      feature(world, (worldTopo as any).objects.land) as unknown as FeatureCollection,
    ),
    borders: toPieces(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mesh(world, (worldTopo as any).objects.countries, (a, b) => a !== b),
    ),
    relief: toPieces(
      feature(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        elevationTopo as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (elevationTopo as any).objects.bands,
      ) as unknown as FeatureCollection,
    ),
  }

  // A spread of centres: mid-latitudes, the equator, both poles, and the
  // antimeridian, where the longitude arithmetic is easiest to get wrong.
  const centres: [number, number][] = [
    [0, 0],
    [122, 12],
    [24, 38],
    [179.5, -8],
    [-179.5, 62],
    [0, 89],
    [0, -89],
    [-60, -33],
  ]
  const zooms = [2.2, 3, 6]

  // A piece paints on the board if any point of its drawn path lands inside it,
  // or — for a polygon — if it simply contains the view centre and fills it. A
  // screen-space bounding box is not enough: a big ring clipped at the limb has
  // a huge box while drawing nothing the board can see.
  const boardPoints = (d: string): boolean => {
    const nums = d.match(/-?\d+(?:\.\d+)?/g)
    if (!nums) return false
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const x = Number(nums[i])
      const y = Number(nums[i + 1])
      if (x >= 0 && x <= SIZE && y >= 0 && y <= SIZE) return true
    }
    return false
  }

  for (const [name, pieces] of Object.entries(layers)) {
    it(`never drops a visible ${name} piece`, () => {
      let dropped = 0
      for (const centre of centres) {
        for (const zoom of zooms) {
          const projection = geoOrthographic()
            .scale(RADIUS * zoom)
            .translate([SIZE / 2, SIZE / 2])
            .rotate([-centre[0], -centre[1], 0])
            .clipAngle(90)
          const path = geoPath(projection)
          const radius = visibleRadiusDeg(RADIUS * zoom, REACH)
          const kept = new Set(cull(pieces, centre, radius).map((p) => p.geom))

          for (const piece of pieces) {
            if (kept.has(piece.geom)) continue
            dropped++
            const drawn = path(piece.geom) ?? ''
            const covers = piece.geom.type === 'Polygon' && geoContains(piece.geom, centre)
            expect(
              !covers && !boardPoints(drawn),
              `${name} piece dropped at centre ${centre} zoom ${zoom} (radius ${radius.toFixed(1)}°) ` +
                `but it ${covers ? 'covers the view centre' : 'draws inside the board'}; ` +
                `bbox ${piece.bbox.map((v) => v.toFixed(1)).join(',')}`,
            ).toBe(true)
          }
        }
      }
      // The sweep is only meaningful if it culled something.
      expect(dropped).toBeGreaterThan(0)
    })
  }

  it('keeps every piece when the whole hemisphere is in view', () => {
    const pieces = layers.coast!
    expect(cull(pieces, [0, 0], visibleRadiusDeg(RADIUS, REACH))).toHaveLength(pieces.length)
  })

  it('actually culls hard when zoomed in', () => {
    const pieces = layers.relief!
    const kept = cull(pieces, [24, 38], visibleRadiusDeg(RADIUS * 6, REACH))
    expect(kept.length).toBeLessThan(pieces.length / 3)
  })
})

describe('asGeometry', () => {
  it('wraps pieces into one drawable GeometryCollection', () => {
    const g = asGeometry(
      toPieces({
        type: 'MultiLineString',
        coordinates: [
          [
            [0, 0],
            [1, 1],
          ],
        ],
      }),
    )
    expect(g.type).toBe('GeometryCollection')
    expect(g.geometries).toHaveLength(1)
  })
})
