import type { ImageValue, ValidationContext } from 'sanity'

/**
 * Shop photos are shown about 1280 device pixels wide on a 2x screen, so anything under this
 * upscales and looks soft. Kenny's first uploads were 794 and 1140 px wide, which is exactly
 * the mistake this catches at the moment of upload rather than on the live page.
 */
export const MIN_SHOP_IMAGE_WIDTH = 1600

export const SHOP_IMAGE_HINT = `At least ${MIN_SHOP_IMAGE_WIDTH} px wide, portrait 4:5. Smaller files look soft on the shop page.`

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
      return `This image is ${width} px wide. The shop shows it about 1280 px across, so it will look soft. Use one at least ${min} px wide.`
    } catch {
      return true
    }
  }
}
