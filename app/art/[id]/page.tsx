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

  // Generate JSON-LD structured data for SEO (Product Schema)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: art.title,
    description: art.description,
    image: art.detailImage || art.previewImage,
    brand: {
      "@type": "Brand",
      name: "The Pixel Prince"
    },
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
      url: `https://www.thepixelprince.com/art/${art.id}`
    }
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
