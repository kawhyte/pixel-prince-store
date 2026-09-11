/**
 * Homepage copy (PLAN-44, shop-first). Display strings only.
 */

import { DELIVERY_WINDOW } from "@/config/support";
import { SIZE_RANGE_SENTENCE } from "@/config/commerce";

export const HOME_HERO = {
  headline: "Art for your walls. Printed and shipped free.",
  sub: "Premium-quality retro gaming and map prints, drawn by two humans and printed to order on museum-grade matte paper.",
  cta: "Shop all prints",
  secondary: "Or get a free print every month",
} as const;

/** Four-up strip under the hero. Icons are picked by index in app/page.tsx. */
export const HOME_TRUST = [
  { label: "Free US shipping", sub: "on every print" },
  { label: `Arrives in ${DELIVERY_WINDOW}`, sub: "printed to order" },
  { label: "Damage guarantee", sub: "reprinted free" },
  { label: "7,000+ prints shipped", sub: "since 2009" },
] as const;

export const HOME_CALLOUTS = [
  {
    title: "Designed by humans",
    body: "Every piece is drawn by Kenny and Rene, not pulled from a generator. Retro palettes, real places, small details you keep finding.",
  },
  {
    title: "Premium quality, every print",
    body: "189 gsm museum-grade matte paper, glare-free, archival inks. Made to order in the USA and shipped flat or in a tube.",
  },
  {
    title: "Trusted by 1,900+ buyers",
    body: "4.9 stars across seven years of orders. Arrives bent? Send a photo and we reprint it free.",
  },
] as const;

export const HOME_BAND = {
  eyebrow: "Build a wall",
  headline: "One looks good. Two look intentional.",
  body: "Pairs and sets are made to hang together: matched palettes, matched sizes, one frame run.",
  cta: "Shop sets",
  href: "/prints?kind=set",
} as const;

export const HOME_FREE = {
  eyebrow: "Try before you buy",
  headline: "A free print every month",
  body: "Every free print is the real thing: one high-res file, print it at home or at a shop, personal use. No card, just an email.",
  cta: "See all free prints",
} as const;

/** Short SEO block near the bottom, three columns. */
export const HOME_SEO = {
  headline: "Premium-quality retro gaming and map wall art, printed to order",
  columns: [
    {
      title: "Game room wall art",
      body: "Controllers, consoles, 8-bit palettes and patent-style blueprints, drawn to read as gaming without leaning on any one franchise. Sized for a desk wall or the space behind the TV.",
    },
    {
      title: "Map prints",
      body: "City neighborhoods, state outlines and world maps in muted colors that sit quietly on a wall. Hometowns, trips, the place you met.",
    },
    {
      title: "Premium quality, printed the right way",
      body: `${SIZE_RANGE_SENTENCE}, all matching standard frames. Museum-grade matte paper, made to order in the USA, free US shipping, and a free reprint if it arrives damaged.`,
    },
  ],
} as const;
