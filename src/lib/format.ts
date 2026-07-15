// Display formatting for distances + bearings. Pure.

import type { Unit } from '@/config/rules'
import { toUnit, bearingArrow } from './geo'

/** e.g. formatDistance(1234, 'km') -> "1,234 km". Rounds to whole units. */
export function formatDistance(km: number, unit: Unit): string {
  const value = Math.round(toUnit(km, unit))
  return `${value.toLocaleString('en-US')} ${unit}`
}

/**
 * Human phrase for a signed delta (guess distance − target).
 * + = "too far", − = "too close", ~0 = "spot on".
 */
export function deltaPhrase(deltaKm: number, unit: Unit): string {
  const rounded = Math.round(toUnit(Math.abs(deltaKm), unit))
  if (rounded === 0) return 'spot on'
  const magnitude = `${rounded.toLocaleString('en-US')} ${unit}`
  return deltaKm > 0 ? `${magnitude} too far` : `${magnitude} too close`
}

/** e.g. "47° ↗" — exact degrees plus the nearest 8-way arrow. */
export function formatBearing(bearingDeg: number): string {
  return `${Math.round(bearingDeg) % 360}° ${bearingArrow(bearingDeg)}`
}
