/**
 * Is a print listing findable? (SEO + GEO)
 *
 *   npm run seo:audit                      every published shop print
 *   npm run seo:audit -- --only "Brooklyn Neighborhood Map"
 *   npm run seo:audit -- --record          mark the ones passing as optimized, in docs/seo-ledger.json
 *   npm run seo:audit -- --json            machine-readable, for a skill or a CI step
 *
 * `shop:doctor` answers "is this print finished enough to sell?". This answers a different
 * question: "can anyone find it, and can an assistant quote it?" The two overlap on purpose in
 * one place only, the generated-copy check, because boilerplate is both an unfinished listing and
 * an unfindable one.
 *
 * The ledger is not a to-do list anyone maintains by hand. Each print is fingerprinted from the
 * text and alt text that actually matter, so a print stays "optimized" until someone edits it,
 * and then it comes back as "changed" on its own. Nothing here writes to Sanity.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { createHash } from "crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { resolve, dirname } from "path";
import { shopPrintMetaTitle } from "../config/shop-copy";
import { draftDescription, draftLongDescription } from "../lib/listing-copy";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d?: string) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const only = opt("--only");
const record = flag("--record");
const asJson = flag("--json");

const LEDGER_PATH = resolve(__dirname, "../docs/seo-ledger.json");
const BRAND_SUFFIX = " | The Pixel Prince";

/** What Google shows before it truncates. */
const META_TITLE_MAX = 60;
/** Sanity caps the short description at 200; under 120 wastes the snippet. */
const SHORT_MIN = 120;
const SHORT_MAX = 200;
/** Two paragraphs of real copy. Under this it is a caption, not a description. */
const LONG_MIN = 300;
const TAGS_MIN = 5;
/** Screen readers and Google both cut around here. */
const ALT_MIN = 40;
const ALT_MAX = 160;

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION!,
  useCdn: false,
});

type Level = "fail" | "warn";
interface Finding {
  level: Level;
  check: string;
  message: string;
  fix: string;
}

interface ImageSlot {
  label: string;
  url?: string;
  alt?: string;
  /** an empty slot on a print that has no such combination is not a gap */
  optional?: boolean;
}

interface PrintRow {
  _id: string;
  title: string;
  slug: string;
  category?: string;
  description?: string;
  longDescription?: string;
  tags?: string[];
  previewUrl?: string;
  previewAlt?: string;
  detailUrl?: string;
  detailAlt?: string;
  offers?: { version?: string; finish?: string; mockupUrl?: string; mockupAlt?: string; artUrl?: string; artAlt?: string }[];
  gallery?: { url?: string; alt?: string }[];
}

interface LedgerEntry {
  optimized: string;
  fingerprint: string;
  title: string;
}
interface Ledger {
  version: number;
  note: string;
  prints: Record<string, LedgerEntry>;
}

function loadLedger(): Ledger {
  if (!existsSync(LEDGER_PATH)) {
    return {
      version: 1,
      note: "Written by scripts/seo-audit.ts --record. A print stays optimized until its copy or alt text changes, then the fingerprint stops matching and it comes back as changed. Do not hand-edit.",
      prints: {},
    };
  }
  return JSON.parse(readFileSync(LEDGER_PATH, "utf8")) as Ledger;
}

/** Everything a rewrite would touch, so an edit anywhere in it reopens the print. */
function fingerprint(p: PrintRow, slots: ImageSlot[]): string {
  const material = JSON.stringify({
    description: p.description ?? "",
    longDescription: p.longDescription ?? "",
    tags: [...(p.tags ?? [])].sort(),
    category: p.category ?? "",
    title: p.title,
    alts: slots.filter((s) => s.url).map((s) => `${s.label}:${s.alt ?? ""}`).sort(),
  });
  return createHash("sha1").update(material).digest("hex").slice(0, 12);
}

function slotsFor(p: PrintRow): ImageSlot[] {
  const out: ImageSlot[] = [
    { label: "card image", url: p.previewUrl, alt: p.previewAlt },
    { label: "main image", url: p.detailUrl, alt: p.detailAlt },
  ];
  for (const o of p.offers ?? []) {
    const who = [o.version, o.finish].filter(Boolean).join(" ");
    out.push({ label: `photo, ${who}`, url: o.mockupUrl, alt: o.mockupAlt });
    out.push({ label: `flat art, ${who}`, url: o.artUrl, alt: o.artAlt, optional: true });
  }
  for (const [i, g] of (p.gallery ?? []).entries()) out.push({ label: `room photo ${i + 1}`, url: g.url, alt: g.alt });
  return out;
}

function audit(p: PrintRow, slots: ImageSlot[]): Finding[] {
  const f: Finding[] = [];
  const short = (p.description ?? "").trim();
  const long = (p.longDescription ?? "").trim();
  const copyInput = { title: p.title, category: p.category, versions: [], finishes: [] };

  // --- copy
  if (!short) {
    f.push({ level: "fail", check: "short description", message: "empty", fix: "write 120-200 characters naming what is actually in the art" });
  } else {
    if (short === draftDescription(copyInput).trim())
      f.push({ level: "fail", check: "short description", message: "still the generated boilerplate", fix: "rewrite it: name the subjects, not the paper" });
    if (short.length < SHORT_MIN)
      f.push({ level: "warn", check: "short description", message: `${short.length} chars, under ${SHORT_MIN}`, fix: "this is the search snippet; use the room" });
    if (short.length > SHORT_MAX)
      f.push({ level: "fail", check: "short description", message: `${short.length} chars, over the ${SHORT_MAX} Sanity allows`, fix: "trim it" });
  }

  if (!long) {
    f.push({ level: "fail", check: "long description", message: "empty", fix: "two paragraphs: what it shows, then how it is made" });
  } else {
    if (long === draftLongDescription(copyInput).trim())
      f.push({ level: "fail", check: "long description", message: "still the generated boilerplate", fix: "rewrite it" });
    if (long.length < LONG_MIN)
      f.push({ level: "warn", check: "long description", message: `${long.length} chars, under ${LONG_MIN}`, fix: "this is the body an assistant quotes" });
    if (!long.includes("\n"))
      f.push({ level: "warn", check: "long description", message: "one paragraph", fix: "split it; one wall of text reads badly and scans worse" });
  }

  // --- title and category
  if (!p.category) {
    f.push({ level: "fail", check: "category", message: "not set", fix: "set it in Studio; the meta title and the collections both read it" });
  }
  const metaTitle = shopPrintMetaTitle(p.title, p.category) + BRAND_SUFFIX;
  if (metaTitle.length > META_TITLE_MAX)
    f.push({ level: "warn", check: "meta title", message: `${metaTitle.length} chars, Google truncates near ${META_TITLE_MAX}`, fix: `shorten the product name: "${metaTitle}"` });

  // --- tags
  const tags = p.tags ?? [];
  if (tags.length < TAGS_MIN)
    f.push({ level: "warn", check: "tags", message: `${tags.length}, want at least ${TAGS_MIN}`, fix: "add the terms a buyer would type, not the ones you would" });

  // --- images and alt text
  const present = slots.filter((s) => s.url);
  for (const s of present) {
    const alt = (s.alt ?? "").trim();
    if (!alt) {
      f.push({ level: "fail", check: "alt text", message: `${s.label} has none`, fix: "npx tsx scripts/generate-alt-text.ts --apply" });
      continue;
    }
    if (alt.length < ALT_MIN)
      f.push({ level: "warn", check: "alt text", message: `${s.label} is ${alt.length} chars`, fix: "describe what is visible, not just the title" });
    if (alt.length > ALT_MAX)
      f.push({ level: "warn", check: "alt text", message: `${s.label} is ${alt.length} chars, over ${ALT_MAX}`, fix: "trim; screen readers and Google both cut here" });
  }
  for (const s of slots.filter((s) => !s.url && !s.optional)) {
    f.push({ level: "warn", check: "image", message: `${s.label} is empty`, fix: "upload one; a picture converts harder than any markup" });
  }
  if (!present.some((s) => s.label.startsWith("room photo")))
    f.push({ level: "warn", check: "image", message: "no room photos", fix: "npm run shop:photo -- --room" });

  return f;
}

async function main() {
  const rows = await sanity.fetch<PrintRow[]>(
    `*[_type == "product" && listing == "shop" && !(_id in path("drafts.**"))]{
      _id, title, "slug": slug.current, category, description, longDescription, tags,
      "previewUrl": previewImage.asset->url, "previewAlt": previewImage.alt,
      "detailUrl": detailImage.asset->url, "detailAlt": detailImage.alt,
      "offers": offers[]{ version, finish, "mockupUrl": mockup.asset->url, "mockupAlt": mockup.alt,
                          "artUrl": art.asset->url, "artAlt": art.alt },
      "gallery": galleryImages[]{ "url": asset->url, alt }
    } | order(title asc)`,
  );

  const ledger = loadLedger();
  const today = new Date().toISOString().slice(0, 10);
  const report = rows
    .filter((p) => !only || p.title === only || p.slug === only)
    .map((p) => {
      const slots = slotsFor(p);
      const findings = audit(p, slots);
      const print = fingerprint(p, slots);
      const seen = ledger.prints[p.slug];
      const fails = findings.filter((x) => x.level === "fail").length;
      const warns = findings.length - fails;
      const state = fails > 0 ? "needs work" : seen?.fingerprint === print ? "optimized" : warns > 0 ? "passes, with notes" : "passes";
      return { slug: p.slug, title: p.title, state, fingerprint: print, lastOptimized: seen?.optimized ?? null, changedSinceRecorded: !!seen && seen.fingerprint !== print, findings };
    });

  if (asJson) {
    console.log(JSON.stringify({ generated: today, prints: report }, null, 2));
  } else {
    for (const r of report) {
      const mark = r.findings.some((x) => x.level === "fail") ? "x" : r.findings.length > 0 ? "!" : "ok";
      console.log(`\n${r.title}  [${r.state}]`);
      if (r.lastOptimized) console.log(`  last recorded ${r.lastOptimized}${r.changedSinceRecorded ? " (edited since, re-checked above)" : ""}`);
      if (r.findings.length === 0) console.log(`  ${mark}  nothing to fix`);
      for (const x of r.findings) console.log(`  ${x.level === "fail" ? "x" : "!"}  ${x.check}: ${x.message}\n       ${x.fix}`);
    }
    const bad = report.filter((r) => r.findings.some((x) => x.level === "fail")).length;
    console.log(`\n${report.length - bad} of ${report.length} print(s) pass. ${bad > 0 ? "x = fix before it ships, ! = worth doing." : "! = worth doing."}`);
  }

  if (record) {
    let written = 0;
    for (const r of report) {
      if (r.findings.some((x) => x.level === "fail")) continue;
      ledger.prints[r.slug] = { optimized: ledger.prints[r.slug]?.optimized && !r.changedSinceRecorded ? ledger.prints[r.slug].optimized : today, fingerprint: r.fingerprint, title: r.title };
      written++;
    }
    mkdirSync(dirname(LEDGER_PATH), { recursive: true });
    writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 2) + "\n");
    if (!asJson) console.log(`\nRecorded ${written} print(s) in docs/seo-ledger.json. Prints with an x are left out until they pass.`);
  }

  if (report.some((r) => r.findings.some((x) => x.level === "fail"))) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
