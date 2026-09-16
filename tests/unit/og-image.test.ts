import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import seoConfig from '@/config/seo.json'

// The default social preview pointed at /og-image.jpg and /twitter-image.jpg, neither of which was
// ever added to public/. Both 404'd in production, so the shop, the free gallery and every
// collection shared as a bare link. Nothing in the build complained.
describe('social preview images', () => {
  const urls = [...seoConfig.openGraph.images.map((i) => i.url), ...seoConfig.twitter.images]

  it('every default image resolves to something that exists', () => {
    for (const url of urls) {
      if (/^https?:\/\//.test(url)) continue
      const isGeneratedRoute = existsSync(resolve(process.cwd(), `app${url}/route.tsx`))
      const isStaticFile = existsSync(resolve(process.cwd(), 'public', url.replace(/^\//, '')))
      expect(isGeneratedRoute || isStaticFile, `${url} is neither a route nor a file in public/`).toBe(true)
    }
  })

  it('the og route declares the size every platform expects', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/og/route.tsx'), 'utf8')
    expect(src).toContain('width: 1200')
    expect(src).toContain('height: 630')
  })

  it('the fallback fetches nothing, so it cannot fail the way the pages it covers can', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/og/route.tsx'), 'utf8')
    expect(src).not.toMatch(/\bfetch\(|getProductBySlug|getShopPrints/)
  })

  it('the homepage carries metadata rather than inheriting nothing', () => {
    const src = readFileSync(resolve(process.cwd(), 'app/page.tsx'), 'utf8')
    expect(src).toMatch(/export const metadata/)
  })
})
