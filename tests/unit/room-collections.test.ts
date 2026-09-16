import { describe, it, expect } from 'vitest'
import { COLLECTIONS, matchProductsToCollection } from '@/config/collections'

// The homepage "Find your wall" band is built from COLLECTIONS.filter(c => c.room) and promises
// the visitor a room. A room tile that lands on an empty page is worse than no tile, so the rules
// that keep it honest live here rather than in a comment.
describe('room collections', () => {
  const rooms = COLLECTIONS.filter((c) => c.room)

  it('there are rooms to show', () => {
    expect(rooms.length).toBeGreaterThan(1)
  })

  it('every room names a distinct room', () => {
    const labels = rooms.map((r) => r.room)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('no room matches the whole catalogue', () => {
    // matchTags: [] means "everything" in matchProductsToCollection. That is right for the
    // printable-wall-art catch-all and wrong for a room, which would then claim every print.
    for (const room of rooms) {
      expect(room.matchTags.length, `${room.slug} has no matchTags`).toBeGreaterThan(0)
    }
  })

  it('each room actually selects prints', () => {
    // Stand-ins for the live catalogue: if a room's matchTags stop matching anything here, its
    // tile would vanish from the homepage without any other test noticing.
    const catalogue = [
      { category: 'Video Games', tags: ['retro', 'controllers'] },
      { category: 'Maps', tags: ['city map', 'brooklyn'] },
      { category: 'Quotes', tags: [] },
      { category: 'Minimalist', tags: [] },
    ]
    for (const room of rooms) {
      expect(matchProductsToCollection(catalogue, room).length, `${room.slug} matches nothing`).toBeGreaterThan(0)
    }
  })

  it('a theme collection stays out of the band but keeps its page', () => {
    const themed = COLLECTIONS.filter((c) => !c.room).map((c) => c.slug)
    expect(themed).toContain('printable-wall-art')
    expect(themed).toContain('map-prints')
  })
})
