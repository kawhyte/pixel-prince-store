"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FreeArt } from "@/sanity/lib/client";
import ArtCard from "@/components/common/ArtCard/ArtCard";
import PixelIcon, {
  type PixelIconName,
} from "@/components/common/PixelIcon/PixelIcon";

interface FreeDownloadsClientProps {
  products: FreeArt[];
}

const STEPS: { icon: PixelIconName; title: string; body: string }[] = [
  {
    icon: "heart",
    title: "Pick a print",
    body: "Find one that feels like you.",
  },
  {
    icon: "download",
    title: "Enter your email",
    body: "We send a download link straight to your inbox.",
  },
  {
    icon: "star",
    title: "Print it",
    body: "Any size up to 16×20, at home or your local print shop.",
  },
];

export default function FreeDownloadsClient({ products }: FreeDownloadsClientProps) {
  return (
    <div className="min-h-screen bg-cream">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6 sm:py-8">
          {/* Back to Home */}
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-sage-500"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>

          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-charcoal sm:text-4xl lg:text-5xl">
              Free printable wall art
            </h1>
            <p className="mt-3 text-base text-soft-charcoal sm:text-lg">
              Free printable wall art delivered to your inbox: retro gaming prints, city maps, and minimalist pieces.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-12">
        {/* How the free prints work */}
        <div className="mb-12">
          <h2 className="text-center text-2xl font-bold text-charcoal sm:text-3xl">
            How the free prints work
          </h2>
          <div className="mx-auto mt-10 grid max-w-4xl gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-md bg-sage-50 text-sage-500">
                  <PixelIcon name={step.icon} size={20} />
                </div>
                <h3 className="mt-4 font-semibold text-charcoal">
                  {i + 1}. {step.title}
                </h3>
                <p className="mt-2 text-sm text-soft-charcoal">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Art Grid */}
        {products.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-12 text-center">
            <p className="text-lg text-muted-foreground">
              No free art available yet. Check back soon!
            </p>
          </div>
        ) : (
          <div className="grid gap-y-8 gap-x-10 sm:grid-cols-2 lg:grid-cols-3 lg:gap-y-10 lg:gap-x-14 xl:grid-cols-4">
            {products.map((art) => (
              <ArtCard
                key={art.id}
                art={art}
                href={`/art/${art.id}`}
                subtitle={art.category}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
              />
            ))}
          </div>
        )}

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-base text-muted-foreground sm:text-lg">
            Looking for more art?
          </p>
          <Link
            href="/"
            className="mt-4 inline-block rounded-2xl border-2 border-charcoal bg-transparent px-8 py-4 font-semibold text-charcoal transition-all hover:bg-charcoal hover:text-cream hover:shadow-lg"
          >
            Browse Full Collection
          </Link>
        </div>
      </main>
    </div>
  );
}
