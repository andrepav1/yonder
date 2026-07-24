import { describe, it, expect } from 'vitest'
import { generateHidden, hiddenLogic, hiddenTempLevel } from './hidden'
import { createRound, applyGuess } from './engine'
import { capitals } from './cities'
import { haversineKm } from './geo'
import { defaultRules } from '@/config/rules'

const rules = { ...defaultRules, guesses: 8 }
const capitalSet = new Set(capitals().map((c) => c.id))

describe('generateHidden', () => {
  it('is deterministic in its seed', () => {
    expect(generateHidden('hidden-42', { rules })).toEqual(
      generateHidden('hidden-42', { rules }),
    )
  })

  it('always picks a capital target, a distinct anchor, and a meaningful clue', () => {
    for (const seed of ['h-1', 'h-2', 'h-3', 'h-abc', 'h-zzz', 'h-2026']) {
      const p = generateHidden(seed, { rules })
      expect(p.target, 'target set').toBeDefined()
      expect(capitalSet.has(p.target!.id), 'target is a capital').toBe(true)
      expect(p.start.id).not.toBe(p.target!.id)
      // targetKm is the start→target distance (the anchor clue), past the floor.
      expect(p.targetKm).toBeGreaterThanOrEqual(rules.hidden.minClueKm)
      expect(p.targetKm).toBeCloseTo(Math.round(haversineKm(p.start, p.target!)), 0)
    }
  })

  it('varies the target across seeds', () => {
    const targets = new Set(
      ['a', 'b', 'c', 'd', 'e', 'f'].map((s) => generateHidden(s, { rules }).target!.id),
    )
    expect(targets.size).toBeGreaterThan(1)
  })
})

describe('hiddenLogic', () => {
  it('wins only on the exact mystery capital, recording proximity + bearing', () => {
    const p = generateHidden('hidden-win', { rules })
    const other = capitals().find((c) => c.id !== p.target!.id)!
    // A wrong capital keeps the round playing and reports its distance to target.
    const miss = applyGuess(createRound('hidden-win'), p, other, hiddenLogic, rules)
    expect(miss.error).toBeUndefined()
    expect(miss.state.status).toBe('playing')
    const g = miss.state.guesses[0]!
    expect(g.won).toBe(false)
    expect(g.toTargetKm).toBeCloseTo(haversineKm(other, p.target!), 3)
    // The exact target wins.
    const win = applyGuess(miss.state, p, p.target!, hiddenLogic, rules)
    expect(win.state.status).toBe('won')
    expect(win.state.guesses[1]!.won).toBe(true)
    expect(win.state.guesses[1]!.toTargetKm).toBe(0)
  })

  it('rejects a duplicate guess without spending a turn', () => {
    const p = generateHidden('hidden-dup', { rules })
    const c = capitals().find((x) => x.id !== p.target!.id)!
    const first = applyGuess(createRound('hidden-dup'), p, c, hiddenLogic, rules).state
    const dup = applyGuess(first, p, c, hiddenLogic, rules)
    expect(dup.error).toBe('duplicate')
    expect(dup.state.guesses).toHaveLength(1)
  })

  it('loses after exhausting the guess allowance', () => {
    const p = generateHidden('hidden-lose', { rules })
    let s = createRound('hidden-lose')
    let used = 0
    for (const c of capitals()) {
      if (used >= rules.guesses) break
      if (c.id === p.target!.id) continue // avoid winning
      s = applyGuess(s, p, c, hiddenLogic, rules).state
      used++
    }
    expect(s.status).toBe('lost')
    expect(s.guesses).toHaveLength(rules.guesses)
  })
})

describe('hiddenTempLevel', () => {
  it('grades hottest for a find, then by proximity bands', () => {
    const [hot, warm, cool] = rules.hidden.hotColdKm
    expect(hiddenTempLevel(0, true, rules)).toBe(4)
    expect(hiddenTempLevel(hot - 1, false, rules)).toBe(3)
    expect(hiddenTempLevel(warm - 1, false, rules)).toBe(2)
    expect(hiddenTempLevel(cool - 1, false, rules)).toBe(1)
    expect(hiddenTempLevel(cool + 1, false, rules)).toBe(0)
  })
})
