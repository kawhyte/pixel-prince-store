import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAllProducts, getShopPrints } from "@/sanity/lib/client";
import { cardCommerce } from "@/lib/commerce";
import { gridClass, gridSizes } from "@/lib/grid";
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
  /**
   * Two grids, not one (Kenny, 2026-09-15).
   *
   * Mixed together, three cards reading FREE sat beside one reading "From $23.99" and got identical
   * treatment, which is the shop competing with itself at the moment someone is deciding to buy.
   * The free prints are lead magnets: they belong on the page, below, framed as a bonus rather than
   * as a cheaper alternative to the thing being sold.
   *
   * It also settles the ragged rows. Shop previews are portrait room photos and the free library is
   * square flat art, and no single grid shape suits both; split, each grid is uniform and nothing
   * has to be cropped to make it so.
   */
  const paidPrints = matchProductsToCollection(shopPrints, collection);
  const freePrints = matchProductsToCollection(products, collection);
  const matchedProducts = [...paidPrints, ...freePrints];

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
        {/* Wider than the 3xl the body copy below uses: the lead sits alone under the h1 with the
            whole page width beside it, so a narrow measure left it looking like a stray column. */}
        <div className="max-w-5xl">
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
            <>
              {paidPrints.length > 0 && (
                <div className={gridClass(paidPrints.length)}>
                  {paidPrints.map((art) => {
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
                        aspect="aspect-[4/5]"
                        sizes={gridSizes(paidPrints.length)}
                      />
                    );
                  })}
                </div>
              )}

              {freePrints.length > 0 && (
                <section className={paidPrints.length > 0 ? "mt-16 border-t border-border pt-12" : ""}>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.08em] text-sage-500">
                    Also free to download
                  </h2>
                  <p className="mt-2 text-soft-charcoal">
                    Print these at home, no charge. A new one lands every month.
                  </p>
                  {/* Square: the free library is flat artwork on a square canvas, and a 4:5 grid
                      would crop the art itself rather than a photo's background. */}
                  <div className={`mt-8 ${gridClass(freePrints.length)}`}>
                    {freePrints.map((art) => {
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
                          aspect="aspect-square"
                          sizes={gridSizes(freePrints.length)}
                        />
                      );
                    })}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {collection.intro.length > 1 && (
          // Same width as the lead above: these are the same voice continuing, and a narrower
          // measure here made the page look like it changed its mind halfway down.
          <section className="mt-20 max-w-5xl">
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
