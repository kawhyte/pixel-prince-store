/**
 * Site navigation (PLAN-44, shop-first). Category links filter /prints by the Sanity
 * `category` value; Sets filters by `kind`. Free prints stays a plain link, not the lead.
 */
export interface NavLink {
  label: string;
  href: string;
}

export const NAV_PRIMARY: NavLink[] = [
  { label: "All prints", href: "/prints" },
  { label: "Maps", href: "/prints?category=Maps" },
  { label: "Video games", href: "/prints?category=Video%20Games" },
  { label: "Sets", href: "/prints?kind=set" },
];

export const NAV_SECONDARY: NavLink[] = [
  { label: "Free prints", href: "/free-downloads" },
  { label: "About", href: "/about" },
];
