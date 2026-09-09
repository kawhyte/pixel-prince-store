import { createClient } from 'next-sanity'
import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { urlFor } from './image'
import { getImageOrientation, getOptimalImageDimensions, type ImageOrientation } from '@/lib/image-utils'
import { mapGalleryImages, type GalleryImage, type RawGalleryImage } from '@/lib/gallery-images'

import { apiVersion, dataset, projectId } from '../env'

export const client = createClient({
  projectId,
  dataset,
  apiVersion,
  useCdn: true, // Set to false if statically generating pages, using ISR or tag-based revalidation
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
  active?: boolean
  providerProductId?: string
  checkoutUrl?: string
  sizes?: ShopSizeOffer[]
}

export type ArtworkKind = 'single' | 'set'
export type ArtworkListing = 'free' | 'shop'

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
  offers?: PrintOffer[]
  tags?: string[]
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
  previewImageOrientation?: ImageOrientation
  detailImage?: string
  galleryImages?: GalleryImage[]
  artFile?: ArtFile
  listing: ArtworkListing
  kind: ArtworkKind
  offers: PrintOffer[]
  tags: string[]
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
  offers,
  tags,
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

    const { width: transformWidth, height: transformHeight } =
      getOptimalImageDimensions(width, height, previewImageOrientation.orientation);

    previewImageUrl = urlFor(product.previewImage)
      .width(transformWidth)
      .height(transformHeight)
      .url();
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
    offers: product.offers ?? [],
    tags: product.tags || [],
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

      // Apply optimal image transform based on detected orientation
      const { width: transformWidth, height: transformHeight } =
        getOptimalImageDimensions(width, height, previewImageOrientation.orientation);

      previewImageUrl = urlFor(product.previewImage)
        .width(transformWidth)
        .height(transformHeight)
        .url();
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
