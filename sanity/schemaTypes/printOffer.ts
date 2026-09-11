import { defineType, defineField, defineArrayMember } from 'sanity'
import { ShoppingBag } from 'lucide-react'
import { SHOP_SIZE_LADDER, DEFAULT_PRICE_CENTS, FINISHES, DEFAULT_FINISH } from '@/config/commerce'
import { minImageWidth, SHOP_IMAGE_HINT } from '../lib/image-rules'
import { ImageWithDetails } from '../components/ImageWithDetails'

interface SizeRow {
  sizeId?: string
  priceCents?: number
  providerVariantId?: string
  popular?: boolean
}

interface OfferValue {
  provider?: string
  finish?: string
  version?: string
  active?: boolean
  providerProductId?: string
  checkoutUrl?: string
  sizes?: SizeRow[]
}

export const printOffer = defineType({
  name: 'printOffer',
  title: 'Print offer',
  type: 'object',
  icon: ShoppingBag,
  fields: [
    defineField({
      name: 'provider',
      title: 'Where it is sold',
      type: 'string',
      options: {
        list: [
          { title: 'Fourthwall (on-site checkout)', value: 'fourthwall' },
          { title: 'Etsy (legacy outbound link)', value: 'etsy' },
          { title: 'Stripe (Phase 2, not live)', value: 'stripe' },
        ],
        layout: 'radio',
      },
      initialValue: 'fourthwall',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'finish',
      title: 'Finish',
      type: 'string',
      description: 'Each finish is its own Fourthwall product. One offer per version and finish.',
      options: { list: FINISHES.map((f) => ({ title: f.label, value: f.id })), layout: 'radio' },
      initialValue: DEFAULT_FINISH,
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'version',
      title: 'Version',
      type: 'string',
      description:
        'Which version of the artwork this offer sells, e.g. Ivory or Midnight. Leave empty when the print comes one way only. The import fills it from the Fourthwall name "Title (Version)".',
    }),
    defineField({
      name: 'art',
      title: 'Flat artwork (the art on its own, no room, no frame)',
      type: 'image',
      description:
        'Shown on the version tiles, where the art is what is being compared. It is also the stand-in ' +
        'at the top of the print page for an offer with no Main photo yet, so a new listing is never blank. ' +
        'Filled by npm run shop:art from the masters folder, so you rarely touch it. ' +
        SHOP_IMAGE_HINT,
      options: { hotspot: true },
      components: { input: ImageWithDetails },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'What the photo shows, for screen readers and for search. A warning rather than a hard stop: the page falls back to a line built from the title, version and finish when this is empty.',
          validation: (Rule) => Rule.warning().required(),
        }),
      ],
      validation: (Rule) => Rule.warning().custom(minImageWidth()),
    }),
    defineField({
      name: 'mockup',
      title: 'Main photo (this version and finish only)',
      type: 'image',
      description:
        'The big image at the top of the print page when a buyer picks this exact version and finish, and the picture on its finish tile. This is the one to put a room photo in, for framed and unframed alike. Each row in this list has its own, so changing it here changes one combination and nothing else. ' +
        'Not the grid card: that is Preview Image on the Images tab. ' +
        SHOP_IMAGE_HINT,
      options: { hotspot: true },
      components: { input: ImageWithDetails },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'What the photo shows, for screen readers and for search. A warning rather than a hard stop: the page falls back to a line built from the title, version and finish when this is empty.',
          validation: (Rule) => Rule.warning().required(),
        }),
      ],
      validation: (Rule) => Rule.warning().custom(minImageWidth()),
    }),
    defineField({
      name: 'gallery',
      title: 'Extra photos for this version',
      type: 'array',
      description:
        'Photos of this colorway specifically, shown after the main image and before the Room photos that the whole print shares. Leave it empty and this version simply falls back: the other finish of the same version lends its photos, so one set per colorway is enough. Use Room photos on the Images tab for anything true of every colorway. ' +
        SHOP_IMAGE_HINT,
      of: [
        defineArrayMember({
          type: 'image',
          options: { hotspot: true },
          components: { input: ImageWithDetails },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              description:
                'What the photo shows. A warning rather than a blocker: leave it and the page falls back to a line built from the title, version and finish.',
              validation: (Rule) => Rule.warning().required(),
            }),
          ],
          validation: (Rule) => Rule.warning().custom(minImageWidth()),
        }),
      ],
      validation: (Rule) => Rule.max(8),
    }),
    defineField({
      name: 'active',
      title: 'Active',
      type: 'boolean',
      description: 'Turn off to hide the buy button without deleting the offer.',
      initialValue: true,
    }),
    defineField({
      name: 'providerProductId',
      title: 'Provider product id',
      type: 'string',
      description:
        'Fourthwall: the product id from the Fourthwall dashboard (Products > the product > id in the URL). Etsy: the listing id (optional).',
      hidden: ({ parent }) => (parent as OfferValue | undefined)?.provider === 'etsy',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const parent = context.parent as OfferValue | undefined
          if (parent?.provider !== 'etsy' && !value) return 'Required for on-site checkout.'
          return true
        }),
    }),
    defineField({
      name: 'checkoutUrl',
      title: 'Checkout URL',
      type: 'url',
      description:
        'Etsy: the listing URL (required). Fourthwall: the product page URL on the Fourthwall shop, used only as a no-JS fallback (the buy button builds its own /cart/checkout link from variant ids).',
      validation: (Rule) =>
        Rule.uri({ scheme: ['https'] }).custom((value, context) => {
          const parent = context.parent as OfferValue | undefined
          if (parent?.provider === 'etsy' && !value) return 'Etsy offers need the listing URL.'
          return true
        }),
    }),
    defineField({
      name: 'sizes',
      title: 'Sizes and prices',
      type: 'array',
      description:
        'One row per size. Price is the display price; the provider charges its own price, keep them equal.',
      hidden: ({ parent }) => (parent as OfferValue | undefined)?.provider === 'etsy',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'shopSize',
          fields: [
            defineField({
              name: 'sizeId',
              title: 'Size',
              type: 'string',
              options: {
                list: SHOP_SIZE_LADDER.map((s) => ({ title: `${s.label} (${s.cm})`, value: s.id })),
              },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'priceCents',
              title: 'Price (cents)',
              type: 'number',
              description: '2399 = $23.99',
              initialValue: DEFAULT_PRICE_CENTS['8x10'],
              validation: (Rule) => Rule.required().integer().min(100),
            }),
            defineField({
              name: 'providerVariantId',
              title: 'Provider variant id',
              type: 'string',
              description: 'The Fourthwall variant id for this size (a UUID, not the product id).',
              validation: (Rule) =>
                Rule.required().custom((value) => {
                  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
                  if (typeof value === 'string' && !uuid.test(value))
                    return {
                      message: 'Fourthwall variant ids look like 11111111-2222-3333-4444-555555555555. Check you copied the variant id, not the product id.',
                      level: 'warning',
                    }
                  return true
                }),
            }),
            defineField({
              name: 'popular',
              title: 'Mark as Popular',
              type: 'boolean',
              initialValue: false,
            }),
          ],
          preview: {
            select: { sizeId: 'sizeId', priceCents: 'priceCents', popular: 'popular' },
            prepare({ sizeId, priceCents, popular }) {
              const size = SHOP_SIZE_LADDER.find((s) => s.id === sizeId)
              const price =
                typeof priceCents === 'number' ? `$${(priceCents / 100).toFixed(2)}` : 'no price'
              return {
                title: `${size?.label ?? sizeId ?? '?'} · ${price}`,
                subtitle: popular ? 'Popular' : undefined,
              }
            },
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((rows, context) => {
          const parent = context.parent as OfferValue | undefined
          const list = (rows as SizeRow[] | undefined) ?? []
          if (parent?.provider === 'etsy') return true
          if (list.length === 0) return 'Add at least one size.'
          const ids = list.map((r) => r.sizeId)
          if (new Set(ids).size !== ids.length) return 'Each size can appear only once.'
          if (list.filter((r) => r.popular).length > 1) return 'Only one size can be Popular.'
          return true
        }),
    }),
  ],
  preview: {
    select: { provider: 'provider', finish: 'finish', version: 'version', active: 'active', sizes: 'sizes', checkoutUrl: 'checkoutUrl', media: 'mockup' },
    prepare({ provider, finish, version, active, sizes, checkoutUrl, media }) {
      const rows = (sizes as SizeRow[] | undefined) ?? []
      const prices = rows
        .map((r) => r.priceCents)
        .filter((p): p is number => typeof p === 'number')
      const from = prices.length
        ? `from $${(Math.min(...prices) / 100).toFixed(2)}`
        : checkoutUrl
          ? 'link only'
          : 'no sizes'
      return {
        title: `${version ? `${version} · ` : ''}${finish ?? 'unframed'}${active === false ? ' (inactive)' : ''} · ${provider ?? 'offer'}`,
        subtitle: `${from} · ${rows.length} size${rows.length === 1 ? '' : 's'}`,
        media,
      }
    },
  },
})
