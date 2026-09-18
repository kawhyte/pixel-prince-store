import { describe, it, expect } from 'vitest'
import { mergeSizesByRatio, type RatioSource } from '@/lib/fourthwall-import'
import { FULL_LADDER, SHOP_SIZE_LADDER } from '@/config/commerce'

const row = (sizeId: string) => ({ _type: 'shopSize' as const, _key: sizeId, sizeId, priceCents: 1000, providerVariantId: `v-${sizeId}` })
const src = (ratio: string, product: string, ids: string[]): RatioSource<string> =>
  ({ ratio: ratio as never, product, sizes: ids.map(row) })

const ALL = SHOP_SIZE_LADDER.map((s) => s.id) // 8x10, 11x14, 16x20, 18x24, 24x36

describe('merging ratio products into one offer', () => {
  it('leaves a single legacy product completely alone', () => {
    // Every print live today is one 4:5 product covering the whole ladder. Claiming sizes by ratio
    // naively would strip three of them, which would be far worse than the seam it fixes.
    const got = mergeSizesByRatio([src('4:5', 'legacy', ALL)])
    expect(got.sizes.map((s) => s.sizeId)).toEqual(ALL)
    expect(got.letterboxed).toEqual(['11x14', '18x24', '24x36'])
    expect([...new Set(got.from.values())]).toEqual(['legacy'])
  })

  it('takes each size from the product whose ratio owns it', () => {
    const got = mergeSizesByRatio([
      src('4:5', 'p45', ['8x10', '16x20']),
      src('11:14', 'p1114', ['11x14']),
      src('3:4', 'p34', ['18x24']),
      src('2:3', 'p23', ['24x36']),
    ])
    expect(got.sizes.map((s) => s.sizeId)).toEqual(ALL)
    expect(got.letterboxed).toEqual([])
    expect(got.from.get('8x10')).toBe('p45')
    expect(got.from.get('24x36')).toBe('p23')
    expect(got.from.get('18x24')).toBe('p34')
  })

  it('prefers the owner even when a legacy product also offers the size', () => {
    // Part-migrated: the old 4:5 product still carries 24x36, the new [2x3] one carries it properly.
    const got = mergeSizesByRatio([src('4:5', 'legacy', ALL), src('2:3', 'p23', ['24x36'])])
    expect(got.from.get('24x36')).toBe('p23')
    expect(got.from.get('8x10')).toBe('legacy')
    expect(got.letterboxed).toEqual(['11x14', '18x24'])
    expect(got.sizes.map((s) => s.sizeId)).toEqual(ALL)
  })

  it('never drops a size just because its ratio is missing', () => {
    const got = mergeSizesByRatio([src('4:5', 'legacy', ALL), src('3:4', 'p34', ['18x24'])])
    expect(got.sizes).toHaveLength(ALL.length)
    expect(got.letterboxed).toEqual(['11x14', '24x36'])
  })

  it('returns sizes in ladder order whatever order Fourthwall gave them', () => {
    const got = mergeSizesByRatio([src('2:3', 'p23', ['24x36']), src('4:5', 'p45', ['16x20', '8x10'])])
    expect(got.sizes.map((s) => s.sizeId)).toEqual(['8x10', '16x20', '24x36'])
  })

  it('ignores a second product claiming the same ratio rather than double-counting', () => {
    const got = mergeSizesByRatio([src('2:3', 'first', ['24x36']), src('2:3', 'second', ['24x36'])])
    expect(got.sizes).toHaveLength(1)
    expect(got.from.get('24x36')).toBe('first')
  })

  it('is empty when nothing was given', () => {
    const got = mergeSizesByRatio<string>([])
    expect(got.sizes).toEqual([])
    expect(got.letterboxed).toEqual([])
  })

  it('carries the variant id through, because that is what checkout uses', () => {
    const got = mergeSizesByRatio([src('2:3', 'p23', ['24x36'])])
    expect(got.sizes[0].providerVariantId).toBe('v-24x36')
  })
})

// A white-ground master sells every size from one product. The blank paper it letterboxes with is
// the same white as the art, so none of it is a seam anyone can see, and none of it is reported.
describe('merging a [all] product', () => {
  it('covers the whole ladder on its own with nothing flagged', () => {
    const got = mergeSizesByRatio([src(FULL_LADDER, 'brooklyn', ALL)])
    expect(got.sizes.map((s) => s.sizeId)).toEqual(ALL)
    expect(got.letterboxed).toEqual([])
    expect([...new Set(got.from.values())]).toEqual(['brooklyn'])
  })

  it('gives a size up to a master cut for that paper, which puts art where it leaves margin', () => {
    const got = mergeSizesByRatio([src(FULL_LADDER, 'brooklyn', ALL), src('2:3', 'p23', ['24x36'])])
    expect(got.from.get('24x36')).toBe('p23')
    expect(got.from.get('8x10')).toBe('brooklyn')
    expect(got.letterboxed).toEqual([])
    expect(got.sizes.map((s) => s.sizeId)).toEqual(ALL)
  })

  it('fills the gaps a part-built ratio set leaves, still without flagging them', () => {
    const got = mergeSizesByRatio([src('4:5', 'p45', ['8x10', '16x20']), src(FULL_LADDER, 'brooklyn', ALL)])
    expect(got.from.get('8x10')).toBe('p45')
    expect(got.from.get('11x14')).toBe('brooklyn')
    expect(got.from.get('24x36')).toBe('brooklyn')
    expect(got.letterboxed).toEqual([])
  })

  it('still beats a legacy 4:5 product for the sizes that product only letterboxes', () => {
    // the old bare-named product carries all five off a 4:5 master; the [all] one is on white
    const got = mergeSizesByRatio([src('4:5', 'legacy', ALL), src(FULL_LADDER, 'brooklyn', ALL)])
    expect(got.from.get('8x10')).toBe('legacy')   // 4:5 owns its own family
    expect(got.from.get('24x36')).toBe('brooklyn')
    expect(got.from.get('18x24')).toBe('brooklyn')
    expect(got.letterboxed).toEqual([])
  })
})
