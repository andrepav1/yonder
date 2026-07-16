// Display formatting for distances + bearings. Pure.

import type { Unit } from '@/config/rules'
import { toUnit, bearingArrow } from './geo'

/** e.g. formatDistance(1234, 'km') -> "1,234 km". Rounds to whole units. */
export function formatDistance(km: number, unit: Unit): string {
  const value = Math.round(toUnit(km, unit))
  return `${value.toLocaleString('en-US')} ${unit}`
}

/**
 * The win band's width (how far below the target still wins) as a display
 * string, e.g. "45 km". One source of truth for the prompt + how-to copy.
 */
export function bandLabel(targetKm: number, tolerancePct: number, unit: Unit): string {
  return formatDistance(targetKm * tolerancePct, unit)
}

/**
 * Human phrase for the remaining distance to the target (targetKm − total).
 * + = still short ("142 km to go"), − = overshot ("37 km over"), ~0 = "on the line".
 */
export function remainingPhrase(remainingKm: number, unit: Unit): string {
  const rounded = Math.round(toUnit(Math.abs(remainingKm), unit))
  if (rounded === 0) return 'on the line'
  const magnitude = `${rounded.toLocaleString('en-US')} ${unit}`
  return remainingKm >= 0 ? `${magnitude} to go` : `${magnitude} over`
}

/** e.g. "47° ↗" — exact degrees plus the nearest 8-way arrow. */
export function formatBearing(bearingDeg: number): string {
  return `${Math.round(bearingDeg) % 360}° ${bearingArrow(bearingDeg)}`
}
