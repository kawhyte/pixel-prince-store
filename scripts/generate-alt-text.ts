/**
 * Write the alt text nobody has written yet (PLAN-53 follow up).
 *
 *   npx tsx scripts/generate-alt-text.ts                 what is missing, and what Gemini would say
 *   npx tsx scripts/generate-alt-text.ts --apply         write it to Sanity
 *   options: --only "Retro Consoles"   --overwrite   --listing shop|free
 *
 * Alt text carries more weight here than on most sites. Sanity serves every image from a content
 * hash, so the file name tells a crawler nothing at all: the alt text, the Product image array and
 * /sitemap-images.xml are the whole of what a search engine or an assistant gets to read about a
 * picture. Twenty-one shop images were going out titled "Retro Controllers".
 *
 * Same model and prompt as the button in Studio, called directly so no dev server is needed.
 * Existing alt text is never touched unless you ask for --overwrite: a sentence Kenny wrote is
 * worth more than one a model guessed.
 *
 * Needs GOOGLE_API_KEY and SANITY_API_WRITE_TOKEN in .env.local.
 */
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";
import { GEMINI_ALT_TEXT_MODEL } from "../config/gemini";
import { buildAltTextPrompt } from "../lib/gemini-prompt";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string, d?: string) => {
  const i = args.indexOf(n);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d;
};
const apply = flag("--apply");
const overwrite = flag("--overwrite");
const only = opt("--only");
const listing = opt("--listing", "shop");

const MAX_ALT_LENGTH = 160;

const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION!,
  token: process.env.SANITY_API_WRITE_TOKEN,
  useCdn: false,
});

/** One image that needs a sentence: where it lives, what it shows, and how to patch it back. */
interface Target {
  docId: string;
  title: string;
  category?: string;
  version?: string;
  finish?: string;
  /** the Sanity patch path, e.g. `offers[_key=="ab12"].mockup.alt` */
  path: string;
  label: string;
  url: string;
  current?: string;
}

interface OfferRow {
  _key: string;
  version?: string;
  finish?: string;
  mockupUrl?: string;
  mockupAlt?: string;
  artUrl?: string;
  artAlt?: string;
}
interface GalleryRow {
  _key: string;
  url?: string;
  alt?: string;
}
interface DocRow {
  _id: string;
  title: string;
  category?: string;
  previewUrl?: string;
  previewAlt?: string;
  detailUrl?: string;
  detailAlt?: string;
  offers?: OfferRow[];
  gallery?: GalleryRow[];
}

async function targets(): Promise<Target[]> {
  const docs = await sanity.fetch<DocRow[]>(
    `*[_type == "product" && listing == $listing && !(_id in path("drafts.**"))]{
      _id, title, category,
      "previewUrl": previewImage.asset->url, "previewAlt": previewImage.alt,
      "detailUrl": detailImage.asset->url, "detailAlt": detailImage.alt,
      "offers": offers[]{ _key, version, finish,
        "mockupUrl": mockup.asset->url, "mockupAlt": mockup.alt,
        "artUrl": art.asset->url, "artAlt": art.alt },
      "gallery": galleryImages[]{ _key, "url": asset->url, alt }
    } | order(title asc)`,
    { listing },
  );

  const out: Target[] = [];
  for (const d of docs) {
    if (only && d.title !== only) continue;
    const base = { docId: d._id, title: d.title, category: d.category };
    const push = (path: string, label: string, url?: string, current?: string, extra?: Partial<Target>) => {
      if (!url) return;
      out.push({ ...base, ...extra, path, label, url, current });
    };
    push("previewImage.alt", "card image", d.previewUrl, d.previewAlt);
    push("detailImage.alt", "main image", d.detailUrl, d.detailAlt);
    for (const o of d.offers ?? []) {
      const who = [o.version, o.finish].filter(Boolean).join(" ");
      push(`offers[_key=="${o._key}"].mockup.alt`, `photo, ${who}`, o.mockupUrl, o.mockupAlt, { version: o.version, finish: o.finish });
      push(`offers[_key=="${o._key}"].art.alt`, `flat art, ${who}`, o.artUrl, o.artAlt, { version: o.version, finish: o.finish });
    }
    for (const [i, g] of (d.gallery ?? []).entries()) {
      push(`galleryImages[_key=="${g._key}"].alt`, `room photo ${i + 1}`, g.url, g.alt);
    }
  }
  return out.filter((t) => overwrite || !t.current?.trim());
}

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");
const model = genAI.getGenerativeModel({ model: GEMINI_ALT_TEXT_MODEL });

async function describe(t: Target): Promise<string> {
  const res = await fetch(t.url);
  if (!res.ok) throw new Error(`could not fetch the image (${res.status})`);
  const base64 = Buffer.from(await res.arrayBuffer()).toString("base64");
  const result = await model.generateContent([
    buildAltTextPrompt({ title: t.title, version: t.version, finish: t.finish, category: t.category }),
    { inlineData: { data: base64, mimeType: res.headers.get("content-type") || "image/jpeg" } },
  ]);
  // The model is asked for a bare sentence; tidy it anyway rather than trust it.
  const alt = (await result.response)
    .text()
    .replace(/^["'\s]+|["'\s.]+$/g, "")
    .replace(/\s+/g, " ")
    .slice(0, MAX_ALT_LENGTH);
  if (!alt) throw new Error("Gemini returned nothing");
  return alt;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  if (!process.env.GOOGLE_API_KEY) throw new Error("GOOGLE_API_KEY missing in .env.local");
  const list = await targets();
  if (list.length === 0) {
    console.log(`Nothing to write: every ${listing} image already has alt text.${overwrite ? "" : " Add --overwrite to redo them."}`);
    return;
  }
  console.log(`${list.length} image(s) without alt text${only ? ` on "${only}"` : ""}:\n`);

  let written = 0;
  let failed = 0;
  let lastTitle = "";
  for (const t of list) {
    if (t.title !== lastTitle) {
      console.log(`${lastTitle ? "\n" : ""}${t.title}`);
      lastTitle = t.title;
    }
    let alt: string;
    try {
      alt = await describe(t);
    } catch (e) {
      console.error(`  fail  ${t.label}: ${e instanceof Error ? e.message : String(e)}`);
      failed++;
      continue;
    }
    console.log(`  ${apply ? "write" : "would"} ${t.label.padEnd(22)} "${alt}"`);
    if (apply) {
      await sanity.patch(t.docId).set({ [t.path]: alt }).commit();
      written++;
    }
    // Gemini's free tier rate limits well below what a tight loop asks for.
    await sleep(1200);
  }

  console.log(`\n${apply ? `${written} written` : `${list.length} to write`}${failed > 0 ? `, ${failed} failed` : ""}${apply ? "" : " (dry run; add --apply)"}.`);
  if (apply && written > 0) console.log("Alt text is Studio's to edit afterwards; rerun with --overwrite only if you want the model's version back.");
  if (failed > 0) process.exitCode = 2;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
