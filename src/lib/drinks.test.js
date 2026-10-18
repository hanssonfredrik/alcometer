import { describe, it, expect } from 'vitest'
import { sizeChips, lastDrinkType, describeDrink } from './drinks.js'
import { DEFAULT_SIZES } from './constants.js'

describe('sizeChips', () => {
  it('merges the configured default into the presets and flags it', () => {
    expect(sizeChips('beer', DEFAULT_SIZES)).toEqual([
      { cl: 33, isDefault: true },
      { cl: 40, isDefault: false },
      { cl: 50, isDefault: false },
    ])
  })

  it('inserts a non-preset default in order', () => {
    const sizes = { ...DEFAULT_SIZES, beer: { ml: 350, abv: 0.05 } }
    expect(sizeChips('beer', sizes).map((c) => c.cl)).toEqual([33, 35, 40, 50])
    expect(sizeChips('beer', sizes).find((c) => c.isDefault).cl).toBe(35)
  })

  it('does not duplicate a default that is already a preset', () => {
    const sizes = { ...DEFAULT_SIZES, beer: { ml: 500, abv: 0.05 } }
    const chips = sizeChips('beer', sizes)
    expect(chips.filter((c) => c.cl === 50)).toHaveLength(1)
    expect(chips.find((c) => c.cl === 50).isDefault).toBe(true)
  })

  it('falls back to presets alone when sizes are missing', () => {
    expect(sizeChips('wine', {}).map((c) => c.cl)).toEqual([12, 15, 18, 25])
    expect(sizeChips('wine', {}).some((c) => c.isDefault)).toBe(false)
  })
})

describe('lastDrinkType', () => {
  it('defaults to wine with nothing logged', () => {
    expect(lastDrinkType({})).toBe('wine')
    expect(lastDrinkType(undefined)).toBe('wine')
  })

  it('picks the latest timestamp across days, not array order', () => {
    const days = {
      '2026-03-01': {
        entries: [{ type: 'liquor', ts: 300 }],
      },
      '2026-02-01': {
        entries: [
          { type: 'beer', ts: 100 },
          { type: 'cava', ts: 200 },
        ],
      },
    }
    expect(lastDrinkType(days)).toBe('liquor')
  })

  it('ignores an unknown type', () => {
    expect(lastDrinkType({ d: { entries: [{ type: 'mead', ts: 1 }] } })).toBe(
      'wine',
    )
  })
})

describe('describeDrink', () => {
  it('formats label and size', () => {
    expect(describeDrink({ type: 'beer', cl: 33 })).toBe('Beer · 33 cl')
  })
})
