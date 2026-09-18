import { describe, it, expect } from 'vitest'
import {
  DEFAULT_RATIO,
  FULL_LADDER,
  SHOP_SIZE_LADDER,
  ratioFromTag,
  ratioTag,
  scopeFromTag,
  sizeIdsForScope,
} from '@/config/commerce'
import {
  WHITE_GROUND_TOLERANCE,
  masterQuality,
  productName,
  ratioTagFromFilename,
  sizeNamesFor,
  titleFromFilename,
  whiteGroundVerdict,
  type EdgePixel,
} from '@/lib/fourthwall-platform'
import { splitProductName, splitRatio } from '@/lib/fourthwall-import'

const ALL_IDS = SHOP_SIZE_LADDER.map((s) => s.id)
const px = (r: number, g: number, b: number): EdgePixel => ({ r, g, b })

// One master for every size only works because Fourthwall leaves the paper it has no artwork for
// as bare white sheet. On white art there is nothing to see; on anything else there is a line.
describe('the [all] scope', () => {
  it('is a scope but not a ratio, so nothing mistakes it for a shape', () => {
    expect(scopeFromTag('all')).toBe(FULL_LADDER)
    expect(ratioFromTag('all')).toBeNull()
    expect(ratioTag(FULL_LADDER)).toBe('all')
    expect(scopeFromTag('ALL')).toBe(FULL_LADDER)
    expect(scopeFromTag('9x16')).toBeNull()
  })

  it('covers the whole ladder, where a ratio covers only its own family', () => {
    expect(sizeIdsForScope(FULL_LADDER)).toEqual(ALL_IDS)
    expect(sizeIdsForScope('4:5')).toEqual(['8x10', '16x20'])
  })

  it('sells every stocked size in both finishes', () => {
    expect(sizeNamesFor(FULL_LADDER, 'poster')).toEqual(['8" x 10"', '11" x 14"', '16" x 20"', '18" x 24"', '24" x 36"'])
    expect(sizeNamesFor(FULL_LADDER, 'framed')).toEqual(sizeNamesFor(FULL_LADDER, 'poster'))
  })

  it('announces itself in a file name and a product name, and never in a title', () => {
    expect(ratioTagFromFilename('Brooklyn Neighborhood Map (Earth) [all].png')).toBe('all')
    expect(titleFromFilename('Brooklyn Neighborhood Map (Earth) [all].png')).toBe('Brooklyn Neighborhood Map (Earth)')
    expect(productName('Brooklyn Neighborhood Map (Earth)', 'poster', FULL_LADDER)).toBe('Brooklyn Neighborhood Map (Earth) [all]')
    expect(productName('Brooklyn Neighborhood Map (Earth)', 'framed', FULL_LADDER)).toBe('Brooklyn Neighborhood Map (Earth) [all] | Framed')
  })

  it('comes back off a product name with the version intact', () => {
    expect(splitRatio('Brooklyn (Earth) [all]')).toEqual({ baseTitle: 'Brooklyn (Earth)', ratio: FULL_LADDER })
    expect(splitProductName('Brooklyn (Earth) [all] | Framed')).toEqual({
      title: 'Brooklyn', version: 'Earth', ratio: FULL_LADDER, finish: 'framed',
    })
  })

  it('leaves the untagged default alone, so nothing made before it is orphaned', () => {
    expect(productName('Retro Consoles (Beige)', 'poster')).toBe('Retro Consoles (Beige)')
    expect(splitProductName('Retro Consoles (Beige)').ratio).toBe(DEFAULT_RATIO)
  })

  it('is held to the whole ladder on resolution, not to one family', () => {
    const brooklyn = { width: 7200, height: 10800, contentType: 'image/png' as const }
    expect(masterQuality(brooklyn, sizeNamesFor(FULL_LADDER, 'poster')).ok).toBe(true)
    // 24x36 is the size that sets the floor, and this master lands on 300 dpi exactly
    expect(Math.round(masterQuality(brooklyn, sizeNamesFor(FULL_LADDER, 'poster')).dpiAtLargest)).toBe(300)

    // the same shape at half the pixels is a soft 24x36 and has to be refused
    const small = { width: 3600, height: 5400, contentType: 'image/png' as const }
    expect(masterQuality(small, sizeNamesFor(FULL_LADDER, 'poster')).message).toBeTruthy()
  })
})

// The check that earns [all] its sizes. It is a refusal rather than a warning because artwork
// cannot be replaced after a product is created, and cream reads as white on every screen.
describe('the white-ground check', () => {
  it('passes a master whose edges are pure white', () => {
    const v = whiteGroundVerdict([px(255, 255, 255), px(255, 255, 255), px(255, 255, 255), px(255, 255, 255)])
    expect(v.ok).toBe(true)
    expect(v.offBy).toBe(0)
    expect(v.message).toBeNull()
  })

  it("refuses Brooklyn's old cream, which is what this exists to catch", () => {
    const v = whiteGroundVerdict([px(255, 255, 255), px(245, 240, 232)])
    expect(v.ok).toBe(false)
    expect(v.offBy).toBe(23)
    expect(v.worst).toEqual(px(245, 240, 232))
    expect(v.message).toContain('245,240,232')
  })

  it('allows export noise and nothing more', () => {
    expect(whiteGroundVerdict([px(255, 255, 255 - WHITE_GROUND_TOLERANCE)]).ok).toBe(true)
    expect(whiteGroundVerdict([px(255, 255, 255 - WHITE_GROUND_TOLERANCE - 1)]).ok).toBe(false)
  })

  it('reports the worst pixel, not the average, so one dark rule cannot hide in a white field', () => {
    const ring = [px(255, 255, 255), px(255, 255, 255), px(255, 255, 255), px(12, 12, 12)]
    const v = whiteGroundVerdict(ring)
    expect(v.ok).toBe(false)
    expect(v.worst).toEqual(px(12, 12, 12))
  })

  it('refuses an empty sample rather than reading silence as white', () => {
    const v = whiteGroundVerdict([])
    expect(v.ok).toBe(false)
    expect(v.message).toContain('never checked')
  })
})
