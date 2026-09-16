import { createClient } from 'next-sanity'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { urlFor } from './image'
import { getImageOrientation, type ImageOrientation } from '@/lib/image-utils'
import { mapGalleryImages, type GalleryImage, type RawGalleryImage } from '@/lib/gallery-images'

import { apiVersion, dataset, projectId } from '../env'

/**
 * How wide a card image is fetched from Sanity. Cards are laid out by width and next/image already
 * picks a size per viewport from `sizes`, so the only job here is to hand it a source big enough to
 * pick from. It was previously sized per orientation with the long edge capped at 800, which capped
 * a portrait image at 600 WIDE while a square one got 800. Cards are width-constrained, so every
 * portrait print was fetched 25% narrower than the square ones and looked softer beside them.
 * Sanity will not upscale, so a smaller original simply comes back at its own size.
 */
const CARD_SOURCE_WIDTH = 1200

/**
 * The CDN is on in production and off in development.
 *
 * Two caches sit between a Publish in Studio and the page: Sanity's CDN (about a minute) and
 * Next's ISR (`revalidate = 60`, serving the stale page while it refreshes behind you). Stacked,
 * an edit took up to two minutes to appear and produced the "reload twice" symptom, where the
 * first reload triggers the refresh and the second one sees it.
 *
 * In production that trade is worth it: the CDN is what makes reads fast and cheap. While editing
 * it is only a delay, so development reads live and the wait halves. Nothing about the built site
 * changes (Kenny, 2026-09-11).
 */
export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: process.env.NODE_ENV === 'production',
})

/**
 * TypeScript interfaces matching the Sanity schema
 */
// Re-export ImageOrientation from lib/image-utils for convenience
export type { ImageOrientation } from '@/lib/image-utils';

export interface ArtFile {
  cloudinaryUrl?: string
  cloudinaryPublicId?: string
  externalUrl?: string // legacy only
  filename?: string
  width?: number
  height?: number
  bytes?: number
}

export interface ShopSizeOffer {
  _key?: string
  sizeId: string
  priceCents: number
  providerVariantId?: string
  popular?: boolean
}

export interface PrintOffer {
  _key?: string
  provider: 'fourthwall' | 'etsy' | 'stripe'
  finish?: 'unframed' | 'framed' | 'canvas'
  /** which version of the artwork this offer sells (Ivory, Midnight); each version is its own Fourthwall product */
  version?: string
  /** resolved by the projection from the `mockup` image */
  mockupUrl?: string
  /** width / height of `mockup`, so the frame can be cut to the photo instead of padding it */
  mockupRatio?: number
  /** alt text typed in Studio for `mockup`; the page falls back to a generated line when empty */
  mockupAlt?: string
  /** resolved by the projection from the `art` image: the artwork with no mockup around it */
  artUrl?: string
  /** width / height of `art` */
  artRatio?: number
  /** alt text typed in Studio for `art` */
  artAlt?: string
  /** photos of this colorway, shown after the main image and before the shared room photos */
  gallery?: { url: string; alt?: string }[]
  active?: boolean
  providerProductId?: string
  checkoutUrl?: string
  sizes?: ShopSizeOffer[]
}

export type ArtworkKind = 'single' | 'set'
export type ArtworkListing = 'free' | 'shop'

/**
 * One print inside a set (PLAN-54). The set owns nothing a member already has: the price, the
 * sizes and the variant ids are all read back off `print.offers`, so a set cannot go stale when
 * `shop:sync` refreshes a member's prices.
 */
export interface SetMember {
  /** which colorway of the member, when it sells more than one. Empty means the member's default. */
  version?: string
  print?: {
    _id: string
    title: string
    slug?: { current?: string }
    category?: string
    previewImage?: SanityImageWithDimensions
    offers?: PrintOffer[]
  }
}

export type SanityImageWithDimensions = SanityImageSource & {
  asset?: {
    _id: string
    url: string
    metadata?: {
      dimensions?: {
        width: number
        height: number
        aspectRatio: number
      }
    }
  }
}

export interface SanityProduct {
  _id: string
  _createdAt: string
  title: string
  slug: {
    current: string
  }
  artist: string
  description: string
  longDescription?: string
  previewImage: SanityImageWithDimensions
  detailImage?: SanityImageWithDimensions
  galleryImages?: RawGalleryImage[]
  artFile?: ArtFile
  listing?: ArtworkListing
  kind?: ArtworkKind
  defaultVersion?: string
  defaultFinish?: 'unframed' | 'framed' | 'canvas'
  offers?: PrintOffer[]
  members?: SetMember[]
  tags?: string[]
  rooms?: string[]
  category?: string
  downloads?: number
  sales?: number
  featured?: boolean
}

export interface FreeArt {
  _id: string
  id: string
  createdAt: string
  title: string
  artist: string
  description: string
  longDescription?: string
  previewImage: string
  /**
   * The card image cropped to the hero wall's own 4:5, so every print is the same shape there and
   * nothing is cut at render time. Honours the hotspot set in Studio, which is the control for what
   * survives the crop on a landscape artwork.
   */
  heroImage?: string
  previewImageOrientation?: ImageOrientation
  detailImage?: string
  galleryImages?: GalleryImage[]
  artFile?: ArtFile
  listing: ArtworkListing
  kind: ArtworkKind
  defaultVersion?: string
  defaultFinish?: 'unframed' | 'framed' | 'canvas'
  offers: PrintOffer[]
  /** only on `kind: "set"`: the prints sold together here (PLAN-54) */
  members?: SetMember[]
  tags: string[]
  /** rooms picked in Studio; empty means "place me by my tags" (config/collections.ts) */
  rooms?: string[]
  category?: string
  downloads?: number
  sales?: number
  featured?: boolean
}

const PRODUCT_PROJECTION = `
  _id,
  _createdAt,
  title,
  slug,
  artist,
  description,
  longDescription,
  previewImage {
    ...,
    asset->{
      _id,
      url,
      metadata {
        dimensions {
          width,
          height,
          aspectRatio
        }
      }
    }
  },
  detailImage,
  galleryImages,
  artFile,
  listing,
  kind,
  defaultVersion,
  defaultFinish,
  offers[]{ ...,
    "mockupUrl": mockup.asset->url, "mockupRatio": mockup.asset->metadata.dimensions.aspectRatio, "mockupAlt": mockup.alt,
    "artUrl": art.asset->url, "artRatio": art.asset->metadata.dimensions.aspectRatio, "artAlt": art.alt,
    "gallery": gallery[]{ "url": asset->url, "alt": alt } },
  members[]{
    version,
    "print": print->{
      _id, title, slug, category,
      previewImage { ..., asset->{ _id, url, metadata { dimensions { width, height, aspectRatio } } } },
      offers[]{ ...,
        "mockupUrl": mockup.asset->url, "mockupRatio": mockup.asset->metadata.dimensions.aspectRatio, "mockupAlt": mockup.alt,
        "artUrl": art.asset->url, "artRatio": art.asset->metadata.dimensions.aspectRatio, "artAlt": art.alt }
    }
  },
  tags,
  rooms,
  category,
  downloads,
  sales,
  featured
`

/** Free prints only: `listing` undefined (pre-PLAN-35b documents) counts as free. */
const FREE_FILTER = '_type == "product" && listing != "shop"'
const SHOP_FILTER = '_type == "product" && listing == "shop"'

function toFreeArt(product: SanityProduct): FreeArt {
  let previewImageOrientation: ImageOrientation | undefined;
  let previewImageUrl = '';

  if (product.previewImage?.asset?.metadata?.dimensions) {
    const { width, height } = product.previewImage.asset.metadata.dimensions;
    previewImageOrientation = getImageOrientation(width, height);

    previewImageUrl = urlFor(product.previewImage).width(CARD_SOURCE_WIDTH).url();
  } else {
    previewImageUrl = product.previewImage
      ? urlFor(product.previewImage).width(600).height(800).url()
      : '';
  }

  return {
    _id: product._id,
    id: product.slug.current,
    createdAt: product._createdAt,
    title: product.title,
    artist: product.artist,
    description: product.description,
    longDescription: product.longDescription,
    previewImage: previewImageUrl,
    heroImage: product.previewImage
      ? urlFor(product.previewImage).width(800).height(1000).fit("crop").url()
      : undefined,
    previewImageOrientation,
    detailImage: product.detailImage
      ? urlFor(product.detailImage).width(1200).height(1600).url()
      : undefined,
    galleryImages: mapGalleryImages(
      product.galleryImages,
      (img) => urlFor(img as SanityImageSource).width(1200).url(),
      product.title,
    ),
    artFile: product.artFile,
    listing: product.listing ?? 'free',
    kind: product.kind ?? 'single',
    defaultVersion: product.defaultVersion,
    defaultFinish: product.defaultFinish,
    offers: product.offers ?? [],
    ...(product.members?.length ? { members: product.members } : {}),
    tags: product.tags || [],
    ...(product.rooms?.length ? { rooms: product.rooms } : {}),
    category: product.category,
    downloads: product.downloads || 0,
    sales: product.sales || 0,
    featured: product.featured,
  };
}

/**
 * Fetch all free art products from Sanity
 * Returns data in the format expected by the frontend
 */
export async function getAllProducts(): Promise<FreeArt[]> {
  const query = `*[${FREE_FILTER}] | order(_createdAt desc) { ${PRODUCT_PROJECTION} }`

  const products = await client.fetch<SanityProduct[]>(query)

  return products.map(toFreeArt)
}

/** Shop prints only (PLAN-35b). Rendered by /prints/[slug] from PLAN-36. */
/**
 * How many sets are for sale. Counted rather than fetched, because the only question the nav and
 * the homepage band ask is "is there anything behind this link", and a link to an empty grid is
 * worse than no link: someone clicked it wanting to buy.
 */
export async function getShopSetCount(): Promise<number> {
  // Never throws. This runs in the root layout, so an unreachable Sanity took the whole site down
  // with it: a connect timeout here 500'd every page, /privacy and /terms included, for the sake
  // of one optional nav link. Nothing here is worth an outage, so a failure just hides the link.
  try {
    return await client.fetch<number>(`count(*[${SHOP_FILTER} && kind == "set"])`)
  } catch (error) {
    console.error('[SANITY] getShopSetCount failed, hiding the Sets link:', error)
    return 0
  }
}

export async function getShopPrints(): Promise<FreeArt[]> {
  const query = `*[${SHOP_FILTER}] | order(_createdAt desc) { ${PRODUCT_PROJECTION} }`
  const products = await client.fetch<SanityProduct[]>(query)
  return products.map(toFreeArt)
}

export async function getShopPrintBySlug(slug: string): Promise<FreeArt | null> {
  const query = `*[${SHOP_FILTER} && slug.current == $slug][0] { ${PRODUCT_PROJECTION} }`
  const product = await client.fetch<SanityProduct | null>(query, { slug })
  return product ? toFreeArt(product) : null
}

/** Up to 3 other shop prints in the same category ("Complete the set"). */
export async function getRelatedShopPrints(category: string, currentSlug: string): Promise<FreeArt[]> {
  if (!category) return []
  const query = `*[${SHOP_FILTER} && category == $category && slug.current != $currentSlug] | order(_createdAt desc) [0...3] { ${PRODUCT_PROJECTION} }`
  const products = await client.fetch<SanityProduct[]>(query, { category, currentSlug })
  return products.map(toFreeArt)
}

/**
 * Fetch related products by category (excluding current product)
 * Returns up to 3 related products from the same category
 */
export async function getRelatedProducts(category: string, currentSlug: string): Promise<FreeArt[]> {
  // If no category provided, return empty array
  if (!category) return [];

  const query = `*[${FREE_FILTER} && category == $category && slug.current != $currentSlug] | order(_createdAt desc) [0...3] {
    _id,
    _createdAt,
    title,
    slug,
    artist,
    description,
    previewImage {
      asset->{
        _id,
        url,
        metadata {
          dimensions {
            width,
            height,
            aspectRatio
          }
        }
      }
    },
    category,
    featured
  }`

  const products = await client.fetch<SanityProduct[]>(query, { category, currentSlug })

  // Transform to FreeArt interface (simplified for related products)
  return products.map((product) => {
    let previewImageOrientation: ImageOrientation | undefined;
    let previewImageUrl = '';

    // Extract orientation from image metadata if available
    if (product.previewImage?.asset?.metadata?.dimensions) {
      const { width, height } = product.previewImage.asset.metadata.dimensions;
      previewImageOrientation = getImageOrientation(width, height);

      previewImageUrl = urlFor(product.previewImage).width(CARD_SOURCE_WIDTH).url();
    } else {
      // Fallback for images without metadata (default to portrait 3:4)
      previewImageUrl = product.previewImage
        ? urlFor(product.previewImage).width(600).height(800).url()
        : '';
    }

    return {
      _id: product._id,
      id: product.slug.current,
      createdAt: product._createdAt,
      title: product.title,
      artist: product.artist,
      description: product.description,
      longDescription: product.longDescription,
      previewImage: previewImageUrl,
      previewImageOrientation,
      detailImage: undefined,
      artFile: undefined,
      listing: 'free',
      kind: 'single',
      offers: [],
      tags: [],
      category: product.category,
      downloads: 0,
    };
  })
}

/**
 * Fetch a single product by slug
 */
export async function getProductBySlug(slug: string): Promise<FreeArt | null> {
  const query = `*[${FREE_FILTER} && slug.current == $slug][0] { ${PRODUCT_PROJECTION} }`

  const product = await client.fetch<SanityProduct | null>(query, { slug })

  if (!product) return null

  return toFreeArt(product)
}

/**
 * Fetch the featured "print of the month" product
 */
export async function getFeaturedProduct(): Promise<FreeArt | null> {
  const query = `*[${FREE_FILTER} && featured == true] | order(_updatedAt desc) [0] { ${PRODUCT_PROJECTION} }`

  const product = await client.fetch<SanityProduct | null>(query)

  if (!product) return null

  return toFreeArt(product)
}
