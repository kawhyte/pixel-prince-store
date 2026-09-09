# Scripts Directory

This folder contains utility scripts for managing The Pixel Prince Store.

## Available Scripts

### `draft-description-rewrites.ts`

Rewrites every artwork's Sanity `description` to one or two short, human sentences
in Kenny's voice, through a safe pipeline with a **human approval gate**. Gemini
drafts proposals, Kenny reviews them in a markdown file, and only approved rows
are patched back (PLAN-27).

**Prerequisites**:
- `SANITY_API_WRITE_TOKEN` in `.env.local` with **Editor** rights (this is NOT the
  read-only `SANITY_API_TOKEN` — the write token is required for the `--apply` patch).
- `GOOGLE_API_KEY` in `.env.local` (Gemini `gemini-2.5-flash`).

**Usage**:
```bash
# 1. Draft (read-only, makes zero Sanity mutations):
npx tsx scripts/draft-description-rewrites.ts
#    Writes:
#      docs/info/description-rewrites-review.md    (human-readable table)
#      docs/info/description-rewrites-review.json  (machine source of truth)
#    Prints "DRY RUN: no content was changed."

# 2. Kenny reviews. In the JSON, edit any `proposed` text and set
#    "approved": true on each row to publish. Rows flagged NEEDS-HUMAN failed
#    automated validation twice — write those by hand before approving.

# 3. Apply — patches ONLY approved rows:
npx tsx scripts/draft-description-rewrites.ts --apply
```

**Safeguards**:
- Default run drafts only; `--apply` is required to change content.
- Each proposal passes `checkDescription` (`lib/description-rules.ts`): 1-2 sentences,
  ≤200 chars, no em dashes, no adjective-soup phrases. One Gemini retry on failure.
- Apply re-fetches each product and **skips** any whose `_updatedAt` changed since
  drafting (stale guard) or that has an unpublished Studio draft.
- Re-running draft mode over un-applied approvals is refused unless `--force-redraft`.

**Troubleshooting**:
- `SANITY_API_WRITE_TOKEN is missing or invalid`: add an Editor-level token; the
  read token fails only at patch time with a confusing 403.
- `SKIPPED <slug>: unpublished draft exists`: publish/discard the draft in Studio, then re-draft that row.
- `SKIPPED <slug>: changed since draft`: the product was edited after drafting; re-run draft mode.

---

## Future Scripts

### `migrate-etsy-to-offers.ts` (PLAN-35)

Wraps each artwork's legacy `etsyListingUrl` in a `printOffer` with `provider: "etsy"`. Dry run by default.

    npx tsx scripts/migrate-etsy-to-offers.ts          # preview
    npx tsx scripts/migrate-etsy-to-offers.ts --apply  # write

Needs `SANITY_API_WRITE_TOKEN` (or `SANITY_API_TOKEN`) in `.env.local`. Patches drafts and published documents. Safe to re-run: artworks that already have an etsy offer are skipped.

### `backfill-listing-free.ts` (PLAN-35b)

One-off: sets `listing: "free"` on every artwork that predates the free/shop switch. Dry run by default; `--apply` writes. Same token rules as above.

### `fourthwall-ids.ts` (PLAN-36)

Lists every public Fourthwall product with its product id and one variant id per size, ready to paste into Studio (Artwork > tab 4 Shop > Print offers). Read-only.

    npx tsx scripts/fourthwall-ids.ts          # table
    npx tsx scripts/fourthwall-ids.ts --json   # raw API output

Needs `FOURTHWALL_STOREFRONT_TOKEN` in `.env.local` (Fourthwall admin > Settings > For Developers > Storefront API). Reads `/v1/collections/all/products`; the bare `/v1/products` endpoint is 404.

### `import-fourthwall-products.ts` (PLAN-40)

Creates one Sanity **draft** shop print per public Fourthwall product (title, slug, mockup, full Fourthwall offer with ladder sizes, prices in cents, variant ids). Re-runs never duplicate: prints already linked to the Fourthwall product id are synced instead.

    npx tsx scripts/import-fourthwall-products.ts                  # dry run
    npx tsx scripts/import-fourthwall-products.ts --apply          # create drafts + sync existing
    npx tsx scripts/import-fourthwall-products.ts --sync --apply   # sync prices/variant ids only
    add --include-test to process products named "Test ..."

Needs `FOURTHWALL_STOREFRONT_TOKEN` and `SANITY_API_WRITE_TOKEN` in `.env.local`. Pure mapping helpers live in `lib/fourthwall-import.ts` (unit-tested). Exits with code 2 when a product has no ladder sizes under `--apply`.

### `fourthwall-create-products.ts` (PLAN-47)

Turns a folder of print files into Fourthwall products: uploads each master to the media library and creates `Title` (Enhanced Matte Paper Poster) and `Title | Framed` (Framed High-Quality Matte Poster in Black, Red Oak and White, `--frames` to narrow) with the five ladder sizes and one margin per finish. Created hidden unless `--publish`; a hidden product is published later with `setProductAccess` in `lib/fourthwall-platform.ts` (PUT `/products/{id}/state`) or in the dashboard. The storefront's product listing is cached for 60 seconds, so run the import a minute after publishing. The import keeps the Black variant per size. Canvas cannot be created through the API; the script prints a dashboard reminder per title. Existing names are skipped.

    npx tsx scripts/fourthwall-create-products.ts --dir ./masters                  # dry run
    npx tsx scripts/fourthwall-create-products.ts --dir ./masters --apply          # create, hidden
    npx tsx scripts/fourthwall-create-products.ts --dir ./masters --apply --margin-poster 18 --margin-framed 30 --frames "Black,White" --only "Sweden Map"

Needs `FOURTHWALL_API_USER` and `FOURTHWALL_API_PASSWORD` in `.env.local` (Fourthwall admin > Settings > For Developers > Create API User). Full-access credentials: keep them out of Vercel.

