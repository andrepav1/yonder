// Display formatting for distances + bearings. Pure.
//
// The word-bearing helpers take a `Messages` catalog (default: English) so the
// same logic renders in any locale — number grouping follows `t.numberLocale`,
// phrasing follows `t.format.*`.

import type { Unit } from '@/config/rules'
import { type Messages, en } from '@/i18n'
import { toUnit, bearingArrow } from './geo'

/** e.g. formatDistance(1234, 'km') -> "1,234 km". Rounds to whole units. */
export function formatDistance(km: number, unit: Unit, t: Messages = en): string {
  const value = Math.round(toUnit(km, unit))
  return `${value.toLocaleString(t.numberLocale)} ${unit}`
}

/**
 * The win band's half-width (how far off the target still wins, either way) as
 * a display string, e.g. "500 km". One source of truth for the prompt + how-to
 * copy. Flat in km, so unlike the old percentage band it doesn't change with
 * the day's target.
 */
export function bandLabel(toleranceKm: number, unit: Unit, t: Messages = en): string {
  return formatDistance(toleranceKm, unit, t)
}

/**
 * Human phrase for the remaining distance to the target (targetKm − total).
 * + = still short ("142 km to go"), − = overshot ("37 km over"), ~0 = "on the line".
 */
export function remainingPhrase(
  remainingKm: number,
  unit: Unit,
  t: Messages = en,
): string {
  const rounded = Math.round(toUnit(Math.abs(remainingKm), unit))
  if (rounded === 0) return t.format.onTheLine
  const magnitude = `${rounded.toLocaleString(t.numberLocale)} ${unit}`
  return remainingKm >= 0 ? t.format.toGo(magnitude) : t.format.over(magnitude)
}

/** e.g. "47° ↗" — exact degrees plus the nearest 8-way arrow. */
export function formatBearing(bearingDeg: number): string {
  return `${Math.round(bearingDeg) % 360}° ${bearingArrow(bearingDeg)}`
}
