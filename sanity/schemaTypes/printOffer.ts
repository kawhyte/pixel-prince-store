import { defineType, defineField, defineArrayMember } from 'sanity'
import { ShoppingBag } from 'lucide-react'
import { SHOP_SIZE_LADDER, DEFAULT_PRICE_CENTS } from '@/config/commerce'

interface SizeRow {
  sizeId?: string
  priceCents?: number
  providerVariantId?: string
  popular?: boolean
}

interface OfferValue {
  provider?: string
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
              description: 'The Fourthwall variant id for this size.',
              validation: (Rule) => Rule.required(),
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
    select: { provider: 'provider', active: 'active', sizes: 'sizes', checkoutUrl: 'checkoutUrl' },
    prepare({ provider, active, sizes, checkoutUrl }) {
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
        title: `${provider ?? 'offer'}${active === false ? ' (inactive)' : ''}`,
        subtitle: `${from} · ${rows.length} size${rows.length === 1 ? '' : 's'}`,
      }
    },
  },
})
