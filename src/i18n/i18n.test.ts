import { describe, it, expect } from 'vitest'
import {
  LOCALES,
  catalogs,
  detectLocale,
  getMessages,
  isLocale,
  type Locale,
  type Messages,
} from './index'
import { en } from './en'

// Recursively collect the "shape" (dotted key paths) of a catalog so we can
// assert every locale defines exactly the same keys as the reference (English).
function shape(obj: unknown, prefix = ''): string[] {
  if (obj === null || typeof obj !== 'object') return [prefix]
  return Object.entries(obj as Record<string, unknown>)
    .flatMap(([k, v]) => shape(v, prefix ? `${prefix}.${k}` : k))
    .sort()
}

describe('catalogs', () => {
  const locales = Object.keys(catalogs) as Locale[]

  it('registers one catalog per advertised locale', () => {
    expect(locales.sort()).toEqual(LOCALES.map((l) => l.code).sort())
  })

  it.each(locales)('%s has the same keys as the English reference', (locale) => {
    expect(shape(catalogs[locale])).toEqual(shape(en))
  })

  it.each(locales)('%s interpolation helpers produce non-empty strings', (locale) => {
    const t = catalogs[locale]
    expect(t.prompt.hint('40 km', 6)).toContain('40 km')
    expect(t.prompt.guessesLeft(3)).toContain('3')
    expect(t.result.solved(2, 6)).toContain('2/6')
    expect(t.share.ofTarget(87)).toContain('87%')
    expect(t.howTo.step3('40 km', 6)).toContain('40 km')
  })
})

describe('detectLocale', () => {
  it('matches on the primary subtag', () => {
    expect(detectLocale(['fr-FR', 'en'])).toBe('fr')
    expect(detectLocale(['it'])).toBe('it')
    expect(detectLocale(['en-GB'])).toBe('en')
    expect(detectLocale(['es-MX'])).toBe('es')
    expect(detectLocale(['zh-Hans-CN', 'en'])).toBe('zh')
    expect(detectLocale(['pt-BR'])).toBe('pt')
    expect(detectLocale(['de-AT'])).toBe('de')
    expect(detectLocale(['ja'])).toBe('ja')
    expect(detectLocale(['ko-KR'])).toBe('ko')
  })
  it('falls back to the default when nothing matches', () => {
    expect(detectLocale(['nl', 'sv'])).toBe('en')
    expect(detectLocale([])).toBe('en')
    expect(detectLocale(['ru'], 'it')).toBe('it')
  })
})

describe('isLocale / getMessages', () => {
  it('narrows valid locale codes', () => {
    expect(isLocale('fr')).toBe(true)
    expect(isLocale('de')).toBe(true)
    expect(isLocale('xx')).toBe(false)
    expect(isLocale(null)).toBe(false)
  })
  it('returns the matching catalog, defaulting for unknowns', () => {
    expect(getMessages('it')).toBe(catalogs.it)
    // Unknown codes fall back to English (defensive — types forbid this).
    expect(getMessages('xx' as Locale)).toBe(catalogs.en)
  })
})

describe('type sanity', () => {
  it('every catalog satisfies the Messages contract', () => {
    const sample: Messages = catalogs.fr
    expect(typeof sample.numberLocale).toBe('string')
  })
})
