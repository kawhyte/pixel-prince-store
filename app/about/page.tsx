import Image from "next/image";

import { generateMetadata as buildMetadata, generateAboutPageSchema } from "@/lib/seo";
import EmailSignupForm from "@/components/common/EmailSignupForm/EmailSignupForm";
import Link from "next/link";

export const metadata = buildMetadata({
  title: "About Kenny & Rene | The Pixel Prince",
  description:
    "Meet Kenny and Rene, the husband-and-wife duo behind The Pixel Prince: retro gaming and map wall art inspired by world travel and retro nostalgia.",
  canonical: "https://www.thepixelprince.com/about",
  noIndex: false,
});

export default function AboutPage() {
  const aboutSchema = generateAboutPageSchema();

  return (
    <div className="min-h-screen bg-cream">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(aboutSchema) }}
      />

      {/* 1. Photo-led hero */}
      <section className="bg-sage-50 py-16 sm:py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="mb-8 flex items-center justify-center">
            {/* TODO(KENNY): swap avatars for a real photo of Kenny & Rene */}
            <div className="relative h-28 w-28 overflow-hidden rounded-full border-4 border-cream bg-cream sm:h-36 sm:w-36">
              <Image
                src="/about/avatar_mr.png"
                alt="Kenny"
                fill
                sizes="(min-width: 640px) 144px, 112px"
                className="object-contain"
              />
            </div>
            <div className="relative -ml-6 h-28 w-28 overflow-hidden rounded-full border-4 border-cream bg-cream sm:h-36 sm:w-36">
              <Image
                src="/about/avatar_mrs.png"
                alt="Rene"
                fill
                sizes="(min-width: 640px) 144px, 112px"
                className="object-contain"
              />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-charcoal sm:text-4xl lg:text-5xl">
            The humans behind the pixels
          </h1>
        
        </div>
      </section>

      {/* 2. Story section */}
      <section className="container mx-auto px-4 py-16">
        <div className="mx-auto max-w-2xl">
          <div className="space-y-4 text-base leading-relaxed text-soft-charcoal">
            <p>
              We&apos;re Kenny and Rene: married, perpetually planning the next
              trip, and the two people behind every print here. Everything is
              designed by hand in Affinity and Photoshop. No templates, no AI
              art, just us, arguing pleasantly about color palettes.
            </p>
            <p>
              Most pieces start somewhere real. We&apos;ve been to 18-plus
              countries together (Japan, Jakarta, Copenhagen, Jamaica) and we
              write about those trips on our travel blog,{" "}
              <a
                href="https://www.meetthewhytes.com/"
                target="_blank"
                rel="noopener"
                className="underline hover:text-sage-500"
              >
                Meet the Whytes
              </a>
              . Kenny has also made it to every NBA arena in the league, and
              more than a few of those trips came home as a print. The rest is
              pure nostalgia: the consoles we grew up on, and the specific joy
              of a skyline built out of fat little pixels.
            </p>
            <p>
              Every design ends up here, free to download and print. If one of
              them makes your wall feel more like you, that&apos;s the whole
              point.
            </p>
          </div>
        </div>
      </section>

      {/* 3. CTA band */}
      <section className="bg-sage-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-charcoal sm:text-4xl lg:text-5xl">
              Say hi, or take a print home
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-soft-charcoal">
              New free print every month. The printed versions ship free in
              the US.
            </p>
          </div>

          <div className="mx-auto max-w-xl rounded-2xl bg-cream p-8 text-center shadow-card">
            <h3 className="text-xl font-semibold text-charcoal">
              Printed prints, shipped to you
            </h3>
            <p className="mt-2 text-sm text-soft-charcoal">
              Retro gaming and map prints, printed to order, free US shipping
            </p>
            <Link
              href="/prints"
              className="mt-6 inline-block rounded-2xl bg-sage-500 px-6 py-3 font-semibold text-white transition-all hover:bg-sage-400 hover:shadow-card-hover"
            >
              Browse the prints
            </Link>

            <div className="mt-8 border-t border-border pt-8">
              <p className="mb-4 text-sm text-soft-charcoal">
                One free print a month. No spam, Player 2&apos;s honor.
              </p>
              <EmailSignupForm source="about" />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
