/**
 * Is every shop print finished? (`npm run shop:doctor`)
 *
 *   npm run shop:doctor                  every print, worst first
 *   npm run shop:doctor -- --only "Brooklyn Neighborhood Map"
 *   npm run shop:doctor -- --strict      exit 2 when anything is not ready, for a pre-launch gate
 *
 * Reads Fourthwall and Sanity and prints what is missing. It changes nothing, and it is the one
 * command to run before making a listing public: `shop:prices` says which prices are wrong,
 * this says whether the whole listing could go live.
 *
 * Needs FOURTHWALL_API_USER / FOURTHWALL_API_PASSWORD and SANITY_API_WRITE_TOKEN (or
 * SANITY_API_TOKEN) in .env.local.
 */
import { createClient } from "@sanity/client";
import { config } from "dotenv";
import { resolve } from "path";

import { PREFERRED_COLOR, pickVariantPerSize, splitProductName } from "../lib/fourthwall-import";
import { createPlatformClient, PlatformError } from "../lib/fourthwall-platform";
import { auditPrint, type FwSnapshot, type PrintReport, type SetSnapshot, type StudioSnapshot } from "../lib/shop-doctor";
import { setFinishes, setMembers, setSizes, isSet } from "../lib/sets";
import type { FreeArt } from "../sanity/lib/client";

config({ path: resolve(__dirname, "../.env.local") });

const args = process.argv.slice(2);
const only = args.includes("--only") ? args[args.indexOf("--only") + 1] : undefined;
const strict = args.includes("--strict");

const user = process.env.FOURTHWALL_API_USER;
const password = process.env.FOURTHWALL_API_PASSWORD;
const sanityToken = process.env.SANITY_API_WRITE_TOKEN || process.env.SANITY_API_TOKEN;
if (!user || !password) throw new Error("FOURTHWALL_API_USER / FOURTHWALL_API_PASSWORD missing in .env.local");
if (!sanityToken) throw new Error("SANITY_API_WRITE_TOKEN (or SANITY_API_TOKEN) missing in .env.local");

const fourthwall = createPlatformClient(user, password);
const sanity = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-11-27",
  token: sanityToken,
  useCdn: false,
  // drafts too: a print that has never been published is exactly what this is looking for
  perspective: "raw",
});

interface Variant {
  id: string;
  unitPrice?: { value?: number };
  attributes?: { size?: { name?: string }; color?: { name?: string } };
}
interface FwProduct {
  id: string;
  name: string;
  access?: { type?: string };
  variants?: Variant[];
}

const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const OFF = "\x1b[0m";

async function allProducts(): Promise<FwProduct[]> {
  const out: FwProduct[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await fourthwall.get<{ results?: FwProduct[] }>(`/products?page=${page}&size=100`);
    const items = res.results ?? [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

function snapshot(p: FwProduct): FwSnapshot & { title: string } {
  const { title, version, finish } = splitProductName(p.name);
  const prices = new Map<string, number | null>();
  for (const [sizeId, v] of pickVariantPerSize(p.variants ?? [], PREFERRED_COLOR)) {
    prices.set(sizeId, typeof v.unitPrice?.value === "number" ? Math.round(v.unitPrice.value * 100) : null);
  }
  return { id: p.id, name: p.name, version, finish, access: p.access?.type ?? "UNKNOWN", prices, title };
}

const STUDIO_QUERY = `*[_type == "product" && listing == "shop"]{
  _id, title, description, longDescription, category, tags, defaultVersion, kind,
  members[]{ version, "print": print->{ _id, title, offers[]{ finish, version, active, sizes[]{ sizeId } } } },
  "hasPreviewImage": defined(previewImage.asset),
  "roomPhotos": count(galleryImages),
  "offers": offers[]{ version, finish, providerProductId,
    "hasMockup": defined(mockup.asset), "hasArt": defined(art.asset) }
}`;

function studioByTitle(docs: Record<string, unknown>[]): Map<string, StudioSnapshot> {
  const out = new Map<string, StudioSnapshot>();
  for (const d of docs) {
    const id = String(d._id);
    const title = String(d.title ?? "").trim();
    if (!title) continue;
    const isDraft = id.startsWith("drafts.");
    // A published doc wins over its own draft: the draft is unsaved edits, not a second print.
    const existing = out.get(title);
    if (existing && existing.isDraft === false && isDraft) continue;
    out.set(title, {
      id,
      isDraft,
      title,
      description: d.description as string | undefined,
      longDescription: d.longDescription as string | undefined,
      category: d.category as string | undefined,
      tags: (d.tags as string[] | undefined) ?? [],
      hasPreviewImage: Boolean(d.hasPreviewImage),
      roomPhotos: Number(d.roomPhotos ?? 0),
      defaultVersion: d.defaultVersion as string | undefined,
      offers: ((d.offers as StudioSnapshot["offers"]) ?? []).map((o) => ({
        version: o.version ?? null,
        finish: o.finish ?? "unframed",
        hasMockup: Boolean(o.hasMockup),
        hasArt: Boolean(o.hasArt),
        providerProductId: o.providerProductId,
      })),
    });
  }
  return out;
}

function print(report: PrintReport) {
  const blockers = report.findings.filter((f) => f.severity === "blocker").length;
  const warnings = report.findings.length - blockers;
  const badge = report.ready
    ? warnings === 0
      ? `${GREEN}ready${OFF}`
      : `${YELLOW}ready, ${warnings} to tidy${OFF}`
    : `${RED}not ready${OFF}`;
  console.log(`\n${report.title}  ${badge}`);
  for (const f of report.findings) {
    const mark = f.severity === "blocker" ? `${RED}  x${OFF}` : `${YELLOW}  !${OFF}`;
    console.log(`${mark} ${f.message}`);
    if (f.fix) console.log(`    ${DIM}${f.fix}${OFF}`);
  }
}

async function main() {
  const [products, docs] = await Promise.all([allProducts(), sanity.fetch<Record<string, unknown>[]>(STUDIO_QUERY)]);

  const byTitle = new Map<string, (FwSnapshot & { title: string })[]>();
  for (const p of products) {
    const s = snapshot(p);
    if (s.access === "ARCHIVED") continue;
    if (!byTitle.has(s.title)) byTitle.set(s.title, []);
    byTitle.get(s.title)!.push(s);
  }
  const studio = studioByTitle(docs);

  // Sets are judged on their members rather than on Fourthwall products they do not have.
  const sets = new Map<string, SetSnapshot>();
  for (const d of docs) {
    const art = d as unknown as FreeArt;
    if (!isSet(art)) continue;
    const listed = art.members?.length ?? 0;
    const usable = setMembers(art);
    const usableIds = new Set(usable.map((m) => m.title));
    const broken = (art.members ?? [])
      .map((m) => m.print?.title)
      .filter((t): t is string => !!t && !usableIds.has(t));
    const finishes = setFinishes(art);
    sets.set(String(d.title ?? "").trim(), {
      listed,
      sellable: usable.length,
      broken: broken.length > 0 ? broken : listed > usable.length ? ["a print that is no longer there"] : [],
      finishes,
      sizesByFinish: Object.fromEntries(finishes.map((f) => [f, setSizes(art, f).length])),
    });
  }

  // A print in Studio with nothing left in Fourthwall is still a print, and still worth reporting.
  for (const title of studio.keys()) if (!byTitle.has(title)) byTitle.set(title, []);

  const titles = [...byTitle.keys()].filter((t) => !only || t === only).sort();
  if (titles.length === 0) {
    console.log(only ? `No print called "${only}".` : "No shop prints found.");
    return;
  }

  const reports = titles.map((t) => auditPrint(t, byTitle.get(t)!, studio.get(t) ?? null, sets.get(t) ?? null));
  // Worst first: someone running this wants the thing that is blocking them, not an alphabet.
  reports.sort((a, b) => {
    const block = (r: PrintReport) => r.findings.filter((f) => f.severity === "blocker").length;
    return block(b) - block(a) || b.findings.length - a.findings.length || a.title.localeCompare(b.title);
  });
  for (const r of reports) print(r);

  const ready = reports.filter((r) => r.ready).length;
  const rows = reports.reduce((n, r) => n + r.priceRowsWrong, 0);
  console.log(`\n${ready} of ${reports.length} print${reports.length === 1 ? "" : "s"} could go live.`);
  if (rows > 0) console.log(`${rows} price${rows === 1 ? "" : "s"} off the ladder in total. Run:  npm run shop:prices`);
  console.log(`${DIM}Nothing here changed anything.${OFF}`);

  if (strict && ready < reports.length) process.exit(2);
}

main().catch((e) => {
  console.error(e instanceof PlatformError ? `Fourthwall ${e.status}: ${e.body}` : e);
  process.exit(1);
});
