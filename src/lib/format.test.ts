import { describe, it, expect } from 'vitest'
import { formatDistance, deltaPhrase, formatDirection } from './format'

describe('formatDistance', () => {
  it('formats km with thousands separators', () => {
    expect(formatDistance(1234, 'km')).toBe('1,234 km')
    expect(formatDistance(0, 'km')).toBe('0 km')
  })
  it('converts to miles', () => {
    expect(formatDistance(160.9344, 'mi')).toBe('100 mi')
  })
})

describe('deltaPhrase', () => {
  it('describes too far / too close / spot on', () => {
    expect(deltaPhrase(142, 'km')).toBe('142 km too far')
    expect(deltaPhrase(-37, 'km')).toBe('37 km too close')
    expect(deltaPhrase(0, 'km')).toBe('spot on')
  })
  it('rounds sub-unit deltas to spot on', () => {
    expect(deltaPhrase(0.3, 'km')).toBe('spot on')
  })
})

describe('formatDirection', () => {
  it('shows a compass label and an arrow', () => {
    expect(formatDirection(0)).toBe('N ↑')
    expect(formatDirection(90)).toBe('E →')
    expect(formatDirection(47)).toBe('NE ↗')
  })
})
