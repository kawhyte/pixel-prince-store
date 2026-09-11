import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getAllProducts, getProductBySlug, getRelatedProducts, getRelatedShopPrints } from "@/sanity/lib/client";
import { generateMetadata as seoMeta } from "@/lib/seo";
import ArtDetailClient from "./art-detail-client";

interface PageProps {
  params: Promise<{
    id: string;
  }>;
}

export const revalidate = 60; // Revalidate every 60 seconds

// Generate static params for all art pieces (for static generation)
export async function generateStaticParams() {
  const products = await getAllProducts();
  return products.map((art) => ({
    id: art.id,
  }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const art = await getProductBySlug(id);
  if (!art) return { title: "Art Not Found" };
  const metadata = seoMeta({
    title: `${art.title} | Free printable wall art`,
    description: art.description,
    canonical: `https://www.thepixelprince.com/art/${art.id}`,
  });
  // Let the opengraph-image.tsx route convention supply og:image/twitter:image
  // instead of the generic fallback seoMeta() would otherwise set.
  if (metadata.openGraph) delete metadata.openGraph.images;
  if (metadata.twitter) delete (metadata.twitter as { images?: unknown }).images;
  return metadata;
}

export default async function ArtDetailPage({ params }: PageProps) {
  const { id } = await params;
  const art = await getProductBySlug(id);

  // If art not found, show 404
  if (!art) {
    notFound();
  }

  // Fetch related products (same category, excluding current)
  const [relatedArt, shopPrints] = await Promise.all([
    getRelatedProducts(art.category || '', id),
    getRelatedShopPrints(art.category || '', id),
  ]);

  /**
   * A free printable is a work, not a product. It was declared as a Product with a $0 Offer, which
   * tells Google this is something purchasable at no cost and invites product rich results a free
   * download cannot honour. VisualArtwork with isAccessibleForFree says what it actually is.
   *
   * Also: one image became several. Google asks for more than one per item and prefers a mix of
   * shapes, which is what the shop page already sends.
   */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "VisualArtwork",
    name: art.title,
    description: art.description,
    image: [art.detailImage, art.previewImage, ...(art.galleryImages ?? []).map((g) => g.url)].filter(
      (url, i, all): url is string => !!url && all.indexOf(url) === i
    ),
    creator: { "@type": "Organization", name: art.artist || "The Pixel Prince" },
    isAccessibleForFree: true,
    url: `https://www.thepixelprince.com/art/${art.id}`,
    ...(art.category ? { genre: art.category } : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ArtDetailClient art={art} relatedArt={relatedArt} shopPrints={shopPrints} />
    </>
  );
}
