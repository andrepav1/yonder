import { describe, it, expect } from 'vitest'
import {
  haversineKm,
  initialBearingDeg,
  compass16,
  bearingArrow,
  kmToMiles,
  milesToKm,
  toUnit,
  EARTH_RADIUS_KM,
} from './geo'

const London = { lat: 51.5074, lng: -0.1278 }
const Paris = { lat: 48.8566, lng: 2.3522 }
const NYC = { lat: 40.7128, lng: -74.006 }
const LA = { lat: 34.0522, lng: -118.2437 }

describe('haversineKm', () => {
  it('matches known city pairs', () => {
    // London–Paris is ~343 km.
    expect(haversineKm(London, Paris)).toBeCloseTo(343.5, 0)
    // NYC–LA is ~3936 km.
    expect(haversineKm(NYC, LA)).toBeGreaterThan(3920)
    expect(haversineKm(NYC, LA)).toBeLessThan(3950)
  })

  it('is zero for identical points', () => {
    expect(haversineKm(Paris, Paris)).toBe(0)
  })

  it('is symmetric', () => {
    expect(haversineKm(London, Paris)).toBeCloseTo(haversineKm(Paris, London), 6)
  })

  it('spans half the circumference for antipodal-on-equator points', () => {
    const half = Math.PI * EARTH_RADIUS_KM
    expect(haversineKm({ lat: 0, lng: 0 }, { lat: 0, lng: 180 })).toBeCloseTo(half, 0)
  })
})

describe('initialBearingDeg', () => {
  const origin = { lat: 0, lng: 0 }
  it('reads cardinal directions exactly', () => {
    expect(initialBearingDeg(origin, { lat: 1, lng: 0 })).toBeCloseTo(0, 6) // N
    expect(initialBearingDeg(origin, { lat: 0, lng: 1 })).toBeCloseTo(90, 6) // E
    expect(initialBearingDeg(origin, { lat: -1, lng: 0 })).toBeCloseTo(180, 6) // S
    expect(initialBearingDeg(origin, { lat: 0, lng: -1 })).toBeCloseTo(270, 6) // W
  })

  it('normalizes to [0,360)', () => {
    const b = initialBearingDeg(Paris, London)
    expect(b).toBeGreaterThanOrEqual(0)
    expect(b).toBeLessThan(360)
  })

  it('points roughly south-east from London to Paris', () => {
    const b = initialBearingDeg(London, Paris)
    expect(b).toBeGreaterThan(120)
    expect(b).toBeLessThan(170)
  })
})

describe('compass16 / bearingArrow', () => {
  it('maps degrees to compass points', () => {
    expect(compass16(0)).toBe('N')
    expect(compass16(45)).toBe('NE')
    expect(compass16(90)).toBe('E')
    expect(compass16(180)).toBe('S')
    expect(compass16(270)).toBe('W')
    expect(compass16(359)).toBe('N')
  })

  it('maps degrees to 8-way arrows', () => {
    expect(bearingArrow(0)).toBe('↑')
    expect(bearingArrow(90)).toBe('→')
    expect(bearingArrow(180)).toBe('↓')
    expect(bearingArrow(270)).toBe('←')
  })
})

describe('unit conversion', () => {
  it('converts km <-> miles', () => {
    expect(kmToMiles(100)).toBeCloseTo(62.1371, 3)
    expect(milesToKm(100)).toBeCloseTo(160.9344, 3)
    expect(milesToKm(kmToMiles(500))).toBeCloseTo(500, 6)
  })

  it('toUnit respects the selected unit', () => {
    expect(toUnit(100, 'km')).toBe(100)
    expect(toUnit(100, 'mi')).toBeCloseTo(62.1371, 3)
  })
})
