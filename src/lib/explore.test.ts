import { describe, it, expect } from 'vitest'
import { exploreMinPopulation } from './explore'
import { defaultRules } from '@/config/rules'

describe('exploreMinPopulation', () => {
  const { minZoom, maxZoom, zoomedOutMinPopulation } = defaultRules.explore
  const floor = defaultRules.dataset.minPopulation

  it('shows only the biggest cities when fully zoomed out', () => {
    expect(exploreMinPopulation(minZoom, defaultRules)).toBe(zoomedOutMinPopulation)
  })

  it('eases down to the dataset floor when fully zoomed in', () => {
    expect(exploreMinPopulation(maxZoom, defaultRules)).toBe(floor)
  })

  it('decreases monotonically as you zoom in', () => {
    let prev = Infinity
    for (let z = minZoom; z <= maxZoom; z += 0.5) {
      const cur = exploreMinPopulation(z, defaultRules)
      expect(cur).toBeLessThanOrEqual(prev)
      prev = cur
    }
  })

  it('stays within [floor, zoomedOut] across the range', () => {
    for (let z = minZoom; z <= maxZoom; z += 0.25) {
      const cur = exploreMinPopulation(z, defaultRules)
      expect(cur).toBeGreaterThanOrEqual(floor)
      expect(cur).toBeLessThanOrEqual(zoomedOutMinPopulation)
    }
  })

  it('clamps zoom outside the configured range', () => {
    expect(exploreMinPopulation(minZoom - 5, defaultRules)).toBe(zoomedOutMinPopulation)
    expect(exploreMinPopulation(maxZoom + 5, defaultRules)).toBe(floor)
  })
})
