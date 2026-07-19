import { describe, it, expect } from 'vitest'
import { formatDistance, remainingPhrase, formatBearing } from './format'
import { catalogs } from '@/i18n'

describe('formatDistance', () => {
  it('formats km with thousands separators', () => {
    expect(formatDistance(1234, 'km')).toBe('1,234 km')
    expect(formatDistance(0, 'km')).toBe('0 km')
  })
  it('converts to miles', () => {
    expect(formatDistance(160.9344, 'mi')).toBe('100 mi')
  })
})

describe('remainingPhrase', () => {
  it('describes distance to go / over / on the line', () => {
    expect(remainingPhrase(142, 'km')).toBe('142 km to go')
    expect(remainingPhrase(-37, 'km')).toBe('37 km over')
    expect(remainingPhrase(0, 'km')).toBe('on the line')
  })
  it('rounds sub-unit remainders to on the line', () => {
    expect(remainingPhrase(0.3, 'km')).toBe('on the line')
  })
})

describe('formatBearing', () => {
  it('shows degrees and an arrow', () => {
    expect(formatBearing(0)).toBe('0° ↑')
    expect(formatBearing(90)).toBe('90° →')
    expect(formatBearing(47)).toBe('47° ↗')
  })
})

describe('localized formatting', () => {
  it('groups numbers by the locale and translates the phrase', () => {
    // French groups thousands with a space (exact codepoint varies by ICU
    // version), never a comma.
    const fr = formatDistance(1234, 'km', catalogs.fr)
    expect(fr).not.toContain(',')
    expect(fr).toMatch(/^1\s234 km$/u)
    expect(remainingPhrase(142, 'km', catalogs.fr)).toBe('142 km restants')
    expect(remainingPhrase(-37, 'km', catalogs.it)).toBe('37 km di troppo')
    expect(remainingPhrase(0, 'km', catalogs.it)).toBe('esattamente sulla linea')
  })
})
