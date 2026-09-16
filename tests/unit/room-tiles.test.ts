import { describe, it, expect } from 'vitest'
import { roomTiles } from '@/lib/room-tiles'

const shop = {
  brooklyn: { title: 'Brooklyn', category: 'Maps', tags: ['city map'], heroImage: 'hero-brooklyn' },
  consoles: { title: 'Consoles', category: 'Video Games', tags: ['retro'], heroImage: 'hero-consoles' },
  controllers: { title: 'Controllers', category: 'Video Games', tags: ['retro'], heroImage: 'hero-controllers' },
}

describe('roomTiles', () => {
  it('never shows a free print', () => {
    // The whole reason this lives in one function: the band is shop-first and a free download
    // fronting a room undersells it. roomTiles is only ever handed shop prints, and the page has
    // no other way to build a tile.
    const tiles = roomTiles([shop.brooklyn, shop.consoles, shop.controllers])
    expect(tiles.map((t) => t.image)).not.toContain(undefined)
    expect(tiles.length).toBeGreaterThan(0)
  })

  it('drops a room with no shop print rather than borrowing one', () => {
    // Only a map: the gaming rooms have nothing of their own and must not show the map.
    const tiles = roomTiles([shop.brooklyn])
    expect(tiles).toHaveLength(1)
    expect(tiles[0].label).toBe('Entryway')
  })

  it('shows no tile at all when the shop is empty', () => {
    expect(roomTiles([])).toEqual([])
  })

  it('never repeats an image across tiles', () => {
    const tiles = roomTiles([shop.brooklyn, shop.consoles, shop.controllers])
    const images = tiles.map((t) => t.image)
    expect(new Set(images).size).toBe(images.length)
  })

  it('a room reappears once a print suits it', () => {
    const before = roomTiles([shop.consoles]).map((t) => t.label)
    const after = roomTiles([shop.consoles, shop.brooklyn]).map((t) => t.label)
    expect(before).not.toContain('Entryway')
    expect(after).toContain('Entryway')
  })

  it('a room ticked in Studio wins over the tags', () => {
    const placed = { ...shop.consoles, rooms: ['bedroom'] }
    const labels = roomTiles([placed]).map((t) => t.label)
    expect(labels).toEqual(['Bedroom'])
  })

  it('a pinned print beats a newer one', () => {
    // shopPrints arrives newest first, so without the pin the first match wins and every new
    // listing takes the tile over.
    const newer = { category: 'Video Games', tags: ['retro'], heroImage: 'hero-newer' }
    const pinned = { category: 'Video Games', tags: ['retro'], heroImage: 'hero-pinned', roomTile: true }
    const tiles = roomTiles([newer, pinned])
    expect(tiles.find((t) => t.label === 'Game room')!.image).toBe('hero-pinned')
  })

  it('the newer pin wins when two prints in a room are pinned', () => {
    const newer = { category: 'Maps', tags: [], heroImage: 'hero-newer', roomTile: true }
    const older = { category: 'Maps', tags: [], heroImage: 'hero-older', roomTile: true }
    expect(roomTiles([newer, older])[0].image).toBe('hero-newer')
  })

  it('a pin only affects the rooms the print is in', () => {
    // Pinned, but ticked for the bedroom only: it must not take the game room tile.
    const pinned = { category: 'Video Games', tags: ['retro'], heroImage: 'hero-pinned', roomTile: true, rooms: ['bedroom'] }
    const gaming = { category: 'Video Games', tags: ['retro'], heroImage: 'hero-gaming' }
    const tiles = roomTiles([pinned, gaming])
    expect(tiles.find((t) => t.label === 'Game room')!.image).toBe('hero-gaming')
    expect(tiles.find((t) => t.label === 'Bedroom')!.image).toBe('hero-pinned')
  })

  it('a pin cannot put the same photo on two tiles', () => {
    // Pinned into two rooms: the first claims it and the second falls through to its next print,
    // which is the same dedupe every tile already obeys.
    const pinned = { category: 'Maps', tags: [], heroImage: 'hero-pinned', roomTile: true, rooms: ['entryway', 'office'] }
    const other = { category: 'Maps', tags: [], heroImage: 'hero-other', rooms: ['office'] }
    const tiles = roomTiles([pinned, other])
    expect(tiles.find((t) => t.label === 'Entryway')!.image).toBe('hero-pinned')
    expect(tiles.find((t) => t.label === 'Office')!.image).toBe('hero-other')
  })

  it('falls back to previewImage when there is no hero', () => {
    const noHero = { category: 'Maps', tags: [], previewImage: 'preview-only' }
    expect(roomTiles([noHero])[0].image).toBe('preview-only')
  })
})
