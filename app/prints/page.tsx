import Link from "next/link";

import { generateMetadata as seoMeta } from "@/lib/seo";
import { getShopPrints } from "@/sanity/lib/client";
import PrintsGridClient from "./prints-grid-client";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";

export const revalidate = 60;

export const metadata = seoMeta({
  title: "Art prints",
  description:
    "Retro gaming and map art prints, printed to order on 189 gsm matte paper and shipped free inside the US. Five sizes, from 8x10 to 24x36.",
  canonical: "https://www.thepixelprince.com/prints",
});

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: "https://www.thepixelprince.com/" },
    { "@type": "ListItem", position: 2, name: "Prints", item: "https://www.thepixelprince.com/prints" },
  ],
};

export default async function PrintsPage() {
  const prints = await getShopPrints();

  return (
    <div className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      <main className="container mx-auto px-4 py-16 sm:py-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl font-semibold text-charcoal sm:text-4xl">Prints</h1>
          <p className="mt-4 text-lg text-soft-charcoal">
            Printed to order on 189 gsm matte paper and shipped free inside the US. Five sizes,
            from 8x10 to 24x36.
          </p>
        </div>

        {prints.length === 0 ? (
          <div className="mx-auto mt-12 max-w-xl rounded-md border border-border bg-card p-8 text-center">
            <p className="text-lg text-charcoal">The first printed prints are arriving soon.</p>
            <p className="mt-2 text-sm text-soft-charcoal">
              Join the list and hear the day they land. Until then,{" "}
              <Link href="/free-downloads" className="font-medium text-sage-500 underline hover:text-sage-400">
                every print in the free library
              </Link>{" "}
              costs nothing.
            </p>
            <EmailSignupForm source="prints" className="mx-auto mt-6 max-w-md text-left" />
          </div>
        ) : (
          <PrintsGridClient prints={prints} />
        )}

        <p className="mt-12 text-center text-sm text-soft-charcoal">
          Printed in the USA · Free US shipping · 7,000+ prints shipped since 2009
        </p>
      </main>
    </div>
  );
}
