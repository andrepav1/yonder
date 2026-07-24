import { describe, it, expect } from 'vitest'
import { dailyMode, classicMode, freeModes, modes } from './daily'
import { createRound } from '@/lib/engine'
import { haversineKm } from '@/lib/geo'
import { defaultRules } from '@/config/rules'

describe('mode registry', () => {
  it('registers the daily and every free-play mode by id', () => {
    expect(Object.keys(modes).sort()).toEqual(['classic', 'daily', 'hidden'])
    expect(modes.daily).toBe(dailyMode)
    expect(modes.classic).toBe(classicMode)
  })

  it('lists the free-play modes for the modal (Classic first)', () => {
    expect(freeModes.map((m) => m.id)).toEqual(['classic', 'hidden'])
  })

  it('daily generation is deterministic in its seed (same date → same puzzle)', () => {
    expect(dailyMode.generate('2026-07-15')).toEqual(dailyMode.generate('2026-07-15'))
  })
})

describe('classic free-play mode', () => {
  it('builds a solvable puzzle from an arbitrary (non-date) seed', () => {
    const seeds = ['free-abc123', 'free-zzz', 'free-42', 'foo-bar-baz']
    for (const seed of seeds) {
      const p = classicMode.generate(seed)
      // The generator guarantees ≥ minValidAnswers single-hop wins in the band.
      expect(p.validAnswerCount).toBeGreaterThanOrEqual(
        defaultRules.generation.minValidAnswers,
      )
      // The closest revealed answer is a genuine single-hop win (at/under target).
      const nearest = p.answers[0]!
      expect(haversineKm(p.start!, nearest.city)).toBeLessThanOrEqual(p.targetKm)
    }
  })

  it('different seeds generally produce different puzzles', () => {
    const starts = new Set(
      ['free-1', 'free-2', 'free-3', 'free-4', 'free-5'].map(
        (s) => classicMode.generate(s).start!.id,
      ),
    )
    expect(starts.size).toBeGreaterThan(1)
  })

  it('plays through apply(): a single-hop win reaches the "won" status', () => {
    const puzzle = classicMode.generate('free-win')
    const winner = puzzle.answers[0]!.city
    const res = classicMode.apply(createRound('free-win'), puzzle, winner)
    expect(res.error).toBeUndefined()
    expect(res.state.status).toBe('won')
    expect(res.state.guesses).toHaveLength(1)
  })
})
