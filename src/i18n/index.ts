// i18n registry — locales, catalogs, and lookup helpers. React-free so the pure
// `lib/*` helpers can import catalogs without pulling in the UI.

import type { Locale, LocaleInfo, Messages } from './types'
import { en } from './en'
import { fr } from './fr'
import { it } from './it'

export type { Locale, LocaleInfo, Messages } from './types'
export { en } from './en'

export const defaultLocale: Locale = 'en'

/** All catalogs, keyed by locale. */
export const catalogs: Record<Locale, Messages> = { en, fr, it }

/** Ordered locale metadata for the language switcher. */
export const LOCALES: LocaleInfo[] = [
  { code: 'en', label: 'English', short: 'EN' },
  { code: 'fr', label: 'Français', short: 'FR' },
  { code: 'it', label: 'Italiano', short: 'IT' },
]

export function isLocale(value: unknown): value is Locale {
  return value === 'en' || value === 'fr' || value === 'it'
}

/** Catalog for a locale, falling back to the default. */
export function getMessages(locale: Locale): Messages {
  return catalogs[locale] ?? catalogs[defaultLocale]
}

/**
 * Best-effort match of a browser language list (e.g. `navigator.languages`) to a
 * supported locale by primary subtag. Returns the default if nothing matches.
 */
export function detectLocale(
  preferred: readonly string[] = [],
  fallback: Locale = defaultLocale,
): Locale {
  for (const tag of preferred) {
    const primary = tag.toLowerCase().split('-')[0]
    if (isLocale(primary)) return primary
  }
  return fallback
}
