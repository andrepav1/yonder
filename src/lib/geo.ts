// Great-circle geometry. Pure, dependency-free, unit-tested.

import type { Unit } from '@/config/rules'

/** Mean Earth radius (km), per IUGG. */
export const EARTH_RADIUS_KM = 6371.0088

const KM_PER_MILE = 1.609344

const toRad = (deg: number): number => (deg * Math.PI) / 180
const toDeg = (rad: number): number => (rad * 180) / Math.PI

export interface LatLng {
  lat: number
  lng: number
}

/**
 * Great-circle distance between two points in kilometres (haversine formula).
 */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLng = Math.sin(dLng / 2)
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Initial bearing (forward azimuth) from `a` to `b`, in degrees clockwise from
 * north, normalized to [0, 360).
 */
export function initialBearingDeg(a: LatLng, b: LatLng): number {
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const dLng = toRad(b.lng - a.lng)

  const y = Math.sin(dLng) * Math.cos(lat2)
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng)
  return (toDeg(Math.atan2(y, x)) + 360) % 360
}

const COMPASS_16 = [
  'N',
  'NNE',
  'NE',
  'ENE',
  'E',
  'ESE',
  'SE',
  'SSE',
  'S',
  'SSW',
  'SW',
  'WSW',
  'W',
  'WNW',
  'NW',
  'NNW',
] as const

/** 16-point compass label for a bearing in degrees (e.g. 47 -> "NE"). */
export function compass16(bearingDeg: number): string {
  const idx = Math.round((((bearingDeg % 360) + 360) % 360) / 22.5) % 16
  return COMPASS_16[idx]!
}

const ARROWS = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'] as const

/** Nearest 8-way arrow glyph for a bearing (0 = ↑ north). */
export function bearingArrow(bearingDeg: number): string {
  const idx = Math.round((((bearingDeg % 360) + 360) % 360) / 45) % 8
  return ARROWS[idx]!
}

export const kmToMiles = (km: number): number => km / KM_PER_MILE
export const milesToKm = (mi: number): number => mi * KM_PER_MILE

/** Convert a km value into the requested display unit. */
export function toUnit(km: number, unit: Unit): number {
  return unit === 'mi' ? kmToMiles(km) : km
}

export const unitLabel = (unit: Unit): string => unit
