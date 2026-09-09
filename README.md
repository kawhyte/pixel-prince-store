# The Pixel Prince Store

thepixelprince.com: retro gaming and map wall art. Free printable downloads gated behind an email address, and physical prints sold on-site through Fourthwall (merchant of record) with Printful fulfilment. Next.js 16 App Router, Sanity CMS, Tailwind v4, Resend, Cloudinary.

## What the site does

- **Free prints** (`/free-downloads`, `/art/[id]`): one master PNG per artwork, emailed as a signed 72-hour link, 3 downloads per week per email, ZIP built on the fly with a printing guide and personal-use license.
- **Shop prints** (`/prints`, `/prints/[slug]`): size ladder with display prices from Sanity, Buy button hands off to Fourthwall's hosted checkout with the chosen size in the cart. Fourthwall charges, collects tax, and has Printful print and ship. An order webhook adds the buyer to Resend and counts the sale.
- **Content**: collections, blog, about, shipping and returns, terms, privacy. Sanity Studio at `/studio`.

Free prints and shop prints are separate documents (`listing: free | shop`). A free print is never sold and a shop print is never downloadable.

## Run it

```bash
cp .env.example .env.local   # fill in Sanity, Cloudinary, Resend, Fourthwall values
npm install
npm run dev                  # http://localhost:3000
```

Checks, all run by the pre-commit hook:

```bash
npx tsc --noEmit
npm run lint
npm test                     # vitest
npm run test:e2e             # playwright
npm run build
```

## Adding prints

- Free print: Studio, Artworks, Create, Listing = Free print, upload the master PNG. See `docs/ADDING-NEW-ART.md`.
- Shop print: create it in Fourthwall with the five ladder sizes, then `npx tsx scripts/import-fourthwall-products.ts --apply`, finish the draft in Studio, publish. Prices changed in Fourthwall: add `--sync`. See `scripts/README.md`.

## Where things live

| Area | Path |
|---|---|
| Pages | `app/` |
| Shared components | `components/common/`, `components/ui/` |
| Commerce config and helpers | `config/commerce.ts`, `config/shop-copy.ts`, `lib/commerce.ts` |
| Free download engine | `app/api/request-download`, `app/api/claim-art`, `lib/download-token.ts`, `lib/build-download-zip.ts`, `lib/subscriber-store.ts` |
| Order webhook | `app/api/webhooks/fourthwall`, `lib/fourthwall-webhook.ts` |
| Sanity schema and queries | `sanity/schemaTypes/`, `sanity/lib/client.ts` |
| Scripts | `scripts/` (import, id listing, migrations) |
| Plans and roadmap | `docs/PLAN-*.md` (local only, gitignored), `docs/PLAN-ROADMAP.html` |

`CLAUDE.md` carries the working conventions, environment variables, and the commerce decisions. `docs/info/ARCHITECTURE.md` describes the request flows.
