import Link from "next/link";

import { generateMetadata as buildMetadata } from "@/lib/seo";
import { LICENSE_SUMMARY } from "@/config/license";
import { ORDER_PROCESSOR, ORDER_PROCESSOR_TERMS_URL, SUPPORT_EMAIL } from "@/config/support";

export const metadata = buildMetadata({
  title: "Terms of Use",
  noIndex: false,
});

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-bold text-charcoal sm:text-4xl">
        Terms of Use
      </h1>
      <p className="mt-4 text-sm text-soft-charcoal">
        Effective date: September 8, 2026
      </p>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          Acceptance of terms
        </h2>
        <p className="text-soft-charcoal">
          By downloading a free print or buying a printed print from The Pixel Prince, you
          agree to these terms. If you don&apos;t agree, please don&apos;t use the site.
        </p>
      </section>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          Personal-use license
        </h2>
        <p className="text-soft-charcoal">{LICENSE_SUMMARY}</p>

        <p className="mb-2 mt-6 font-semibold text-charcoal">You can:</p>
        <ul className="list-disc space-y-1 pl-6 text-soft-charcoal">
          <li>Print this art for your own home, office, or classroom</li>
          <li>Print a copy as a gift for a friend or family member</li>
          <li>Print at home or through any print shop (Staples, Costco, etc.)</li>
        </ul>

        <p className="mb-2 mt-6 font-semibold text-charcoal">You cannot:</p>
        <ul className="list-disc space-y-1 pl-6 text-soft-charcoal">
          <li>Sell the file or prints of it</li>
          <li>
            Redistribute the file (email it around, re-upload it, share the download
            link publicly)
          </li>
          <li>Use it in commercial products, print-on-demand shops, or client work</li>
          <li>Claim it as your own work</li>
        </ul>

        <p className="mt-6 text-soft-charcoal">
          Buying a printed print gives you that physical print to display, gift, or resell as
          an object. It does not include a license to reproduce the artwork.
        </p>
      </section>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          Purchases
        </h2>
        <p className="text-soft-charcoal">
          Printed prints are sold through {ORDER_PROCESSOR}, which is the merchant of record:
          it appears as the seller on your receipt, processes your payment, calculates any
          sales tax at checkout, and sends your confirmation and tracking emails. Prices are in
          US dollars. Payment and refund handling is governed by{" "}
          <a href={ORDER_PROCESSOR_TERMS_URL} className="underline hover:text-sage-500" rel="noopener" target="_blank">
            {ORDER_PROCESSOR}&apos;s terms
          </a>
          . Shipping times, damage replacements, and returns are described on our{" "}
          <Link href="/shipping-returns" className="underline hover:text-sage-500">
            shipping and returns page
          </Link>
          .
        </p>
      </section>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          No warranty
        </h2>
        <p className="text-soft-charcoal">
          Free files are provided &quot;as is,&quot; with no warranty of any kind. We do our best
          to ensure quality, but we can&apos;t guarantee a file will be free of errors or
          suitable for every printer or print shop.
        </p>
      </section>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          Ownership
        </h2>
        <p className="text-soft-charcoal">
          Every piece is designed by Kenny, The Pixel Prince. All artwork remains our
          intellectual property; downloading a file does not transfer ownership or
          copyright to you.
        </p>
      </section>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          Changes to these terms
        </h2>
        <p className="text-soft-charcoal">
          We may update these terms occasionally. Continued use of the site after a
          change means you accept the updated terms.
        </p>
      </section>

      <section>
        <h2 className="mb-3 mt-10 text-2xl font-semibold text-charcoal">
          Contact
        </h2>
        <p className="text-soft-charcoal">
          Questions? Email{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} className="underline hover:text-sage-500">
            {SUPPORT_EMAIL}
          </a>
          . See also our{" "}
          <Link href="/privacy" className="underline hover:text-sage-500">
            Privacy Policy
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
