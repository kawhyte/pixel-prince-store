import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllProducts, getShopPrints } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import { generateMetadata as seoMeta } from "@/lib/seo";
import { COLLECTIONS, getCollection, matchProductsToCollection } from "@/config/collections";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";
import ArtCard from "@/components/common/ArtCard/ArtCard";

export const revalidate = 3600;
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) return { title: "Collection Not Found" };
  return seoMeta({
    title: collection.title,
    description: collection.metaDescription,
    canonical: `https://www.thepixelprince.com/collections/${slug}`,
  });
}

export default async function CollectionPage({ params }: PageProps) {
  const { slug } = await params;
  const collection = getCollection(slug);
  if (!collection) notFound();

  const [products, shopPrints] = await Promise.all([getAllProducts(), getShopPrints()]);
  // Shop prints first, then the free library.
  const matchedProducts = [
    ...matchProductsToCollection(shopPrints, collection),
    ...matchProductsToCollection(products, collection),
  ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: collection.faq.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };

  return (
    <div className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="container mx-auto px-4 py-12 sm:py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-charcoal lg:text-5xl">
            {collection.title}
          </h1>
          {/* The lead only. Four paragraphs pushed every product below the fold, and the reader
              who wanted to see the art had to scroll past 200 words to reach it. The rest is still
              on the page, under the grid, where it does the same job for search without standing
              between a shopper and the thing they came for. */}
          {collection.intro[0] && (
            <p className="mt-6 text-lg leading-relaxed text-soft-charcoal">{collection.intro[0]}</p>
          )}
        </div>

        <div className="mt-12">
          {collection.comingSoon && matchedProducts.length === 0 ? (
            <div className="max-w-xl">
              <div className="rounded-md border border-border bg-card p-8">
                <h2 className="text-2xl font-semibold text-charcoal">
                  First prints landing soon
                </h2>
                <p className="mt-3 text-base text-soft-charcoal">
                  Join the list and you will hear the day the first basketball prints go live.
                </p>
                <EmailSignupForm source="basketball-waitlist" className="mt-4" />
              </div>
              <p className="mt-6 text-base text-soft-charcoal">
                Meanwhile, the game room collection is live:{" "}
                <Link
                  href="/collections/game-room-wall-art"
                  className="font-medium text-sage-600 hover:text-sage-700"
                >
                  Game Room Wall Art
                </Link>
              </p>
            </div>
          ) : matchedProducts.length === 0 ? (
            <div className="rounded-md border border-border bg-card p-12 text-center">
              <p className="text-base text-muted-foreground sm:text-lg">
                New pieces are coming to this collection. Join the list to hear first.
              </p>
            </div>
          ) : (
            <div className="grid gap-y-8 gap-x-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-10 lg:gap-x-14 xl:grid-cols-4">
              {matchedProducts.map((art) => {
                const card = cardCommerce(art);
                return (
                  <ArtCard
                    key={art.id}
                    art={art}
                    href={card.href}
                    subtitle={art.category}
                    meta={card.meta}
                    value={card.value}
                    versions={card.versions}
                    versionNoun={card.versionNoun}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
                  />
                );
              })}
            </div>
          )}
        </div>

        {collection.intro.length > 1 && (
          <section className="mt-20 max-w-3xl">
            <h2 className="text-2xl font-semibold text-charcoal">About {collection.title.toLowerCase()}</h2>
            <div className="mt-6 space-y-4">
              {collection.intro.slice(1).map((paragraph, i) => (
                <p key={i} className="leading-relaxed text-soft-charcoal">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>
        )}

        <div className="mt-20 rounded-md bg-sage-50 p-8">
          <h2 className="text-2xl font-semibold text-charcoal">
            Get a new free print every month
          </h2>
          <EmailSignupForm source={`collection-${slug}`} className="mt-4 max-w-xl" />
        </div>

        <div className="mt-20 max-w-3xl">
          <h2 className="text-2xl font-semibold text-charcoal">Common questions</h2>
          <div className="mt-6">
            <FaqAccordion faq={collection.faq} />
          </div>
        </div>
      </main>
    </div>
  );
}
