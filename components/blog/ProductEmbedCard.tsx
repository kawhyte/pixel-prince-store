import Image from "next/image";
import Link from "next/link";
import type { EmbeddedProduct } from "@/sanity/lib/blog";
import { cardCommerce } from "@/lib/commerce";

interface ProductEmbedCardProps {
  product: EmbeddedProduct | null;
  note?: string;
}

export default function ProductEmbedCard({ product, note }: ProductEmbedCardProps) {
  if (!product) return null;

  const card = cardCommerce({ id: product.slug, listing: product.listing ?? "free", offers: product.offers ?? [] });
  const isShop = product.listing === "shop";

  return (
    <div className="my-8 flex gap-4 rounded-md border border-border bg-card p-4">
      {product.previewImage && (
        <div className="relative h-[160px] w-[120px] shrink-0 overflow-hidden rounded-md bg-muted">
          <Image
            src={product.previewImage}
            alt={product.title}
            fill
            className="object-cover"
            sizes="120px"
          />
        </div>
      )}
      <div className="flex flex-col justify-center gap-2">
        <h4 className="text-lg font-semibold text-charcoal">{product.title}</h4>
        {note && <p className="text-sm text-soft-charcoal">{note}</p>}
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
          {isShop ? (
            <Link href={card.href} className="text-sm font-medium text-sage-600 hover:text-sage-700">
              {card.value ? `Buy the print, ${card.value.toLowerCase()}` : "See the print"}
            </Link>
          ) : (
            <>
              <Link href={card.href} className="text-sm font-medium text-sage-600 hover:text-sage-700">
                Free download
              </Link>
              <Link href="/prints" className="text-sm font-medium text-sage-600 hover:text-sage-700">
                Browse the prints
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
