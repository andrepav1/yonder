// Small UI preferences: display unit + whether the how-to-play primer was seen.

import type { Unit } from '@/config/rules'
import { type KeyValueStore, defaultStore } from './storage'

const UNIT_KEY = 'yonder:unit:v1'
const ONBOARDED_KEY = 'yonder:onboarded:v1'

export function loadUnit(fallback: Unit, storage: KeyValueStore = defaultStore()): Unit {
  const v = storage.getItem(UNIT_KEY)
  return v === 'km' || v === 'mi' ? v : fallback
}

export function saveUnit(unit: Unit, storage: KeyValueStore = defaultStore()): void {
  storage.setItem(UNIT_KEY, unit)
}

export function isOnboarded(storage: KeyValueStore = defaultStore()): boolean {
  return storage.getItem(ONBOARDED_KEY) === '1'
}

export function setOnboarded(storage: KeyValueStore = defaultStore()): void {
  storage.setItem(ONBOARDED_KEY, '1')
}
