"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import Wordmark from "@/components/common/Wordmark/Wordmark";
import { NAV_MORE, NAV_PRIMARY, NAV_SECONDARY } from "@/config/nav";
import CartButton from "@/components/common/Cart/CartButton";

/**
 * Shop-first nav (PLAN-44): logo, category links in the middle, Free prints + About on the right.
 * Categories filter /prints. Free prints is a plain link by decision, not the lead.
 */
export default function Navigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lock body scroll while the mobile menu overlay is open.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileMenuOpen]);

  const desktopLink = "font-sans text-sm font-medium text-charcoal transition-colors hover:text-sage-500";
  const mobileLink =
    "rounded-md px-4 py-3 font-sans text-base font-medium text-charcoal transition-colors hover:bg-sage-100 hover:text-sage-500";

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-border/50 bg-cream/95 backdrop-blur-sm">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between gap-6">
            <Link href="/" className="group z-50 shrink-0">
              <Wordmark className="text-xl transition-colors group-hover:text-sage-500 sm:text-2xl" />
            </Link>

            {/* Desktop: categories in the middle */}
            <div className="hidden items-center gap-6 md:flex lg:gap-8">
              {NAV_PRIMARY.map((l) => (
                <Link key={l.href} href={l.href} className={desktopLink}>
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Desktop: secondary + cart on the right */}
            <div className="hidden items-center gap-4 md:flex">
              {NAV_SECONDARY.map((l) => (
                <Link key={l.href} href={l.href} className={desktopLink}>
                  {l.label}
                </Link>
              ))}
              <CartButton />
            </div>

            {/* Mobile: cart + menu button */}
            <div className="flex items-center gap-1 md:hidden">
              <CartButton />
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="z-50 flex size-11 items-center justify-center rounded-md text-charcoal transition-colors hover:bg-sage-100"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile menu, outside nav to escape the backdrop-filter stacking context */}
      <div
        className={`fixed inset-0 top-16 z-40 transform bg-background transition-transform duration-300 md:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex flex-col space-y-1 p-4">
          <p className="px-4 pb-1 pt-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Shop</p>
          {NAV_PRIMARY.map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setIsMobileMenuOpen(false)} className={mobileLink}>
              {l.label}
            </Link>
          ))}
          <p className="px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">More</p>
          {[...NAV_SECONDARY, ...NAV_MORE].map((l) => (
            <Link key={l.href} href={l.href} onClick={() => setIsMobileMenuOpen(false)} className={mobileLink}>
              {l.label}
            </Link>
          ))}
        </div>
      </div>

      {isMobileMenuOpen && (
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 top-16 z-30 bg-black/20 backdrop-blur-sm md:hidden"
        />
      )}
    </>
  );
}
