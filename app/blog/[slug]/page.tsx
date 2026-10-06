import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { getAllPosts, getPostBySlug, getRelatedPosts } from "@/sanity/lib/blog";
import { generateMetadata as seoMeta, jsonLd } from "@/lib/seo";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";
import PortableBody from "@/components/blog/PortableBody";

export const revalidate = 60;
export const dynamicParams = true;

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getAllPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) return { title: "Post Not Found" };
  return seoMeta({
    title: post.title,
    description: post.excerpt,
    image: post.hero || undefined,
    canonical: `https://www.thepixelprince.com/blog/${slug}`,
  });
}

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = await getPostBySlug(slug);
  if (!post) notFound();

  const relatedPosts = await getRelatedPosts(slug);

  const canonicalUrl = `https://www.thepixelprince.com/blog/${slug}`;

  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    image: post.hero ? [post.hero] : undefined,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { "@type": "Person", name: "Kenny, The Pixel Prince" },
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.thepixelprince.com/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: "https://www.thepixelprince.com/blog" },
      { "@type": "ListItem", position: 3, name: post.title, item: canonicalUrl },
    ],
  };

  const faqSchema = post.faq.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: post.faq.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      }
    : null;

  return (
    <div className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(articleSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
        />
      )}

      <main className="container mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <nav aria-label="Breadcrumb" className="flex gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-sage-600">
            Home
          </Link>
          <span>/</span>
          <Link href="/blog" className="hover:text-sage-600">
            Blog
          </Link>
          <span>/</span>
          <span className="line-clamp-1 text-charcoal">{post.title}</span>
        </nav>

        <h1 className="mt-4 text-3xl font-bold text-charcoal sm:text-4xl lg:text-5xl">
          {post.title}
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          By Kenny · {formatDate(post.publishedAt)}
        </p>

        {post.hero && (
          <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-md bg-muted">
            <Image
              src={post.hero}
              alt={post.title}
              fill
              loading="eager"
              fetchPriority="high"
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
            />
          </div>
        )}

        <div className="mt-8">
          <PortableBody value={post.body} />
        </div>

        {post.faq.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-semibold text-charcoal">FAQ</h2>
            <div className="mt-6">
              <FaqAccordion faq={post.faq} />
            </div>
          </div>
        )}

        <div className="mt-20 rounded-md bg-sage-50 p-8">
          <h2 className="text-2xl font-semibold text-charcoal">
            Get a new free print every month
          </h2>
          <EmailSignupForm source="blog-end" className="mt-4 max-w-xl" />
        </div>

        {relatedPosts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-semibold text-charcoal">More from the blog</h2>
            <div className="mt-6 grid gap-6 sm:grid-cols-3">
              {relatedPosts.map((related) => (
                <Link
                  key={related.slug}
                  href={`/blog/${related.slug}`}
                  className="group block overflow-hidden rounded-md bg-card transition-all duration-300 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] overflow-hidden rounded-md bg-muted">
                    {related.hero && (
                      <Image
                        src={related.hero}
                        alt={related.title}
                        fill
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                        sizes="(max-width: 640px) 100vw, 33vw"
                      />
                    )}
                  </div>
                  <div className="space-y-1 p-4">
                    <h3 className="line-clamp-2 text-base font-bold leading-snug text-charcoal">
                      {related.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
