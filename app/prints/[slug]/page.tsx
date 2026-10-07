import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { getShopPrints, getShopPrintBySlug } from "@/sanity/lib/client";
import { pairsForPrint, relatedForPrint } from "@/lib/print-pairings";
import { generateMetadata as seoMeta, jsonLd } from "@/lib/seo";
import { deliveryWindow } from "@/lib/delivery";
import { shopPrintMetaTitle } from "@/config/shop-copy";
import { shopPrintBreadcrumb, shopPrintFaqSchema, shopPrintSchema } from "@/lib/product-schema";
import ShopPrintClient from "./shop-print-client";
import { AfterHero, BelowSizeGuide, BuyStackDetails, PrintBreadcrumb } from "./shop-print-sections";

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
    title: shopPrintMetaTitle(art.title, art.category),
    description: art.description,
    canonical: `https://www.thepixelprince.com/prints/${art.id}`,
    image: art.detailImage || art.previewImage,
  });
}

export default async function ShopPrintPage({ params }: PageProps) {
  const { slug } = await params;
  const art = await getShopPrintBySlug(slug);
  if (!art) notFound();

  const shopPrints = await getShopPrints();
  const pairs = pairsForPrint(art, shopPrints);
  const related = relatedForPrint(art, shopPrints, pairs);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(shopPrintSchema(art)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(shopPrintBreadcrumb(art)) }}
      />
      {/* The same questions the accordion renders further down the page, so the answers are
          readable by a crawler and an assistant, not only by someone who clicks. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(shopPrintFaqSchema()) }}
      />
      <div className="min-h-screen bg-cream pb-24 lg:pb-0">
        <PrintBreadcrumb category={art.category?.trim()} />
        {/* Only the gallery, price and picker run in the browser; the rest is plain server HTML. */}
        <ShopPrintClient
          art={art}
          deliveryBy={deliveryWindow(new Date()).label}
          belowBuy={<BuyStackDetails art={art} pairs={pairs} />}
          afterHero={<AfterHero art={art} />}
        />
        <BelowSizeGuide art={art} related={related} />
      </div>
    </>
  );
}
