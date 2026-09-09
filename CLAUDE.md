# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Response Style
- Be strictly token-efficient: no filler, no preamble, no summaries.
- Output only necessary code changes — no surrounding context unless critical.
- Skip explanations unless the logic is non-obvious.

## Project Overview

The Pixel Prince Store is a Next.js 16 (App Router) digital art store powered by Sanity CMS. The core feature is a free art download system: each artwork has ONE master print file, gated behind an email capture with a signed 72-hour download link and a rolling 7-day limit (3 downloads/week) tracked per email in Sanity. Content is managed through Sanity CMS, with the print file hosted on Cloudinary.

**Tech Stack:**
- Next.js 16 (App Router, React 19, TypeScript)
- Sanity CMS (content management, v4)
- Cloudinary (asset hosting)
- Tailwind CSS v4 (styling)
- Resend (email delivery) + signed JWT download links (`lib/download-token.ts`)
- Google Gemini AI (description generation in Sanity Studio)

## Key Commands

### Development
```bash
npm run dev              # Start dev server on http://localhost:3000
npx tsc --noEmit         # Type check without building
npm run lint             # Run ESLint
```

### Build & Deploy
```bash
npm run build            # Build for production (includes sitemap generation)
npm start                # Start production server
```

### Sanity CMS
```bash
npx sanity start         # Start Sanity Studio (standalone, not needed - use /studio route)
npx sanity deploy        # Deploy Sanity Studio
npx sanity dataset import <file> <dataset>  # Import data
npx sanity dataset export <dataset> <file>  # Export data
```

### Utilities
```bash
npm run generate-zips    # [DEPRECATED] Generate ZIP bundles (not used with Cloudinary)
```

**Note:** The `generate-zips` script is deprecated and not used in the current Cloudinary-based architecture. ZIP files are now hosted directly on Cloudinary or external services.

## Architecture

### Content Flow

1. **Sanity CMS** (`/studio` route at `/app/studio/[[...tool]]/page.tsx`)
   - Content editors create/edit art products via five numbered tabs (see `docs/ADDING-NEW-ART.md`)
   - Upload preview images (600×800) and detail images (1200×1600) to Sanity
   - Upload the ONE print file to Cloudinary via custom input component (`sanity/components/HighResAssetInput.tsx`)
   - Use AI generator to create descriptions (Gemini API)
   - Curated sidebar (`sanity/structure.ts`): Artworks, Blog Posts, Subscribers. Studio forced into dark mode (`scheme="dark"` on `NextStudio`).

2. **Data Layer** (`sanity/lib/client.ts`)
   - `getAllProducts()`: Fetch all products for gallery
   - `getProductBySlug(slug)`: Fetch single product for detail page
   - `getFeaturedProduct()`: Fetch the homepage hero print
   - Transforms Sanity data to `FreeArt` interface
   - Uses `urlFor()` helper for image URLs

3. **Frontend Pages**
   - `/free-downloads` → Gallery of all free art (`app/free-downloads/page.tsx`)
   - `/art/[id]` → Art detail page with print-size info chips + one download button (`app/art/[id]/page.tsx`)
   - Static generation at build time via `generateStaticParams()`

4. **Download flow** (email-gated, signed links — no cookies)
   - `EmailGateDialog` posts `{ email, artId, consent }` to `/api/request-download`
   - `/api/request-download` (`app/api/request-download/route.ts`): validates email + weekly limit (per-email, via `lib/subscriber-store.ts`), signs a 72-hour JWT (`lib/download-token.ts`), emails the link (Resend, `lib/email.ts`)
   - `/api/claim-art` (`app/api/claim-art/route.ts`): verifies the token, builds the ZIP on the fly (`lib/build-download-zip.ts`: master PNG + `assets/download-extras/*`), streams it, increments `downloads` in Sanity

### Sanity Schema

**Product Schema** (`sanity/schemaTypes/product.ts`) — grouped into five tabs (① Details, ② Images, ③ Print File, ④ Shop & Tags, ⑤ Stats):
```typescript
{
  title: string
  slug: slug
  artist: string (default: "The Pixel Prince")
  previewImage: image (600×800 for gallery cards)
  detailImage: image (1200×1600 for detail page)
  description: text (max 200 chars)
  longDescription: text
  artFile: {                    // ONE master file per artwork — prints at 4×5, 8×10, 16×20
    cloudinaryUrl?: string
    cloudinaryPublicId?: string
    externalUrl?: string        // legacy only — no new external uploads
    filename?: string
    width?: number
    height?: number
    bytes?: number
    uploadedAt?: string
  }
  category: string (Video Games, Quotes, Maps, Funny, Minimalist, Botanical)
  tags: string[]
  featured: boolean             // homepage hero; validated to allow only one
  listing: 'free' | 'shop'      // free = downloadable, never sold; shop = sold, never downloadable (PLAN-35b)
  kind: 'single' | 'set'        // sets of two are their own artwork
  offers?: PrintOffer[]         // physical print offers (config/commerce.ts, lib/commerce.ts); one per provider
  etsyListingUrl?: string       // legacy fallback, removed in PLAN-37
  etsyPrintableUrl?: string     // legacy fallback, removed in PLAN-37
  downloads: number             // auto-incremented by /api/claim-art
}
```
Ratio (`4:5` portrait only) and print sizes are derived from `artFile.width/height` via `config/print-sizes.ts` (`deriveRatio()`, `PRINT_SIZES`) — never hand-typed. Upload one 4:5 master sized for 16×20 (~4800×6000 px); it prints at 4×5, 8×10, 16×20.

### Environment Variables

**Required for Production:**
```bash
# Sanity CMS
NEXT_PUBLIC_SANITY_PROJECT_ID=<project-id>
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-11-27
SANITY_API_TOKEN=<token-with-editor-permissions>

# Cloudinary (for high-res asset uploads)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=<cloud-name>
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=<unsigned-preset>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# Google Gemini (for AI description generator)
GOOGLE_API_KEY=<api-key>

# Admin secret gating studio-only routes (/api/cloudinary/delete, /api/gemini/generate)
ADMIN_API_SECRET=<long-random-string>

# Email + signed download links
RESEND_API_KEY=<key>
RESEND_AUDIENCE_ID=<audience-id>
EMAIL_FROM="The Pixel Prince <hello@thepixelprince.com>"
DOWNLOAD_LINK_SECRET=<long-random-string>
NEXT_PUBLIC_SITE_URL=https://www.thepixelprince.com
```

**Development Only:**
```bash
# Bypass the email gate/token requirement for testing (?artId=<slug> works directly)
DISABLE_DOWNLOAD_LIMIT=true
```

**Setup:** Copy `.env.example` to `.env.local` and fill in values.

## Common Workflows

### Adding New Art to Sanity

See `docs/ADDING-NEW-ART.md` for the full walkthrough. Short version: `/studio` → **Artworks** → **Create new** → fill in the five numbered tabs (① Details, ② Images, ③ Print File — one master PNG, ④ Shop & Tags, ⑤ Stats is automatic) → **Publish**.

### Testing Downloads

**Option 1: Disable the email gate**
```bash
echo "DISABLE_DOWNLOAD_LIMIT=true" >> .env.local
npm run dev
# then: curl -o test.zip "http://localhost:3000/api/claim-art?artId=<slug>"
```

**Option 2: Full flow** — enter an email on an art page, click through the link sent by Resend (72-hour signed token via `/api/claim-art?token=...`).

### Debugging Download Issues

1. Check browser console for errors
2. Check Network tab → `/api/request-download` and `/api/claim-art` requests
3. Check server logs for `[REQUEST-DL]` / `[CLAIM-ART]` prefixes
4. Verify the artwork has `artFile.cloudinaryUrl` set in Sanity
5. Check the subscriber's weekly count in the `subscriber-<hash>` document in Sanity

**Common Issues:**
- 401 error: missing/invalid download token
- 403 error: expired (72h) or tampered token
- 404 error: artwork not found, or missing `artFile`
- 429 error: weekly limit (3/email) reached
- 500 error: master file URL unreachable, or `how-to-print.pdf`/`LICENSE.txt` missing from `assets/download-extras/` (ZIP still ships without it — check `[CLAIM-ART] missing extra:` log)

### TypeScript Path Aliases

The project uses `@/*` alias for imports:
```typescript
import { getAllProducts } from '@/sanity/lib/client'
import { DOWNLOAD_COOKIE_NAME } from '@/config/free-art'
```

Configured in `tsconfig.json`:
```json
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```

### Styling Conventions

- **Tailwind CSS v4** for all styling
- Use `lucide-react` for icons (NOT emojis)
- Earth-tone color palette (defined in CSS)
- Responsive design: mobile-first approach
- Component library: shadcn/ui patterns in `components/ui/`

### Static Generation

All art detail pages are statically generated at build time:

```typescript
// app/art/[id]/page.tsx
export async function generateStaticParams() {
  const products = await getAllProducts()
  return products.map(art => ({ id: art.id }))
}
```

This provides:
- Instant page loads
- Perfect Lighthouse scores
- CDN-friendly deployment

## Important Notes

### Download Limit Model
- Weekly limit (3/email, `lib/subscriber-store.ts`) is tracked server-side per email in Sanity, not by cookie — clearing cookies no longer bypasses it, a new email address does
- Download links are signed JWTs (`lib/download-token.ts`), 72-hour expiry, single artwork per token
- `lib/download-tracking.ts` and `lib/use-download-tracking.ts` (cookie-based) are **dead code** left over from the pre-email-gate design — do not build on them; they have zero live imports

### Commerce Model
- Physical prints sell on-site via Fourthwall (merchant of record) with Printful as its manufacturer; Phase 2 swaps to Stripe + Printful (PLAN-34 decisions)
- `offers[]` on an artwork holds display prices in cents per size; the provider is the source of truth for the charge
- `lib/commerce.ts` picks the active offer (`fourthwall` > `stripe` > `etsy`); never read `offers` directly in components
- Free downloads are unchanged and never routed through a provider
- `listing` splits the catalog: `getAllProducts`/`getProductBySlug`/`getFeaturedProduct`/`getRelatedProducts` return free prints only (so `/api/claim-art` can never serve a shop print); `getShopPrints`/`getShopPrintBySlug` return shop prints only

### Deprecated Features
- `generate-zips.js` script — ZIPs are now built on-demand server-side by `lib/build-download-zip.ts`
- Per-size uploads / `sizes[]` / `artSize` schema / `zipUrl` / `allSizesZip` — replaced by the single `artFile` model (PLAN-12)
- Local file storage in `/private/free/` (migrated to Cloudinary)

### API Routes
- `/api/request-download` → Email-gate handler (POST): validates + rate-limits, signs token, sends email
- `/api/claim-art` → Download handler (GET, `?token=...`): verifies token, streams the auto-built ZIP
- `/api/gemini/generate` → AI description generator (POST, requires `x-admin-secret` header)
- `/api/cloudinary/delete` → Delete Cloudinary assets (DELETE, requires `x-admin-secret` header)

### ZIP Streaming
`lib/build-download-zip.ts` pipes the fetched master PNG straight into `archiver`, which pipes into the response — nothing is buffered fully in memory. `maxDuration = 60` on the claim-art route covers slow first-byte from Cloudinary.

## Development Tips

- Always use Server Components unless client interactivity is needed (`'use client'`)
- Use `urlFor()` helper from `sanity/lib/image.ts` for Sanity images
- Test the download flow with `DISABLE_DOWNLOAD_LIMIT=true` to skip the email gate locally
- Sanity Studio is accessible at `/studio` (no separate deployment needed), forced into dark mode, and needs a Vercel redeploy to pick up schema code changes (content edits are live immediately)

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
