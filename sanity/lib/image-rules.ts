import type { ImageValue, ValidationContext } from 'sanity'
import {
  SHOP_IMAGE_WIDTH,
  SHOP_IMAGE_HEIGHT,
  heroFrame,
  heroShortfall,
} from '../../config/shop-image'

/**
 * The Etsy mockup originals are 3000 x 2250 (4:3) and reusing them here rather than remaking every
 * image is the point (2026-09-10, full-size since 2026-10-02). What "big enough" means depends on the photo's shape, because the print
 * page cuts its frame to that shape: see config/shop-image.ts. A width-only rule used to flag a
 * 1024 x 1536 room photo that was in fact sharp, so the check now asks the same question the
 * layout does.
 */
export const MIN_SHOP_IMAGE_WIDTH = SHOP_IMAGE_WIDTH

export const IDEAL_SHOP_IMAGE_WIDTH = SHOP_IMAGE_WIDTH

export const SHOP_IMAGE_HINT = `Upload the full-size ${SHOP_IMAGE_WIDTH} x ${SHOP_IMAGE_HEIGHT} original from the MOCKUPS _hq folder, not Etsy's copy or a shrunk export: the site makes the smaller versions itself. Other shapes are shown whole, never cropped. Studio will say so if a photo is too small.`

/**
 * Warns when an uploaded image is too small for the frame the print page will give it. The asset's
 * dimensions are not on the value (it holds a reference), so this asks the dataset for them.
 * Returns true when there is no image yet, or when the dimensions cannot be read, so it never
 * blocks on a hiccup.
 */
export function minImageWidth(min: number = SHOP_IMAGE_WIDTH) {
  return async (value: ImageValue | undefined, context: ValidationContext) => {
    const ref = value?.asset?._ref
    if (!ref) return true
    try {
      const client = context.getClient({ apiVersion: '2025-11-27' })
      const dimensions = await client.fetch<{ width?: number; height?: number } | null>(
        `*[_id == $id][0].metadata.dimensions{width, height}`,
        { id: ref }
      )
      const width = dimensions?.width
      const height = dimensions?.height
      if (typeof width !== 'number' || width <= 0) return true
      if (typeof height !== 'number' || height <= 0) {
        return width >= min ? true : `This image is ${width} px wide. The shop needs about ${min} px across, so it will look soft.`
      }
      const { needed, short } = heroShortfall({ width, height })
      if (!short) return true
      const frame = heroFrame(width / height)
      // For a 3:4 photo the two suggestions are the same sentence twice, so only offer the second
      // when keeping this shape actually asks for something different.
      const sameShape = needed.width === SHOP_IMAGE_WIDTH && needed.height === SHOP_IMAGE_HEIGHT
      return (
        `This image is ${width} x ${height} px. At that shape the page shows it ` +
        `${Math.round(frame.width)} x ${Math.round(frame.height)}, which needs ${needed.width} x ${needed.height} px ` +
        `to stay sharp on a 2x screen, so it is short on ${short}. ` +
        (sameShape
          ? `Use your ${SHOP_IMAGE_WIDTH} x ${SHOP_IMAGE_HEIGHT} export.`
          : `Use your ${SHOP_IMAGE_WIDTH} x ${SHOP_IMAGE_HEIGHT} export, or keep this shape and export it at ${needed.width} x ${needed.height}.`)
      )
    } catch {
      return true
    }
  }
}
