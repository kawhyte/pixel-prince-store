import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getShopPrints, getShopPrintBySlug, getRelatedShopPrints } from "@/sanity/lib/client";
import { generateMetadata as seoMeta } from "@/lib/seo";
import { getActiveOffer, priceRangeCents } from "@/lib/commerce";
import ShopPrintClient from "./shop-print-client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateStaticParams() {
  const prints = await getShopPrints();
  return prints.map((art) => ({ slug: art.id }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const art = await getShopPrintBySlug(slug);
  if (!art) return { title: "Print not found" };
  return seoMeta({
    title: `${art.title} | Art print`,
    description: art.description,
    canonical: `https://www.thepixelprince.com/prints/${art.id}`,
    image: art.detailImage || art.previewImage,
  });
}

export default async function ShopPrintPage({ params }: PageProps) {
  const { slug } = await params;
  const art = await getShopPrintBySlug(slug);
  if (!art) notFound();

  const related = await getRelatedShopPrints(art.category || "", slug);
  const offer = getActiveOffer(art);
  const range = priceRangeCents(offer);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: art.title,
    description: art.description,
    image: art.detailImage || art.previewImage,
    brand: { "@type": "Brand", name: "The Pixel Prince" },
    ...(range
      ? {
          offers: {
            "@type": "AggregateOffer",
            lowPrice: (range.min / 100).toFixed(2),
            highPrice: (range.max / 100).toFixed(2),
            priceCurrency: "USD",
            offerCount: offer?.sizes?.length ?? 0,
            availability: "https://schema.org/InStock",
            url: `https://www.thepixelprince.com/prints/${art.id}`,
          },
        }
      : {}),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ShopPrintClient art={art} related={related} />
    </>
  );
}
