import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { shouldReplaceGallery, pickGalleryImages } from '@/lib/fourthwall-import'

const SRC = readFileSync(resolve(process.cwd(), 'scripts/import-fourthwall-products.ts'), 'utf8')

// Kenny shoots his own room photos and deletes Fourthwall's. Importing three renders per artwork
// only ever cost Sanity storage, so they are opt-in. The per-offer mockup still comes over: an
// offer with no photo falls back to the flat artwork, but a brand new listing would arrive blank.
describe('Fourthwall room photos are opt-in', () => {
  it('the gallery is only built when --photos is passed', () => {
    expect(SRC).toMatch(/const wantPhotos = process\.argv\.includes\("--photos"\)/)
    expect(SRC).toMatch(/wantPhotos \? await uploadGallery\(primary\) : \[\]/)
  })

  it('--reset-images alone does not pull them back', () => {
    expect(SRC).toMatch(/wantPhotos && shouldReplaceGallery\(/)
  })

  it('one mockup per offer is still imported', () => {
    // uploadFirstImage is what fills printOffer.mockup and the artwork's previewImage.
    expect(SRC).toMatch(/uploadFirstImage\(/)
  })

  it('shouldReplaceGallery itself is unchanged: it still needs a reset and something to replace with', () => {
    expect(shouldReplaceGallery({ resetImages: true, incomingPhotos: 3 })).toBe(true)
    expect(shouldReplaceGallery({ resetImages: false, incomingPhotos: 3 })).toBe(false)
    expect(shouldReplaceGallery({ resetImages: true, incomingPhotos: 0 })).toBe(false)
  })

  it('pickGalleryImages still caps at three and skips the main image', () => {
    const p = { images: [{ id: 'a', url: 'a' }, { id: 'b', url: 'b' }, { id: 'c', url: 'c' }, { id: 'd', url: 'd' }, { id: 'e', url: 'e' }] }
    const got = pickGalleryImages(p as never)
    expect(got).toHaveLength(3)
    expect(got.map((i) => i.id)).toEqual(['b', 'c', 'd'])
  })
})
