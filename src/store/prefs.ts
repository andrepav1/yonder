// Small UI preferences: display unit, language, and whether the how-to-play
// primer was seen.

import type { Unit } from '@/config/rules'
import { type Locale, isLocale } from '@/i18n'
import { type KeyValueStore, defaultStore } from './storage'

const UNIT_KEY = 'yondle:unit:v1'
const LOCALE_KEY = 'yondle:locale:v1'
const ONBOARDED_KEY = 'yondle:onboarded:v1'

export function loadUnit(fallback: Unit, storage: KeyValueStore = defaultStore()): Unit {
  const v = storage.getItem(UNIT_KEY)
  return v === 'km' || v === 'mi' ? v : fallback
}

export function saveUnit(unit: Unit, storage: KeyValueStore = defaultStore()): void {
  storage.setItem(UNIT_KEY, unit)
}

/** The saved language, or null if none has been chosen yet. */
export function loadLocale(storage: KeyValueStore = defaultStore()): Locale | null {
  const v = storage.getItem(LOCALE_KEY)
  return isLocale(v) ? v : null
}

export function saveLocale(
  locale: Locale,
  storage: KeyValueStore = defaultStore(),
): void {
  storage.setItem(LOCALE_KEY, locale)
}

export function isOnboarded(storage: KeyValueStore = defaultStore()): boolean {
  return storage.getItem(ONBOARDED_KEY) === '1'
}

export function setOnboarded(storage: KeyValueStore = defaultStore()): void {
  storage.setItem(ONBOARDED_KEY, '1')
}
