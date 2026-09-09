import type { SanityImageSource } from '@sanity/image-url/lib/types/types'
import { client, type PrintOffer, type ArtworkListing } from './client'
import { urlFor } from './image'

export interface EmbeddedProduct {
  title: string
  slug: string
  previewImage: string
  description: string
  category?: string
  listing?: ArtworkListing
  offers?: PrintOffer[]
}

export interface ImageAttribution {
  credit?: string
  sourceUrl?: string
}

export interface PortableImageBlock {
  _type: 'image'
  _key: string
  alt?: string
  attribution?: ImageAttribution
  asset?: { _ref: string; _type: 'reference' }
  hotspot?: unknown
  crop?: unknown
}

export interface BlogImageSlot {
  _type: 'blogImage'
  _key: string
  alt?: string
  attribution?: ImageAttribution
  asset?: { _ref: string; _type: 'reference' }
  hotspot?: unknown
  crop?: unknown
}

export interface ImageRowBlock {
  _type: 'imageRow'
  _key: string
  images?: BlogImageSlot[]
}

export interface ImageGridBlock {
  _type: 'imageGrid'
  _key: string
  images?: BlogImageSlot[]
}

export interface ProductEmbedBlock {
  _type: 'productEmbed'
  _key: string
  note?: string
  product: EmbeddedProduct | null
}

export interface EmailCaptureBlock {
  _type: 'emailCapture'
  _key: string
  heading?: string
}

export type BodyBlock =
  | { _type: 'block'; _key: string; [key: string]: unknown }
  | PortableImageBlock
  | ImageRowBlock
  | ImageGridBlock
  | ProductEmbedBlock
  | EmailCaptureBlock

export interface PostFaq {
  q: string
  a: string
}

export interface BlogPostSummary {
  title: string
  slug: string
  excerpt: string
  targetKeyword?: string
  hero: string
  publishedAt: string
  updatedAt?: string
}

export interface BlogPost extends BlogPostSummary {
  body: BodyBlock[]
  faq: PostFaq[]
}

interface SanityPostSummary {
  title: string
  slug: { current: string }
  excerpt: string
  targetKeyword?: string
  hero: SanityImageSource
  publishedAt: string
  updatedAt?: string
}

interface RawProductEmbedBlock {
  _type: 'productEmbed'
  _key: string
  note?: string
  product: {
    title: string
    slug: string
    previewImage?: SanityImageSource
    description: string
    category?: string
    listing?: ArtworkListing
    offers?: PrintOffer[]
  } | null
}

type RawBodyBlock = BodyBlock | RawProductEmbedBlock

interface SanityPost extends SanityPostSummary {
  body: RawBodyBlock[]
  faq: PostFaq[]
}

const SUMMARY_PROJECTION = `{
  title,
  slug,
  excerpt,
  targetKeyword,
  hero,
  publishedAt,
  updatedAt
}`

function toSummary(post: SanityPostSummary): BlogPostSummary {
  return {
    title: post.title,
    slug: post.slug.current,
    excerpt: post.excerpt,
    targetKeyword: post.targetKeyword,
    hero: post.hero ? urlFor(post.hero).width(800).height(450).url() : '',
    publishedAt: post.publishedAt,
    updatedAt: post.updatedAt,
  }
}

/**
 * Fetch all published blog posts (publishedAt in the past), newest first.
 */
export async function getAllPosts(): Promise<BlogPostSummary[]> {
  const query = `*[_type == "post" && publishedAt < now()] | order(publishedAt desc) ${SUMMARY_PROJECTION}`
  const posts = await client.fetch<SanityPostSummary[]>(query)
  return posts.map(toSummary)
}

/**
 * Fetch a single published post by slug, with full body and FAQ.
 */
export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  const query = `*[_type == "post" && slug.current == $slug && publishedAt < now()][0] {
    title,
    slug,
    excerpt,
    targetKeyword,
    hero,
    publishedAt,
    updatedAt,
    body[]{
      ...,
      _type == "productEmbed" => {
        "product": product->{
          title,
          "slug": slug.current,
          previewImage,
          description,
          category,
          listing,
          offers
        }
      }
    },
    faq
  }`

  const post = await client.fetch<SanityPost | null>(query, { slug })
  if (!post) return null

  return {
    ...toSummary(post),
    body: (post.body || []).map((block: RawBodyBlock): BodyBlock => {
      if (block._type !== 'productEmbed') return block
      const product = block.product
      return {
        _type: 'productEmbed',
        _key: block._key,
        note: block.note,
        product: product
          ? {
              title: product.title,
              slug: product.slug,
              previewImage: product.previewImage
                ? urlFor(product.previewImage).width(160).height(213).url()
                : '',
              description: product.description,
              category: product.category,
              listing: product.listing,
              offers: product.offers,
            }
          : null,
      } satisfies ProductEmbedBlock
    }),
    faq: post.faq || [],
  }
}

/**
 * Fetch up to 3 most recent published posts, excluding the current one.
 */
export async function getRelatedPosts(currentSlug: string): Promise<BlogPostSummary[]> {
  const query = `*[_type == "post" && publishedAt < now() && slug.current != $currentSlug] | order(publishedAt desc) [0...3] ${SUMMARY_PROJECTION}`
  const posts = await client.fetch<SanityPostSummary[]>(query, { currentSlug })
  return posts.map(toSummary)
}
