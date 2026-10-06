'use client'

/**
 * This configuration is used to for the Sanity Studio that’s mounted on the `/app/studio/[[...tool]]/page.tsx` route
 */

import {visionTool} from '@sanity/vision'
import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'

// Go to https://www.sanity.io/docs/api-versioning to learn how API versioning works
import {apiVersion, dataset, projectId} from './sanity/env'
import {schema} from './sanity/schemaTypes'
import {structure} from './sanity/structure'
import StudioIcon from './sanity/components/StudioIcon'
import {analyticsTool} from './sanity/tools/analytics'
// PLAN-13 fallback #1: the `buildLegacyTheme` palette in ./sanity/theme.ts is an
// older theming layer that overrides `scheme` and suppresses the Appearance menu.
// Removed so the light/dark toggle works. Brand accent colors are sacrificed.
// import {pixelPrinceTheme} from './sanity/theme'

// NOTE: sanity-plugin-media requires sanity ^5 || ^6.0.0-0; this project is
// pinned to sanity ^4.19.0, so it can't be installed. Use the built-in asset
// picker (click "Select" on any image field) to browse all uploaded media.
export default defineConfig({
  name: 'default',
  title: 'The Pixel Prince — Studio',
  icon: StudioIcon,
  basePath: '/studio',
  projectId,
  dataset,
  // Add and edit the content schema in the './sanity/schemaTypes' folder
  schema,
  plugins: [
    structureTool({structure}),
    // Vision is for querying with GROQ from inside the Studio
    // https://www.sanity.io/docs/the-vision-plugin
    visionTool({defaultApiVersion: apiVersion}),
  ],
  // Analytics sits in the top bar next to Structure, so checking Umami is one click away.
  tools: (prev) => [...prev, analyticsTool],
})
