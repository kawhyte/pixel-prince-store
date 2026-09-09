# Scripts Directory

This folder contains utility scripts for managing The Pixel Prince Store.

## Available Scripts

### `generate-zips.js`

Automatically generates ZIP files for all free art downloads.

**Purpose**: Creates ZIP bundles containing all 4 sizes of each artwork plus HOW-TO-OPEN.txt instructions for users.

**Usage**:
```bash
npm run generate-zips
```

**Requirements**:
- All size files must exist in `private/free/` directory
- File names must match those defined in `config/free-art.ts`
- Node.js and the `archiver` package must be installed

**What it does**:
1. Reads the art collection from `config/free-art.ts`
2. For each artwork:
   - Validates that all 4 size files exist
   - Creates a ZIP file containing:
     - 4"×5" size PNG
     - 8"×10" size PNG
     - 16"×20" size PNG
     - 40×50cm size PNG
     - HOW-TO-OPEN.txt with Mac/PC instructions
   - Saves ZIP to `private/free/[artwork-id]-all.zip`
3. Displays a summary of successful/failed operations

**Example Output**:
```
🎨 The Pixel Prince Store - ZIP Generation Script

═══════════════════════════════════════════════════════════════

📁 Working directory: /path/to/private/free
📋 Found 4 artworks to process

📦 Creating ethereal-dreams-all.zip...
   ✓ Added: HOW-TO-OPEN.txt
   ✓ Added: ethereal-dreams-4x5.png
   ✓ Added: ethereal-dreams-8x10.png
   ✓ Added: ethereal-dreams-16x20.png
   ✓ Added: ethereal-dreams-40x50cm.png
✅ ethereal-dreams-all.zip created successfully
   Size: 20.7 MB
   Files: 5

📦 Creating vintage-map-all.zip...
   ✓ Added: HOW-TO-OPEN.txt
   ✓ Added: vintage-map-4x5.png
   ✓ Added: vintage-map-8x10.png
   ✓ Added: vintage-map-16x20.png
   ✓ Added: vintage-map-40x50cm.png
✅ vintage-map-all.zip created successfully
   Size: 22.6 MB
   Files: 5

... (etc)

═══════════════════════════════════════════════════════════════

📊 Summary:
   ✅ Successful: 4

✨ Done!
```

**Troubleshooting**:

**Problem**: "Could not parse freeArtCollection from config/free-art.ts"
- **Solution**: Ensure `config/free-art.ts` exports `freeArtCollection` array correctly

**Problem**: "❌ Missing file: artwork-size.png"
- **Solution**: Add the missing PNG files to `private/free/` directory
- The script will continue and create ZIPs for available files only

**Problem**: "Directory not found: private/free"
- **Solution**: Create the directory structure:
  ```bash
  mkdir -p private/free
  ```

**Problem**: "archiver not installed"
- **Solution**: Install dependencies:
  ```bash
  npm install
  ```

**When to run this script**:
- After adding new artwork files to `private/free/`
- After updating artwork configurations in `config/free-art.ts`
- Before deploying to production
- When preparing bulk downloads for the first time

**Important Notes**:
- ZIP files use maximum compression (level 9)
- HOW-TO-OPEN.txt is automatically included in every ZIP
- Script validates file existence before creating archives
- Existing ZIP files will be overwritten without warning
- Script exits with error code 1 if any ZIP creation fails

---

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

Additional utility scripts will be added here as needed:
- `optimize-images.js` - Optimize preview images
- `validate-config.js` - Validate config/free-art.ts structure
- `test-downloads.js` - Test download endpoints

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

