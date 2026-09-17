import { describe, it, expect } from 'vitest'
import { RATIO_FAMILIES, SHOP_SIZE_LADDER, familyForSize, ratioFromTag, ratioTag } from '@/config/commerce'
import { detectRatio, productName, ratioTagFromFilename, sizeNameForId, sizeNamesFor, titleFromFilename } from '@/lib/fourthwall-platform'

// Fourthwall fits artwork to the sheet instead of cropping, so a master whose shape does not match
// the paper prints with blank paper on two edges. Invisible on white artwork; every live master has
// a coloured ground, so it shows. One master per ratio is the only way to reach the edge, because a
// product takes exactly one image.
describe('ratio families', () => {
  it('cover every size on the ladder exactly once', () => {
    const covered = RATIO_FAMILIES.flatMap((f) => f.sizeIds).sort()
    expect(covered).toEqual(SHOP_SIZE_LADDER.map((s) => s.id).sort())
    expect(new Set(covered).size).toBe(covered.length)
  })

  it('name the size that sets each master minimum', () => {
    expect(RATIO_FAMILIES.find((f) => f.ratio === '4:5')!.largest.id).toBe('16x20')
    expect(RATIO_FAMILIES.find((f) => f.ratio === '2:3')!.largest.id).toBe('24x36')
  })

  it('round-trip a tag', () => {
    for (const f of RATIO_FAMILIES) expect(ratioFromTag(ratioTag(f.ratio))).toBe(f.ratio)
    expect(ratioFromTag('9x16')).toBeNull()
  })

  it('find the family a size belongs to', () => {
    expect(familyForSize('18x24')!.ratio).toBe('3:4')
    expect(familyForSize('20x30')).toBeNull() // dropped from the ladder 2026-09-17
  })
})

describe('master file names', () => {
  it('carry a ratio tag that does not become part of the title', () => {
    expect(titleFromFilename('World Map with Flags [3x4].png')).toBe('World Map with Flags')
    expect(ratioTagFromFilename('World Map with Flags [3x4].png')).toBe('3x4')
  })

  it('still work with no tag at all, so older masters keep importing', () => {
    expect(titleFromFilename('Retro Consoles (Beige).png')).toBe('Retro Consoles (Beige)')
    expect(ratioTagFromFilename('Retro Consoles (Beige).png')).toBeNull()
  })

  it('keep the version, which is not a ratio', () => {
    expect(titleFromFilename('Brooklyn Neighborhood Map (Earth) [2x3].png')).toBe('Brooklyn Neighborhood Map (Earth)')
  })
})

describe('detectRatio reads the pixels, not the name', () => {
  const dims = (w: number, h: number) => ({ width: w, height: h, contentType: 'image/png' as const })

  it('recognises each family, portrait or landscape', () => {
    expect(detectRatio(dims(4800, 6000))).toBe('4:5')
    expect(detectRatio(dims(6000, 4800))).toBe('4:5')
    expect(detectRatio(dims(5400, 7200))).toBe('3:4')
    expect(detectRatio(dims(7200, 10800))).toBe('2:3')
    expect(detectRatio(dims(3300, 4200))).toBe('11:14')
  })

  it('refuses a shape that is not on the ladder', () => {
    expect(detectRatio(dims(1000, 1000))).toBeNull()   // square
    expect(detectRatio(dims(1000, 1900))).toBeNull()   // nothing near it
  })

  it('catches a file saved under the wrong tag', () => {
    // named [4x5], actually 2:3 -- the mistake would otherwise only show up on printed paper
    const actual = detectRatio(dims(7200, 10800))
    expect(actual).not.toBe(ratioFromTag('4x5'))
  })
})

describe('a product carries only its own ratio’s sizes', () => {
  it('splits the ladder across products', () => {
    expect(sizeNamesFor('4:5', 'poster')).toEqual(['8" x 10"', '16" x 20"'])
    expect(sizeNamesFor('3:4', 'poster')).toEqual(['18" x 24"'])
    expect(sizeNamesFor('2:3', 'poster')).toEqual(['24" x 36"'])
    expect(sizeNamesFor('11:14', 'poster')).toEqual(['11" x 14"'])
  })

  it('gives framed the same coverage, so every size offers every finish', () => {
    for (const f of RATIO_FAMILIES) {
      expect(sizeNamesFor(f.ratio, 'framed')).toEqual(sizeNamesFor(f.ratio, 'poster'))
    }
  })

  it('builds the exact strings the templates expect', () => {
    expect(sizeNameForId('24x36')).toBe('24" x 36"')
  })
})

describe('product names carry the ratio, except the default', () => {
  it('leaves 4:5 bare so products made before 2026-09-17 still match', () => {
    // Every existing product is named this way with a 4:5 master behind it. Tagging 4:5 now would
    // orphan all of them and the importer would build a second artwork for each.
    expect(productName('Retro Consoles (Beige)', 'poster')).toBe('Retro Consoles (Beige)')
    expect(productName('Retro Consoles (Beige)', 'framed')).toBe('Retro Consoles (Beige) | Framed')
    expect(productName('Retro Consoles (Beige)', 'poster', '4:5')).toBe('Retro Consoles (Beige)')
  })

  it('tags the others, before the finish suffix', () => {
    expect(productName('Retro Consoles (Beige)', 'poster', '2:3')).toBe('Retro Consoles (Beige) [2x3]')
    expect(productName('Retro Consoles (Beige)', 'framed', '2:3')).toBe('Retro Consoles (Beige) [2x3] | Framed')
    expect(productName('Sweden Map', 'framed', '3:4')).toBe('Sweden Map [3x4] | Framed')
  })

  it('every ratio and finish produces a distinct name', () => {
    const names = new Set<string>()
    for (const f of RATIO_FAMILIES) for (const fin of ['poster', 'framed'] as const) names.add(productName('X', fin, f.ratio))
    expect(names.size).toBe(RATIO_FAMILIES.length * 2)
  })
})
