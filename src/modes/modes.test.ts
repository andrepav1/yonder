import { describe, it, expect } from 'vitest'
import { dailyMode, practiceMode, modes } from './daily'
import { createRound } from '@/lib/engine'
import { haversineKm } from '@/lib/geo'
import { defaultRules } from '@/config/rules'

describe('mode registry', () => {
  it('registers both the daily and practice modes by id', () => {
    expect(Object.keys(modes).sort()).toEqual(['daily', 'practice'])
    expect(modes.daily).toBe(dailyMode)
    expect(modes.practice).toBe(practiceMode)
  })

  it('daily generation is deterministic in its seed (same date → same puzzle)', () => {
    expect(dailyMode.generate('2026-07-15')).toEqual(dailyMode.generate('2026-07-15'))
  })
})

describe('practice mode', () => {
  it('builds a solvable puzzle from an arbitrary (non-date) seed', () => {
    const seeds = ['practice-abc123', 'practice-zzz', 'practice-42', 'foo-bar-baz']
    for (const seed of seeds) {
      const p = practiceMode.generate(seed)
      // The generator guarantees ≥ minValidAnswers single-hop wins in the band.
      expect(p.validAnswerCount).toBeGreaterThanOrEqual(
        defaultRules.generation.minValidAnswers,
      )
      // The closest revealed answer is a genuine single-hop win (at/under target).
      const nearest = p.answers[0]!
      expect(haversineKm(p.start, nearest.city)).toBeLessThanOrEqual(p.targetKm)
    }
  })

  it('different seeds generally produce different puzzles', () => {
    const starts = new Set(
      ['practice-1', 'practice-2', 'practice-3', 'practice-4', 'practice-5'].map(
        (s) => practiceMode.generate(s).start.id,
      ),
    )
    expect(starts.size).toBeGreaterThan(1)
  })

  it('plays through apply(): a single-hop win reaches the "won" status', () => {
    const puzzle = practiceMode.generate('practice-win')
    const winner = puzzle.answers[0]!.city
    const res = practiceMode.apply(createRound('practice-win'), puzzle, winner)
    expect(res.error).toBeUndefined()
    expect(res.state.status).toBe('won')
    expect(res.state.guesses).toHaveLength(1)
  })
})
