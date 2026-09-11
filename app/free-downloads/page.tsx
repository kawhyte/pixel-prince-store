import type { Metadata } from "next";

import { getAllProducts } from "@/sanity/lib/client";
import { generateMetadata as seoMeta } from "@/lib/seo";
import { freeGalleryBreadcrumb, freeGallerySchema } from "@/lib/artwork-schema";
import FreeDownloadsClient from "./free-downloads-client";

export const revalidate = 60; // Revalidate every 60 seconds

export const metadata: Metadata = seoMeta({
  title: "Free printable wall art",
  description:
    "Download free printable wall art: retro gaming prints, city maps, and minimalist pieces. One file prints at three sizes, guide included.",
  canonical: "https://www.thepixelprince.com/free-downloads",
});

export default async function FreeDownloadsPage() {
  // Fetch products from Sanity
  const products = await getAllProducts();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(freeGallerySchema(products)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(freeGalleryBreadcrumb()) }}
      />
      <FreeDownloadsClient products={products} />
    </>
  );
}
