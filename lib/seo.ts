import type { Metadata } from 'next';
import seoConfig from '@/config/seo.json';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  image?: string;
  noIndex?: boolean;
  canonical?: string;
}

/**
 * Generate metadata for a page with global defaults from config/seo.json
 */
export function generateMetadata({
  title,
  description,
  keywords,
  image,
  noIndex = false,
  canonical,
}: SEOProps = {}): Metadata {
  const pageTitle = title
    ? `${title} | ${seoConfig.applicationName}`
    : seoConfig.title.default;

  const pageDescription = description || seoConfig.description;
  const pageKeywords = keywords || seoConfig.keywords;
  const pageImage = image || seoConfig.openGraph.images[0].url;

  const baseUrl = seoConfig.metadataBase;

  return {
    title: pageTitle,
    description: pageDescription,
    keywords: pageKeywords,
    authors: seoConfig.authors,
    creator: seoConfig.creator,
    publisher: seoConfig.publisher,
    metadataBase: new URL(baseUrl),
    alternates: {
      canonical: canonical || baseUrl,
    },
    openGraph: {
      type: seoConfig.openGraph.type as 'website',
      locale: seoConfig.openGraph.locale,
      siteName: seoConfig.openGraph.siteName,
      title: title || seoConfig.openGraph.title,
      description: pageDescription,
      images: [
        {
          url: pageImage,
          width: seoConfig.openGraph.images[0].width,
          height: seoConfig.openGraph.images[0].height,
          alt: seoConfig.openGraph.images[0].alt,
        },
      ],
      url: canonical || baseUrl,
    },
    twitter: {
      card: 'summary_large_image',
      site: seoConfig.twitter.site,
      creator: seoConfig.twitter.creator,
      title: title || seoConfig.twitter.title,
      description: pageDescription,
      images: [pageImage],
    },
    robots: noIndex
      ? {
          index: false,
          follow: false,
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
  };
}

/**
 * Serialize a JSON-LD object for a <script> tag. Escapes "<" so a "</script>" in Studio text
 * cannot close the tag early.
 */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

/**
 * Generate Organization Schema JSON-LD for the website
 */
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'The Pixel Prince',
    url: seoConfig.metadataBase,
    logo: `${seoConfig.metadataBase}/android-chrome-512x512.png`,
    sameAs: [
      'https://thepixelprince.etsy.com',
      'https://pixelprinceprintable.etsy.com',
    ],
  };
}

/**
 * Generate AboutPage Schema JSON-LD (mainEntity → Person) for /about
 */
export function generateAboutPageSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'AboutPage',
    url: `${seoConfig.metadataBase}/about`,
    mainEntity: {
      '@type': 'Person',
      name: 'Kenny Whyte',
      jobTitle: 'Designer',
      worksFor: generateOrganizationSchema(),
      sameAs: [
        'https://www.meetthewhytes.com/',
        'https://thepixelprince.etsy.com',
        'https://pixelprinceprintable.etsy.com',
      ],
    },
  };
}

/**
 * Generate WebSite Schema JSON-LD. No SearchAction: the site has no search page to point it at.
 */
export function generateWebsiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'The Pixel Prince',
    url: seoConfig.metadataBase,
  };
}
