/**
 * This route is responsible for the built-in authoring environment using Sanity Studio.
 * All routes under your studio path is handled by this file using Next.js' catch-all routes:
 * https://nextjs.org/docs/routing/dynamic-routes#catch-all-routes
 *
 * You can learn more about the next-sanity package here:
 * https://github.com/sanity-io/next-sanity
 */

'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { StudioThemeColorSchemeKey } from 'sanity'
import config from '../../../sanity.config'

/**
 * Studio does not server-render. It is an authenticated single-page app, so SSR buys it nothing
 * and costs a hydration mismatch on every load: Sanity is built on styled-components, whose class
 * names are generated from a counter as modules evaluate, and the server and the browser do not
 * evaluate the same set in the same order. React reported that on Sanity's own loading spinner:
 *
 *   + className="sc-fujAOF fPgbiH"     (client)
 *   - className="sc-dGzUtw dYuLtJ"     (server)
 *
 * next.config's `compiler.styledComponents` is the usual cure and cannot work here, because it
 * transforms our source and Sanity ships prebuilt in node_modules. Sending no markup at all
 * leaves nothing to disagree about.
 */
const NextStudio = dynamic(() => import('next-sanity/studio').then((m) => m.NextStudio), {
  ssr: false,
  loading: () => null,
})

const STORAGE_KEY = 'pp_studio_scheme'

function readStoredScheme(): StudioThemeColorSchemeKey {
  if (typeof window === 'undefined') return 'dark'
  const saved = window.localStorage.getItem(STORAGE_KEY)
  return saved === 'light' || saved === 'dark' || saved === 'system' ? saved : 'dark'
}

export default function StudioPage() {
  // Safe to read storage in the initializer: with Studio client-only, the server renders nothing
  // here, so this value never appears in HTML for hydration to disagree with.
  const [scheme, setScheme] = useState<StudioThemeColorSchemeKey>(readStoredScheme)

  const handleSchemeChange = (next: StudioThemeColorSchemeKey) => {
    setScheme(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }

  return <NextStudio config={config} scheme={scheme} onSchemeChange={handleSchemeChange} />
}
