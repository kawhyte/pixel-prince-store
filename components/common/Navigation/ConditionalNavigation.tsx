'use client';

import { usePathname } from 'next/navigation';
import Navigation from './Navigation';
import type { NavLink } from '@/config/nav';

/**
 * ConditionalNavigation Component
 *
 * Renders the site navigation ONLY on non-Sanity Studio routes.
 * This prevents the site header from appearing in Sanity Studio.
 */
export default function ConditionalNavigation({ primary }: { primary?: NavLink[] }) {
  const pathname = usePathname();

  // Hide navigation on Sanity Studio routes
  if (pathname?.startsWith('/studio')) {
    return null;
  }

  return <Navigation primary={primary} />;
}
