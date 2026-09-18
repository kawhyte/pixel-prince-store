import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getShopPrints, getShopPrintBySlug, getRelatedShopPrints } from "@/sanity/lib/client";
import { generateMetadata as seoMeta } from "@/lib/seo";
import { deliveryWindow } from "@/lib/delivery";
import { shopPrintBreadcrumb, shopPrintFaqSchema, shopPrintSchema } from "@/lib/product-schema";
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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopPrintSchema(art)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopPrintBreadcrumb(art)) }}
      />
      {/* The same questions the accordion renders further down the page, so the answers are
          readable by a crawler and an assistant, not only by someone who clicks. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopPrintFaqSchema()) }}
      />
      <ShopPrintClient art={art} related={related} deliveryBy={deliveryWindow(new Date()).label} />
    </>
  );
}
