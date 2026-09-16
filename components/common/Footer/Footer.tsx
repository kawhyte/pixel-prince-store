import Link from "next/link";
import { ETSY_MAIN_SHOP, etsyUrl } from "@/config/links";
import { SUPPORT_EMAIL } from "@/config/support";
import EtsyLink from "@/components/common/EtsyLink/EtsyLink";
import Wordmark from "@/components/common/Wordmark/Wordmark";

const linkClass =
  "text-cream/70 transition-colors hover:text-cream";

export default function Footer() {
  return (
    <footer className="border-t border-border/50 bg-charcoal text-cream">
      <div className="container mx-auto px-4 py-14 sm:py-20">
        {/* Main Footer Grid */}
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-5 lg:gap-12">
          {/* Column 1: Brand */}
          <div className="space-y-4 lg:col-span-2">
            <Wordmark className="text-xl text-cream sm:text-2xl" />
            <p className="max-w-xs text-sm leading-relaxed text-cream/60">
              Retro gaming and map art, designed by humans. Free prints to download,
              printed prints shipped free in the US.
            </p>
            <div className="flex gap-4 pt-1">
              <Link
                href="https://pinterest.com/thepixelprince/"
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
                aria-label="Pinterest"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 0c-6.627 0-12 5.372-12 12 0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738.098.119.112.224.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146 1.124.347 2.317.535 3.554.535 6.627 0 12-5.373 12-12 0-6.628-5.373-12-12-12z" />
                </svg>
              </Link>
              <EtsyLink
                href={etsyUrl(ETSY_MAIN_SHOP, "footer")}
                className={linkClass}
                aria-label="Etsy"
              >
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16.875 5.5h3.563l.313 4.313h-.625c-.438-1.626-1.25-2.938-2.438-2.938h-1.563v8.75c0 1.063.5 1.375 1.563 1.375h.313v.625h-5.313V17h.313c1.063 0 1.563-.313 1.563-1.375v-8.75h-1.563c-1.188 0-2 1.313-2.438 2.938h-.625l.313-4.313h6.624zM12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
                </svg>
              </EtsyLink>
            </div>
          </div>

          {/* Column 2: Shop */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cream/90">Shop</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/free-downloads" className={linkClass}>
                  Free Downloads
                </Link>
              </li>
              <li>
                <Link href="/prints" className={linkClass}>
                  Prints
                </Link>
              </li>
              <li>
                <Link href="/shipping-returns" className={linkClass}>
                  Shipping &amp; Returns
                </Link>
              </li>
              <li>
                <Link href="/blog" className={linkClass}>
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Collections */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cream/90">Collections</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/collections/game-room-wall-art" className={linkClass}>
                  Game Room Wall Art
                </Link>
              </li>
              <li>
                <Link href="/collections/retro-gaming-prints" className={linkClass}>
                  Retro Gaming Prints
                </Link>
              </li>
              <li>
                <Link href="/collections/map-prints" className={linkClass}>
                  Map Prints
                </Link>
              </li>
              <li>
                <Link href="/collections/basketball-wall-art" className={linkClass}>
                  Basketball Wall Art
                </Link>
              </li>
              <li>
                <Link href="/collections/printable-wall-art" className={linkClass}>
                  Printable Wall Art
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Company */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-cream/90">Company</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <Link href="/about" className={linkClass}>
                  About
                </Link>
              </li>
              <li>
                <a href={`mailto:${SUPPORT_EMAIL}`} className={linkClass}>
                  Contact
                </a>
              </li>
              <li>
                <Link href="/privacy" className={linkClass}>
                  Privacy
                </Link>
              </li>
              <li>
                <Link href="/terms" className={linkClass}>
                  Terms &amp; License
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Trust line */}
        <p className="mt-12 border-t border-cream/10 pt-8 text-sm text-cream/70">
          Printed in the USA · Free US shipping · 7,000+ prints shipped since 2009
        </p>

        {/* Bottom Bar */}
        <div className="mt-8 flex flex-col items-center justify-between gap-2 text-xs text-cream/50 sm:flex-row">
          <p>© {new Date().getFullYear()} The Pixel Prince. All rights reserved.</p>
          <p>Made by two humans in the USA.</p>
        </div>
      </div>
    </footer>
  );
}
