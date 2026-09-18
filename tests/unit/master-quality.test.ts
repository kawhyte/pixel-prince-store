import { describe, it, expect } from 'vitest'
import {
  PRINT_DPI_FLOOR,
  PRINT_DPI_TARGET,
  dpiAtSize,
  inchesFromSizeName,
  masterQuality,
  orientationRefusal,
  SIZE_NAMES,
} from '@/lib/fourthwall-platform'

const LADDER = SIZE_NAMES.poster

// The old check only asked for 2400x3000 — 300 dpi at 8x10 — and said nothing about the 24x36 the
// shop actually sells, so a file printing at 100 dpi on the largest size passed without a word.
// Artwork cannot be replaced after a product is created, so this has to refuse, not warn.
describe('masterQuality', () => {
  it('reads inches out of the ladder strings', () => {
    expect(inchesFromSizeName('24" x 36"')).toEqual([24, 36])
    expect(inchesFromSizeName('8" x 10"')).toEqual([8, 10])
    expect(inchesFromSizeName('nonsense')).toBeNull()
  })

  it('passes the masters actually in the shop', () => {
    // Every live print is 8640x10800: 300 dpi at 24x36, the largest size sold.
    const q = masterQuality({ width: 8640, height: 10800, contentType: 'image/png' }, LADDER)
    expect(q.ok).toBe(true)
    expect(Math.round(q.dpiAtLargest)).toBe(300)
    expect(q.message).toBeNull()
  })

  it('refuses a file that would print soft on the largest size', () => {
    // The Etsy thumbnail that started all this: 1140x1140.
    const q = masterQuality({ width: 1140, height: 1140, contentType: 'image/png' }, LADDER)
    expect(q.ok).toBe(false)
    expect(q.message).toContain('below')
  })

  it('warns but allows a master between the floor and the target', () => {
    // The world map, 6000x4800: 167 dpi at 24x36, full resolution only to 16x20.
    const q = masterQuality({ width: 6000, height: 4800, contentType: 'image/png' }, LADDER)
    expect(q.ok).toBe(true)
    expect(Math.round(q.dpiAtLargest)).toBe(167)
    expect(q.largestAt300).toBe('16" x 20"')
    expect(q.message).toContain('16" x 20"')
  })

  it('would have passed the old check, and is caught by this one', () => {
    // 2400x3000 satisfied the old rule exactly and prints at 83 dpi on 24x36.
    const q = masterQuality({ width: 2400, height: 3000, contentType: 'image/png' }, LADDER)
    expect(Math.round(q.dpiAtLargest)).toBe(83)
    expect(q.ok).toBe(false)
  })

  it('measures a landscape master against the paper the same way up', () => {
    const landscape = { width: 10800, height: 8640, contentType: 'image/png' as const }
    const portrait = { width: 8640, height: 10800, contentType: 'image/png' as const }
    // 24x36 paper turned landscape is 36 wide by 24 tall; both masters should score the same.
    expect(dpiAtSize(landscape, [24, 36])).toBeCloseTo(dpiAtSize(portrait, [24, 36]), 6)
  })

  it('the floor sits below the target, and both are sane', () => {
    expect(PRINT_DPI_FLOOR).toBeLessThan(PRINT_DPI_TARGET)
    expect(PRINT_DPI_TARGET).toBe(300)
  })
})

describe('orientationRefusal', () => {
  it('refuses a landscape master, because Fourthwall has no landscape wall art', () => {
    // Checked in their catalogue 2026-09-17: both poster templates offer Vertical and Square and
    // no Horizontal. The only landscape product has no unframed version.
    const w = orientationRefusal({ width: 6000, height: 4800, contentType: 'image/png' })
    expect(w).toContain('landscape')
    expect(w).toContain('Vertical and Square')
  })

  it('is quiet for portrait and for square', () => {
    expect(orientationRefusal({ width: 8640, height: 10800, contentType: 'image/png' })).toBeNull()
    expect(orientationRefusal({ width: 3000, height: 3000, contentType: 'image/png' })).toBeNull()
  })
})
