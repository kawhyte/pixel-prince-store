/**
 * Draft / apply Sanity `description` rewrites (PLAN-27).
 *
 * Safe two-stage pipeline with a HUMAN GATE:
 *   1. Draft mode (default, read-only): Gemini proposes a 1-2 sentence rewrite
 *      for every product, each validated by checkDescription (with one retry).
 *      Proposals are written to docs/info/description-rewrites-review.md (human)
 *      and description-rewrites-review.json (machine, source of truth for apply).
 *   2. Apply mode (--apply): patches ONLY rows marked "approved": true in the
 *      JSON, after re-checking that the product is unchanged since the snapshot
 *      and that the proposed text still validates.
 *
 * Patching the PUBLISHED document is intended — descriptions are copy edits, not
 * structural changes. Apply mode refuses any product that has an unpublished
 * Studio draft (resolve in Studio first) so the edit is never invisible.
 *
 * Env (from .env.local): SANITY_API_WRITE_TOKEN (editor rights, NOT the read
 * SANITY_API_TOKEN), GOOGLE_API_KEY.
 *
 *   npx tsx scripts/draft-description-rewrites.ts               # draft only
 *   npx tsx scripts/draft-description-rewrites.ts --force-redraft
 *   npx tsx scripts/draft-description-rewrites.ts --apply       # after Kenny approves
 */

import { config } from 'dotenv'
import { resolve } from 'path'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'

// Must run before importing sanity/lib/write-client (reads the token at module
// top level). Static imports are hoisted even under tsx, so the write client is
// imported dynamically inside main() after config() runs.
config({ path: resolve(__dirname, '../.env.local') })

import { checkDescription } from '../lib/description-rules'
import { keywordsForCategory } from '../config/seo-keywords'

const REVIEW_DIR = resolve(__dirname, '../docs/info')
const REVIEW_MD = resolve(REVIEW_DIR, 'description-rewrites-review.md')
const REVIEW_JSON = resolve(REVIEW_DIR, 'description-rewrites-review.json')

interface ProductRow {
  _id: string
  _updatedAt: string
  title: string
  category?: string
  slug: string
  description?: string
}

interface ReviewRow {
  _id: string
  slug: string
  title: string
  snapshotUpdatedAt: string
  current: string
  proposed: string
  approved: boolean
  needsHuman: boolean
}

function buildPrompt(row: ProductRow, problems?: string[]): string {
  const keywords = keywordsForCategory(row.category)
  const base = `Rewrite the product description for a printable wall-art piece.

Title: ${row.title}
Category: ${row.category ?? 'none'}
Search phrases you may weave in (at most one, naturally): ${keywords.join(', ')}

Hard rules:
- Write exactly 1 or 2 short sentences, under 200 characters total.
- Plain, specific, human. Sentence case.
- Never use em dashes.
- Never use the words: captivating, vibrant, elevate, stunning, seamless, curated, timeless.
- Weave in at most one search phrase naturally.
- Do not mention brands or trademarks.

Return ONLY the description text, no quotes, no labels, no JSON.`
  if (problems && problems.length > 0) {
    return `${base}

Your previous attempt failed these checks: ${problems.join('; ')}. Fix them.`
  }
  return base
}

async function draftMode(force: boolean) {
  // Guard against clobbering un-applied approvals.
  if (existsSync(REVIEW_JSON) && !force) {
    try {
      const prior: ReviewRow[] = JSON.parse(readFileSync(REVIEW_JSON, 'utf-8'))
      if (prior.some((r) => r.approved)) {
        console.error(
          `❌ ${REVIEW_JSON} already has approved rows that were not applied. ` +
            `Re-run with --apply first, or --force-redraft to overwrite them.`
        )
        process.exit(1)
      }
    } catch {
      // Unparseable prior file — treat as safe to overwrite.
    }
  }

  const { createGemini, generateText } = await import('../lib/gemini')
  const { writeClient, hasWriteAccess } = await import('../sanity/lib/write-client')

  if (!hasWriteAccess() || !writeClient) {
    console.error(
      '❌ SANITY_API_WRITE_TOKEN is missing or invalid in .env.local (needs Editor rights). ' +
        'Note: this is NOT the read-only SANITY_API_TOKEN.'
    )
    process.exit(1)
  }
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    console.error('❌ GOOGLE_API_KEY is missing in .env.local.')
    process.exit(1)
  }

  const products: ProductRow[] = await writeClient.fetch(
    `*[_type == "product" && !(_id in path("drafts.**"))]{ _id, _updatedAt, title, category, "slug": slug.current, description } | order(title asc)`
  )
  console.log(`Fetched ${products.length} products.`)

  const gemini = createGemini(apiKey)
  const ask = (prompt: string) => generateText(gemini, 'gemini-2.5-flash', prompt)

  const rows: ReviewRow[] = []
  for (const p of products) {
    let proposed = ''
    let needsHuman = false
    try {
      const first = (await ask(buildPrompt(p))).trim()
      let check = checkDescription(first)
      proposed = first
      if (!check.ok) {
        await new Promise((r) => setTimeout(r, 1000))
        const retry = (await ask(buildPrompt(p, check.problems))).trim()
        check = checkDescription(retry)
        proposed = retry
        if (!check.ok) needsHuman = true
      }
      console.log(`${needsHuman ? 'NEEDS-HUMAN' : 'ok'}  ${p.slug}`)
    } catch (err) {
      needsHuman = true
      proposed = ''
      console.log(`NEEDS-HUMAN  ${p.slug}  (gemini error: ${err instanceof Error ? err.message : err})`)
    }
    rows.push({
      _id: p._id,
      slug: p.slug,
      title: p.title,
      snapshotUpdatedAt: p._updatedAt,
      current: p.description ?? '',
      proposed,
      approved: false,
      needsHuman,
    })
    await new Promise((r) => setTimeout(r, 1000))
  }

  mkdirSync(REVIEW_DIR, { recursive: true })
  writeFileSync(REVIEW_JSON, JSON.stringify(rows, null, 2) + '\n', 'utf-8')
  writeFileSync(REVIEW_MD, renderMarkdown(rows), 'utf-8')

  const flagged = rows.filter((r) => r.needsHuman).length
  console.log('')
  console.log(`Wrote ${REVIEW_MD}`)
  console.log(`Wrote ${REVIEW_JSON}`)
  console.log(`${rows.length} rows, ${flagged} marked NEEDS-HUMAN.`)
  console.log('')
  console.log('DRY RUN: no content was changed. Re-run with --apply after review.')
}

function renderMarkdown(rows: ReviewRow[]): string {
  const header = `# Description rewrites — review

Generated by \`scripts/draft-description-rewrites.ts\`. **Nothing is patched until you approve.**

## How to approve

1. Read each row below. Edit the \`proposed\` text in **description-rewrites-review.json** if you want to change it (the JSON, not this table, is what apply reads).
2. To approve a row, set \`"approved": true\` on it in the JSON. (Ticking the checkbox here is a courtesy for reading; the JSON is authoritative.)
3. Run \`npx tsx scripts/draft-description-rewrites.ts --apply\`.
4. Rows edited in Studio after this file was generated are skipped automatically (stale snapshot guard).

Rows marked **NEEDS-HUMAN** failed automated validation twice — write a description by hand in the JSON before approving.

| approve | slug | current | proposed | flag |
|---------|------|---------|----------|------|
`
  const body = rows
    .map((r) => {
      const cur = mdCell(r.current)
      const prop = mdCell(r.proposed)
      const flag = r.needsHuman ? 'NEEDS-HUMAN' : ''
      return `| [ ] | ${r.slug} | ${cur} | ${prop} | ${flag} |`
    })
    .join('\n')
  return header + body + '\n'
}

function mdCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n+/g, ' ').trim() || '_(empty)_'
}

async function applyMode() {
  const { writeClient, hasWriteAccess } = await import('../sanity/lib/write-client')
  if (!hasWriteAccess() || !writeClient) {
    console.error('❌ SANITY_API_WRITE_TOKEN is missing or invalid in .env.local (needs Editor rights).')
    process.exit(1)
  }
  if (!existsSync(REVIEW_JSON)) {
    console.error(`❌ ${REVIEW_JSON} not found. Run draft mode first.`)
    process.exit(1)
  }

  const rows: ReviewRow[] = JSON.parse(readFileSync(REVIEW_JSON, 'utf-8'))
  let patched = 0
  let skippedStale = 0
  let skippedInvalid = 0
  let skippedDraft = 0
  let unapproved = 0

  for (const r of rows) {
    if (!r.approved) {
      unapproved++
      continue
    }

    const invalid = checkDescription(r.proposed)
    if (!invalid.ok) {
      skippedInvalid++
      console.log(`SKIPPED ${r.slug}: proposed text invalid (${invalid.problems.join('; ')})`)
      continue
    }

    // Re-fetch live state, including whether an unpublished draft exists.
    const live = await writeClient.fetch(
      `{ "pub": *[_id == $id][0]{ _updatedAt, description }, "draft": defined(*[_id == $draftId][0]._id) }`,
      { id: r._id, draftId: `drafts.${r._id}` }
    )

    if (!live?.pub) {
      skippedStale++
      console.log(`SKIPPED ${r.slug}: published document no longer exists`)
      continue
    }
    if (live.draft) {
      skippedDraft++
      console.log(`SKIPPED ${r.slug}: unpublished draft exists, resolve in Studio first`)
      continue
    }
    if (live.pub._updatedAt !== r.snapshotUpdatedAt) {
      skippedStale++
      console.log(`SKIPPED ${r.slug}: changed since draft (edited in Studio?); re-run draft mode for it`)
      continue
    }

    await writeClient.patch(r._id).set({ description: r.proposed }).commit()
    patched++
    console.log(`PATCHED ${r.slug}`)
  }

  console.log('')
  console.log(
    `Summary: ${patched} patched, ${skippedStale} skipped-stale, ${skippedInvalid} skipped-invalid, ` +
      `${skippedDraft} skipped-draft, ${unapproved} unapproved.`
  )
}

async function main() {
  const args = process.argv.slice(2)
  if (args.includes('--apply')) {
    await applyMode()
  } else {
    await draftMode(args.includes('--force-redraft'))
  }
}

main().catch((err) => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
