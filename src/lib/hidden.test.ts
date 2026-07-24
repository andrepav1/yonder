import { describe, it, expect } from 'vitest'
import { generateHidden, hiddenLogic, hiddenTempLevel, buildHiddenShare } from './hidden'
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

  it('always picks a capital target and gives away nothing else', () => {
    for (const seed of ['h-1', 'h-2', 'h-3', 'h-abc', 'h-zzz', 'h-2026']) {
      const p = generateHidden(seed, { rules })
      expect(p.target, 'target set').toBeDefined()
      expect(capitalSet.has(p.target!.id), 'target is a capital').toBe(true)
      // No start city and no opening distance: every clue is earned by guessing.
      expect(p.start, 'no start city').toBeUndefined()
      expect(p.targetKm).toBe(0)
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

describe('buildHiddenShare', () => {
  it('shows the win count on a win and never leaks a city name', () => {
    const p = generateHidden('hidden-share', { rules })
    const other = capitals().find((c) => c.id !== p.target!.id)!
    let s = applyGuess(createRound('hidden-share'), p, other, hiddenLogic, rules).state
    s = applyGuess(s, p, p.target!, hiddenLogic, rules).state
    const text = buildHiddenShare(s, p, rules, { url: 'https://example.test' })
    expect(text).toContain('2/8') // found on the 2nd guess of 8
    expect(text).toContain('https://example.test')
    // No spoilers: neither the target nor the probed city appears.
    expect(text).not.toContain(p.target!.name)
    expect(text).not.toContain(other.name)
    // One square row per guess.
    expect(text.split('\n').filter((l) => /🟥|🟧|🟨|🟦|⬜/.test(l))).toHaveLength(2)
  })

  it('marks a loss with X/total', () => {
    const p = generateHidden('hidden-share-lose', { rules })
    const other = capitals().find((c) => c.id !== p.target!.id)!
    const s = applyGuess(createRound('hidden-share-lose'), p, other, hiddenLogic, {
      ...rules,
      guesses: 1,
    }).state
    expect(s.status).toBe('lost')
    expect(buildHiddenShare(s, p, { ...rules, guesses: 1 })).toContain('X/1')
  })
})
