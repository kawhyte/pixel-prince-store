import type { ImageValue, ValidationContext } from 'sanity'

/**
 * Shop photos are shown about 1280 device pixels wide on a 2x screen, so anything under this
 * upscales and looks soft. Kenny's first uploads were 794 and 1140 px wide, which is exactly
 * the mistake this catches at the moment of upload rather than on the live page.
 */
/**
 * Kenny's Etsy exports are 1140 x 1520, and reusing them here rather than remaking every image
 * is the point (2026-09-10). The shop page is laid out so a 1140 px file is never stretched by
 * more than a few percent, so that is the bar rather than an arbitrary bigger number.
 */
export const MIN_SHOP_IMAGE_WIDTH = 1140

export const IDEAL_SHOP_IMAGE_WIDTH = 1140

export const SHOP_IMAGE_HINT = `1140 x 1520 works, the same as your Etsy images. Below ${MIN_SHOP_IMAGE_WIDTH} px wide it starts to look soft and Studio will say so.`

/**
 * Warns when an uploaded image is narrower than `min`. The asset's dimensions are not on the
 * value (it holds a reference), so this asks the dataset for them. Returns true when there is
 * no image yet, or when the dimensions cannot be read, so it never blocks on a hiccup.
 */
export function minImageWidth(min: number = MIN_SHOP_IMAGE_WIDTH) {
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
      if (typeof width !== 'number' || width <= 0) return true
      if (width >= min) return true
      return `This image is ${width} px wide. The shop needs about ${MIN_SHOP_IMAGE_WIDTH} px across, so it will look soft. Use your ${IDEAL_SHOP_IMAGE_WIDTH} x 1520 export.`
    } catch {
      return true
    }
  }
}
