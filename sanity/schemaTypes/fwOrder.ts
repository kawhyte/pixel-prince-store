import { defineType, defineField } from 'sanity'
import { Receipt } from 'lucide-react'

/**
 * One document per Fourthwall order received by /api/webhooks/fourthwall (PLAN-38).
 * Exists for idempotency (the webhook may retry) and a light order log. Fourthwall
 * remains the system of record; nothing here is edited by hand.
 */
export const fwOrder = defineType({
  name: 'fwOrder',
  title: 'Shop order',
  type: 'document',
  icon: Receipt,
  readOnly: true,
  fields: [
    defineField({ name: 'orderId', title: 'Fourthwall order id', type: 'string', validation: (r) => r.required() }),
    defineField({ name: 'friendlyId', title: 'Order number', type: 'string' }),
    defineField({ name: 'email', title: 'Buyer email', type: 'string' }),
    defineField({ name: 'totalCents', title: 'Total (cents)', type: 'number' }),
    defineField({ name: 'currency', title: 'Currency', type: 'string' }),
    defineField({ name: 'variantIds', title: 'Variant ids', type: 'array', of: [{ type: 'string' }] }),
    defineField({ name: 'artworks', title: 'Artworks', type: 'array', of: [{ type: 'reference', to: [{ type: 'product' }] }] }),
    defineField({ name: 'receivedAt', title: 'Received at', type: 'datetime' }),
  ],
  preview: {
    select: { title: 'friendlyId', subtitle: 'email', orderId: 'orderId' },
    prepare({ title, subtitle, orderId }) {
      return { title: title || orderId, subtitle }
    },
  },
})
