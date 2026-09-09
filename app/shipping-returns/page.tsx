import Link from "next/link";

import { generateMetadata as seoMeta } from "@/lib/seo";
import { SHOP_SHIPPING_FAQ } from "@/config/shop-copy";
import { DAMAGE_CLAIM_DAYS, ORDER_PROCESSOR, SUPPORT_EMAIL, SUPPORT_RESPONSE } from "@/config/support";
import FaqAccordion from "@/components/common/FaqAccordion/FaqAccordion";

export const metadata = seoMeta({
  title: "Shipping and returns",
  description:
    "Free US shipping on every print. Printed to order, arrives in 5 to 11 days. Damaged prints are reprinted free.",
  canonical: "https://www.thepixelprince.com/shipping-returns",
});

const h2 = "mb-3 mt-10 text-2xl font-semibold text-charcoal";
const p = "text-soft-charcoal";

export default function ShippingReturnsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-charcoal sm:text-4xl">Shipping and returns</h1>
      <p className="mt-4 text-sm text-soft-charcoal">
        Applies to printed prints bought on this site. Free downloads have no shipping, they arrive by email.
      </p>

      <section>
        <h2 className={h2}>Where we ship</h2>
        <p className={p}>
          United States only for now, and shipping is free on every order. International shipping is on the
          list; join the email list and you will hear when it opens.
        </p>
      </section>

      <section>
        <h2 className={h2}>How long it takes</h2>
        <p className={p}>
          Every print is made to order. Orders arrive within 5 to 11 days of being placed, printing included.
          You get a confirmation email right away and a tracking email from {ORDER_PROCESSOR} when it ships.
        </p>
      </section>

      <section>
        <h2 className={h2}>Packaging</h2>
        <p className={p}>
          Prints ship unframed, flat in a rigid mailer or rolled in a tube depending on size, so you can pick
          the frame that fits your wall. All five sizes match standard off-the-shelf frames.
        </p>
      </section>

      <section>
        <h2 className={h2}>Damaged or wrong print</h2>
        <p className={p}>
          If a print arrives bent, torn, or is not what you ordered, email a photo to{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-sage-500">
            {SUPPORT_EMAIL}
          </a>{" "}
          within {DAMAGE_CLAIM_DAYS} days of delivery. We reprint and reship it free. No need to send the
          damaged one back.
        </p>
      </section>

      <section>
        <h2 className={h2}>Returns</h2>
        <p className={p}>
          Because every print is made just for you, we cannot take returns for a change of mind or a size
          picked in error. Damaged, misprinted, or wrong-item orders are always replaced. If you are unsure
          about a size, the size guide on every print page says which wall each one suits.
        </p>
      </section>

      <section>
        <h2 className={h2}>Who charges you</h2>
        <p className={p}>
          Checkout and payment are handled by {ORDER_PROCESSOR}, which appears as the seller on your receipt,
          calculates any sales tax at checkout, and sends your confirmation and tracking emails. Payment and
          refund questions can go to {ORDER_PROCESSOR} support or to us; we coordinate either way.
        </p>
      </section>

      <section>
        <h2 className={h2}>Contact</h2>
        <p className={p}>
          Anything else, email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-sage-500">
            {SUPPORT_EMAIL}
          </a>
          . We reply {SUPPORT_RESPONSE}. See also our{" "}
          <Link href="/terms" className="underline hover:text-sage-500">
            terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-sage-500">
            privacy policy
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className={h2}>Quick answers</h2>
        <FaqAccordion faq={[...SHOP_SHIPPING_FAQ]} />
      </section>
    </div>
  );
}
