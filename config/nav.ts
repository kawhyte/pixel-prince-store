/**
 * Site navigation (PLAN-44, shop-first). Category links filter /prints by the Sanity
 * `category` value; Sets filters by `kind`. Free prints stays a plain link, not the lead.
 */
export interface NavLink {
  label: string;
  href: string;
}

const NAV_ALL: NavLink[] = [
  { label: "All prints", href: "/prints" },
  { label: "Maps", href: "/prints?category=Maps" },
  { label: "Video games", href: "/prints?category=Video%20Games" },
  { label: "Sets", href: "/prints?kind=set" },
];

/** Sets only appears once one is for sale. See `primaryNav`. */
export const SETS_HREF = "/prints?kind=set";

/**
 * The primary links, minus any that lead nowhere.
 *
 * Sets was a permanent link to an empty grid. The filter chips on /prints already appear only
 * when something matches them, and this makes the nav agree: the link is absent while there are
 * no sets and returns on its own the day the first one is published, with nothing to remember.
 */
export function primaryNav(setCount: number): NavLink[] {
  return setCount > 0 ? NAV_ALL : NAV_ALL.filter((l) => l.href !== SETS_HREF);
}

/** Every primary link, whether or not it currently leads anywhere. Tests and sitemaps only. */
export const NAV_PRIMARY: NavLink[] = NAV_ALL;

export const NAV_SECONDARY: NavLink[] = [
  { label: "Free prints", href: "/free-downloads" },
];

/** Mobile menu only: links that live in the footer on desktop. */
export const NAV_MORE: NavLink[] = [
  { label: "About", href: "/about" },
  { label: "Shipping & returns", href: "/shipping-returns" },
];
