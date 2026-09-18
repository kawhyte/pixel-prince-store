import { defineType, defineField, defineArrayMember, type ImageValue } from 'sanity'
import { Gift } from 'lucide-react'
import { GeminiGenerator } from '../components/GeminiGenerator'
import { HighResAssetInput } from '../components/HighResAssetInput'
import { DefaultVersionInput } from '../components/DefaultVersionInput'
import { deriveRatio } from '@/config/print-sizes'
import { FINISHES } from '@/config/commerce'
import { ROOMS } from '@/config/collections'
import { minImageWidth, SHOP_IMAGE_HINT } from '../lib/image-rules'
import { ImageWithDetails } from '../components/ImageWithDetails'

const isShop = (doc: unknown) => (doc as { listing?: string } | undefined)?.listing === 'shop'

export const product = defineType({
  name: 'product',
  title: 'Artwork',
  type: 'document',
  icon: Gift,
  groups: [
    { name: 'artwork', title: '① Details', default: true },
    { name: 'images', title: '② Images' },
    { name: 'file', title: '③ Print File' },
    { name: 'shop', title: '④ Shop' },
    { name: 'stats', title: '⑤ Stats' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: "The artwork's name — shown everywhere on the site.",
      group: 'artwork',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      description: 'The web address for this piece (thepixelprince.com/art/…). Click "Generate" — done.',
      group: 'artwork',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'listing',
      title: 'Listing',
      type: 'string',
      description: 'Free print: visitors download it, never sold. Shop print: sold as a physical print, never downloadable. A print is one or the other.',
      group: 'artwork',
      options: {
        list: [
          { title: 'Free print (download)', value: 'free' },
          { title: 'Shop print (for sale)', value: 'shop' },
        ],
        layout: 'radio',
      },
      initialValue: 'free',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'artist',
      title: 'Artist',
      type: 'string',
      description: 'Leave as "The Pixel Prince" unless it\'s a collab.',
      group: 'artwork',
      initialValue: 'The Pixel Prince',
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'kind',
      title: 'Kind',
      type: 'string',
      description: 'Single print, or a set sold together (sets are their own artwork entry).',
      group: 'artwork',
      options: {
        list: [
          { title: 'Single print', value: 'single' },
          { title: 'Set', value: 'set' },
        ],
        layout: 'radio',
      },
      initialValue: 'single',
    }),
    defineField({
      name: 'members',
      title: 'Prints in this set',
      type: 'array',
      group: 'shop',
      description:
        'The prints sold together here, in the order they should read. Each one keeps its own page and stays on sale by itself. Two to four. The set offers only the sizes and finishes every member has, so a print that is not sold framed makes the whole set unframed only.',
      hidden: ({ parent }) => (parent as { kind?: string } | undefined)?.kind !== 'set',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'setMember',
          fields: [
            defineField({
              name: 'print',
              title: 'Print',
              type: 'reference',
              to: [{ type: 'product' }],
              // A set never contains a set: nothing downstream is written to unwrap one.
              options: { filter: 'listing == "shop" && kind != "set"' },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: 'version',
              title: 'Which version',
              type: 'string',
              description:
                'Leave empty to use whichever the print itself opens on. Only matters for a print sold in more than one colorway.',
            }),
          ],
          preview: {
            select: { title: 'print.title', subtitle: 'version' },
            prepare: ({ title, subtitle }) => ({ title: title ?? 'Pick a print', subtitle: subtitle || undefined }),
          },
        }),
      ],
      validation: (Rule) =>
        Rule.custom((members, context) => {
          if ((context.document as { kind?: string } | undefined)?.kind !== 'set') return true
          const count = (members as unknown[] | undefined)?.length ?? 0
          return count >= 2 && count <= 4 ? true : 'A set holds two to four prints.'
        }),
    }),
    defineField({
      name: 'aiHelper',
      title: 'AI Description Generator',
      type: 'string',
      description: 'Generate descriptions using AI',
      group: 'artwork',
      components: {
        input: GeminiGenerator,
      },
    }),
    defineField({
      name: 'description',
      title: 'Short Description',
      type: 'text',
      description: 'One or two sentences shown on the gallery card. The AI button above can write this for you.',
      group: 'artwork',
      rows: 3,
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'longDescription',
      title: 'Long Description',
      type: 'text',
      description: 'The fuller story shown on the artwork page. Optional.',
      group: 'artwork',
      rows: 5,
    }),
    defineField({
      name: 'previewImage',
      title: 'Card image (the grid, search, related prints)',
      type: 'image',
      components: { input: ImageWithDetails },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'What the picture shows, for screen readers and for search. This matters more here than on most sites: Sanity serves images from a content hash, so the file name tells a crawler nothing and the alt text is the only description it gets.',
          validation: (Rule) => Rule.warning().required(),
        }),
      ],
      description:
        'The one picture that represents this print everywhere it appears in a list. Not the big image on its own page: that lives on each offer under Shop, as Main photo. ' +
        SHOP_IMAGE_HINT,
      group: 'images',
      options: {
        hotspot: true,
      },
      validation: (Rule) => [
        Rule.warning().custom(minImageWidth()),
        Rule.required()
          .custom((image: ImageValue | undefined) => {
            // Validate aspect ratio - warn if unusual
            const dimensions = (image?.asset as { metadata?: { dimensions?: { width: number; height: number } } } | undefined)?.metadata?.dimensions;
            if (dimensions) {
              const { width, height } = dimensions;
              const aspectRatio = width / height;

              // Check for standard aspect ratios (with tolerance)
              const isPortrait = aspectRatio >= 0.70 && aspectRatio <= 0.85; // ~3:4
              const isLandscape = aspectRatio >= 1.25 && aspectRatio <= 1.40; // ~4:3
              const isSquare = aspectRatio >= 0.95 && aspectRatio <= 1.05; // ~1:1

              if (!isPortrait && !isLandscape && !isSquare) {
                return {
                  message: `⚠️ Unusual aspect ratio detected (${aspectRatio.toFixed(2)}). Consider using portrait (3:4), landscape (4:3), or square (1:1) for best card display.`,
                  level: 'warning',
                };
              }
            }
            return true;
          }),
      ],
    }),
    defineField({
      name: 'detailImage',
      title: 'Main Image',
      type: 'image',
      components: { input: ImageWithDetails },
      description: 'The artwork itself, large (1200×1600) — shown as the first/main image on the art page. This is the art, not a room shot. Optional — the preview image is reused if empty.',
      group: 'images',
      options: {
        hotspot: true,
      },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          description:
            'What the picture shows, for screen readers and for search. This matters more here than on most sites: Sanity serves images from a content hash, so the file name tells a crawler nothing and the alt text is the only description it gets.',
          validation: (Rule) => Rule.warning().required(),
        }),
      ],
    }),
    defineField({
      name: 'galleryImages',
      title: 'Room photos (shared by every version and finish)',
      description:
        'Context shots that follow the main image in the carousel, and the first three fill the In the room section. These belong to the whole print, so they show whichever version and finish a buyer has picked. Up to 10, the same as Etsy. Drag to reorder. ' + SHOP_IMAGE_HINT,
      type: 'array',
      group: 'images',
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
                'What the photo shows, for screen readers and for search. A warning rather than a blocker: leave it and the page falls back to the artwork title.',
              validation: (rule) => rule.warning().required(),
            }),
          ],
          validation: (rule) => rule.warning().custom(minImageWidth()),
        }),
      ],
      validation: (rule) => rule.max(10),
    }),
    defineField({
      name: 'artFile',
      title: 'Print File',
      type: 'object',
      description: 'Upload ONE high-res PNG cropped to 4:5 portrait, sized for 16×20 (~4800×6000 px). This single file covers every print size — the download ZIP (file + printing guide + license) builds itself.',
      group: 'file',
      hidden: ({ document }) => isShop(document),
      components: { input: HighResAssetInput },
      validation: (Rule) =>
        Rule.custom((value: { width?: number; height?: number } | undefined, context) => {
          if (isShop(context.document)) return true;
          if (!value) return 'Upload the print file — visitors have nothing to download without it.';
          if (value.width && value.height) {
            const r = value.width / value.height;
            const ok45 = r >= 0.76 && r <= 0.84;
            if (!ok45)
              return { message: "This file isn't 4:5 portrait — crop it before uploading so it prints without white edges.", level: 'warning' };
            if (value.width < 4800 || value.height < 6000)
              return { message: 'Below 4800×6000 px — this will look soft printed at 16×20. Re-export larger if you can.', level: 'warning' };
          }
          return true;
        }),
      fields: [
        defineField({ name: 'cloudinaryUrl', title: 'Cloudinary URL', type: 'url', readOnly: true }),
        defineField({ name: 'cloudinaryPublicId', title: 'Cloudinary Public ID', type: 'string', hidden: true, readOnly: true }),
        defineField({ name: 'externalUrl', title: 'Legacy External URL', type: 'url', hidden: true, readOnly: true }),
        defineField({ name: 'filename', title: 'Filename', type: 'string', readOnly: true }),
        defineField({ name: 'width', title: 'Width (px)', type: 'number', readOnly: true }),
        defineField({ name: 'height', title: 'Height (px)', type: 'number', readOnly: true }),
        defineField({ name: 'bytes', title: 'File Size (bytes)', type: 'number', readOnly: true }),
        defineField({ name: 'uploadedAt', title: 'Uploaded At', type: 'datetime', readOnly: true }),
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Pick one — this powers the "You might also like" section and the collection pages.',
      group: 'shop',
      options: {
        list: [
          { title: 'Video Games + Man Cave', value: 'Video Games' },
          { title: 'Motivational + Quotes', value: 'Quotes' },
          { title: 'Maps + Travel Posters', value: 'Maps' },
          { title: 'Funny + Meme', value: 'Funny' },
          { title: 'Minimalist', value: 'Minimalist' },
          { title: 'Botanical', value: 'Botanical' },
        ],
      },
    }),
    defineField({
      name: 'tags',
      title: 'Tags',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'A few words visitors might search (e.g. "retro", "arcade", "8-bit"). Also used to place this art on collection pages.',
      group: 'shop',
      options: {
        layout: 'tags',
      },
    }),
    defineField({
      name: 'rooms',
      title: 'Rooms',
      type: 'array',
      of: [{ type: 'string' }],
      description:
        'Which rooms this print belongs in. These are the tiles in "Find your wall" on the homepage, and each one is its own page. Tick every room it genuinely suits — a print can be in several. Leave it empty and the print falls back to being placed by its tags, which is how every print worked before this field existed.',
      group: 'shop',
      options: {
        list: ROOMS.map((r) => ({ title: r.label, value: r.id })),
        layout: 'grid',
      },
    }),
    defineField({
      name: 'roomTile',
      title: 'Use as the room tile',
      type: 'boolean',
      initialValue: false,
      description:
        'Keep this print as the photo on its room tiles on the homepage. Without it the newest print in a room wins, so every new listing takes the tile over. Only the rooms ticked above are affected, and if two pinned prints share a room the newer one shows.',
      group: 'shop',
      hidden: ({ document }) => !isShop(document),
    }),
    defineField({
      name: 'featured',
      title: 'Featured Free Print of the Month',
      type: 'boolean',
      initialValue: false,
      description: 'Show this piece in the homepage hero as the free print of the month. Only one artwork should have this on.',
      group: 'shop',
      hidden: ({ document }) => isShop(document),
      validation: (Rule) =>
        Rule.custom(async (featured, context) => {
          if (!featured) return true
          const id = context.document?._id?.replace(/^drafts\./, '')
          const client = context.getClient({ apiVersion: '2025-11-27' })
          const otherFeaturedCount = await client.fetch(
            `count(*[_type == "product" && featured == true && !(_id in [$id, $draftId])])`,
            { id, draftId: `drafts.${id}` }
          )
          if (otherFeaturedCount > 0) {
            return { message: 'Another artwork is already featured — un-feature it first so the homepage hero is unambiguous.', level: 'warning' }
          }
          return true
        }),
    }),
    defineField({
      name: 'offers',
      title: 'Print offers',
      type: 'array',
      description:
        'Where this artwork can be bought as a physical print. One offer per provider, finish and version, since each is its own Fourthwall product. Fourthwall = on-site checkout. Drag to reorder: the first version is the one the page opens on unless Default version says otherwise.',
      group: 'shop',
      hidden: ({ document }) => !isShop(document),
      of: [defineArrayMember({ type: 'printOffer' })],
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const list = (value as { provider?: string; finish?: string; version?: string }[] | undefined) ?? []
          if (isShop(context.document) && list.length === 0) return 'A shop print needs at least one offer.'
          // one Fourthwall product is one offer, and a product is a version in a finish
          const keys = list.map((o) => `${o.provider}:${o.finish ?? 'unframed'}:${o.version?.trim() ?? ''}`)
          if (new Set(keys).size !== keys.length) return 'Only one offer per provider, finish and version.'
          return true
        }),
    }),
    defineField({
      name: 'defaultVersion',
      title: 'Default version',
      type: 'string',
      description: 'Which version of the artwork the shop page opens on. Picked from the versions this print sells.',
      group: 'shop',
      hidden: ({ document }) => !isShop(document),
      components: { input: DefaultVersionInput },
    }),
    defineField({
      name: 'defaultFinish',
      title: 'Default finish',
      type: 'string',
      description: 'Which finish the shop page opens on. Leave empty for Unframed.',
      group: 'shop',
      hidden: ({ document }) => !isShop(document),
      options: { list: FINISHES.map((f) => ({ title: f.label, value: f.id })), layout: 'radio' },
    }),
    defineField({
      name: 'downloads',
      title: 'Total Downloads',
      type: 'number',
      description: 'How many times this free print has been downloaded. Counted automatically. Nothing to fill in.',
      group: 'stats',
      hidden: ({ document }) => isShop(document),
      initialValue: 0,
      readOnly: true,
      validation: (Rule) => Rule.min(0).integer(),
    }),
    defineField({
      name: 'sales',
      title: 'Prints sold',
      type: 'number',
      description: 'How many orders have included this print. Counted automatically when an order comes in, and used to order the best sellers row on the home page. Nothing to fill in.',
      group: 'stats',
      hidden: ({ document }) => !isShop(document),
      initialValue: 0,
      readOnly: true,
      validation: (Rule) => Rule.min(0).integer(),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      media: 'previewImage',
      width: 'artFile.width',
      height: 'artFile.height',
      hasFile: 'artFile.cloudinaryUrl',
      downloads: 'downloads',
      featured: 'featured',
      offers: 'offers',
      listing: 'listing',
    },
    prepare({ title, media, width, height, hasFile, downloads, featured, offers, listing }) {
      let fileInfo = '⚠ file missing';
      if (hasFile && width && height) {
        const ratio = deriveRatio(width, height);
        fileInfo = `${ratio ?? 'odd crop'} · ${width}×${height}`;
      } else if (hasFile) {
        fileInfo = 'file ready';
      }
      const list = (offers as { provider?: string; active?: boolean; sizes?: { priceCents?: number }[] }[] | undefined) ?? [];
      const onSite = list.find((o) => o.provider === 'fourthwall' && o.active !== false);
      const prices = (onSite?.sizes ?? []).map((s) => s.priceCents).filter((p): p is number => typeof p === 'number');
      const shopInfo = prices.length ? `from $${(Math.min(...prices) / 100).toFixed(2)}` : 'no offer yet';
      if (listing === 'shop') {
        return { title, subtitle: `shop · ${shopInfo}`, media }
      }
      return {
        title: featured ? `⭐ ${title}` : title,
        subtitle: `free · ${fileInfo} · ${downloads ?? 0} downloads`,
        media,
      }
    },
  },
})
