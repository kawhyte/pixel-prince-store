/**
 * Buy now, through our own checkout instead of Fourthwall's (trial, 2026-10-11).
 *
 * `resolveCheckout` hands the button a plain href, so the session has to be made somewhere a link
 * can reach: this route makes it and redirects. The price is read from Sanity rather than taken
 * from the query string, because a price in a URL is a price the buyer can edit.
 */
import { NextRequest, NextResponse } from "next/server";
import { client, getShopPrintBySlug } from "@/sanity/lib/client";
import { getStripe, stripeUnavailable } from "@/lib/stripe";
import { CURRENCY } from "@/config/commerce";
import { getActiveOffer, offerImage } from "@/lib/commerce";
import { SHOP_SIZE_LADDER } from "@/config/commerce";

export const dynamic = "force-dynamic";

function bad(message: string, status = 400) {
  console.error("[STRIPE-CHECKOUT]", message);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: NextRequest) {
  const off = stripeUnavailable();
  if (off) return bad(off, 503);
  const stripe = getStripe();
  if (!stripe) return bad("Stripe is not configured", 503);

  const p = request.nextUrl.searchParams;
  const [variant, sizeId] = [p.get("variant"), p.get("size")];
  if (!variant || !sizeId) return bad("variant and size are both required");

  // Which print this is comes from the variant id, not from the URL. `resolveCheckout` hands the
  // button an href and never knew the slug, and asking Sanity which offer owns this variant is the
  // stronger check anyway: a variant that belongs to no published print cannot be bought at all.
  const slug = await client.fetch<string | null>(
    `*[_type == "product" && listing == "shop" && $variant in offers[].sizes[].providerVariantId][0].slug.current`,
    { variant } as Record<string, string>,
  );
  if (!slug) return bad("no published print sells that variant", 404);

  const art = await getShopPrintBySlug(slug);
  if (!art) return bad(`no shop print called ${slug}`, 404);

  const offer = getActiveOffer(art, (p.get("finish") as never) ?? null, p.get("version"));
  if (!offer || offer.provider !== "stripe") return bad(`${slug} has no Stripe offer for that finish`, 409);

  // The price comes from the offer, never the query string.
  const row = (offer.sizes ?? []).find((s) => s.sizeId === sizeId);
  if (!row) return bad(`${slug} does not sell ${sizeId}`);
  if (row.providerVariantId !== variant) return bad("that variant does not belong to this size", 409);
  if (!Number.isFinite(row.priceCents) || row.priceCents <= 0) return bad(`${sizeId} has no price`);

  const label = SHOP_SIZE_LADDER.find((s) => s.id === sizeId)?.label ?? sizeId;
  const finishWord = offer.finish === "framed" ? "Framed" : offer.finish === "canvas" ? "Canvas" : "Unframed";
  const name = [art.title, offer.version, `${label} ${finishWord}`].filter(Boolean).join(" - ");
  const image = offerImage(offer) ?? art.detailImage ?? art.previewImage;
  const origin = request.nextUrl.origin;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: CURRENCY.toLowerCase(),
            unit_amount: row.priceCents,
            product_data: { name, ...(image ? { images: [image] } : {}) },
          },
        },
      ],
      // Printful needs somewhere to send it, and Stripe is the only place it is asked for.
      shipping_address_collection: { allowed_countries: ["US"] },
      // Everything the fulfilment step needs, so it never has to guess what was bought.
      metadata: {
        printSlug: slug,
        sizeId,
        printfulVariantId: variant,
        finish: offer.finish ?? "unframed",
        version: offer.version ?? "",
        artUrl: offer.artUrl ?? "",
        campaign: p.get("campaign") ?? "",
      },
      success_url: `${origin}/checkout/complete?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/prints/${slug}`,
    });
    if (!session.url) return bad("Stripe returned a session with no URL", 502);
    return NextResponse.redirect(session.url, 303);
  } catch (e) {
    return bad(e instanceof Error ? e.message : String(e), 502);
  }
}
