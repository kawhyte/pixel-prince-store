/**
 * Is a shop print actually finished? (`npm run shop:doctor`)
 *
 * Adding a print means getting about ten things right across two systems that do not know about
 * each other. `check-prices` covers one of them. This covers the rest, and answers the only
 * question that matters before launch: can this listing go public as it stands.
 *
 * Everything here is pure so it can be tested without a shop. The script feeds it what the two
 * APIs return and prints the result; nothing in this file reads or writes anything.
 */
import { SHOP_SIZE_LADDER, TARGET_PRICES, type FinishId } from "@/config/commerce";
import { draftDescription, draftLongDescription } from "@/lib/listing-copy";

/** A price row that disagrees with the ladder, or a size the product does not sell. */
export interface PriceRow {
  sizeId: string;
  /** null when the product does not offer this size at all */
  now: number | null;
  target: number;
}

/**
 * The ladder against what Fourthwall charges, in ladder order. Shared with `check-prices` so the
 * report that tells you what to change and the report that tells you whether you are done can
 * never disagree about what "correct" means.
 *
 * A size Fourthwall sells that the ladder does not mention is not checked; that is how canvas
 * skips 8x10. A size the ladder wants that the product does not sell is reported as missing.
 */
export function comparePrices(
  finish: FinishId | string,
  livePrices: Map<string, number | null>,
): { rows: PriceRow[]; wrong: PriceRow[]; unchecked: string[] } {
  const targets = (TARGET_PRICES as Record<string, Partial<Record<string, number>>>)[finish] ?? {};
  const rows: PriceRow[] = [];
  const unchecked: string[] = [];

  for (const [sizeId, now] of livePrices) {
    const target = targets[sizeId];
    if (target === undefined) {
      unchecked.push(sizeId);
      continue;
    }
    rows.push({ sizeId, now, target });
  }
  for (const sizeId of Object.keys(targets)) {
    if (!livePrices.has(sizeId)) rows.push({ sizeId, now: null, target: targets[sizeId]! });
  }

  const order = (id: string) => {
    const i = SHOP_SIZE_LADDER.findIndex((s) => s.id === id);
    return i === -1 ? SHOP_SIZE_LADDER.length : i;
  };
  rows.sort((a, b) => order(a.sizeId) - order(b.sizeId));
  return { rows, wrong: rows.filter((r) => r.now !== r.target), unchecked };
}

export type Severity = "blocker" | "warning";

export interface Finding {
  severity: Severity;
  /** what is wrong, in the fewest words that are still specific */
  message: string;
  /** the command or the click that fixes it */
  fix?: string;
}

/** One Fourthwall product, reduced to what the doctor cares about. */
export interface FwSnapshot {
  id: string;
  name: string;
  version: string | null;
  finish: string;
  /** PUBLIC, HIDDEN, ARCHIVED */
  access: string;
  /** size id to selling price in cents; null when the size exists with no price */
  prices: Map<string, number | null>;
}

/** One Sanity artwork, reduced the same way. `null` when the print has not been imported yet. */
export interface StudioSnapshot {
  id: string;
  isDraft: boolean;
  title: string;
  description?: string;
  longDescription?: string;
  category?: string;
  tags?: string[];
  hasPreviewImage: boolean;
  roomPhotos: number;
  defaultVersion?: string;
  offers: { version: string | null; finish: string; hasMockup: boolean; hasArt: boolean; providerProductId?: string }[];
}

export interface PrintReport {
  title: string;
  findings: Finding[];
  /** nothing blocking: this listing could go public as it stands */
  ready: boolean;
  priceRowsWrong: number;
}

/**
 * Whether the copy is still the line the importer generated. An auto-written description is a
 * real sentence rather than a placeholder, which is the point of it, and also the reason nobody
 * notices it shipped. Comparing against the generator is the only way to tell.
 */
export function isUntouchedCopy(
  text: string | undefined,
  kind: "description" | "longDescription",
  input: { title: string; category?: string; versions: string[]; finishes: string[] },
): boolean {
  if (!text) return false;
  const generated = kind === "description" ? draftDescription(input) : draftLongDescription(input);
  return text.trim() === generated.trim();
}

const plural = (n: number, one: string, many = one + "s") => `${n} ${n === 1 ? one : many}`;

/**
 * Everything wrong with one print, worst first. A blocker means it cannot go live; a warning
 * means it can, but someone chose not to finish it.
 */
export function auditPrint(title: string, fw: FwSnapshot[], studio: StudioSnapshot | null): PrintReport {
  const findings: Finding[] = [];
  let priceRowsWrong = 0;

  const selling = fw.filter((p) => p.access !== "ARCHIVED");

  if (selling.length === 0) {
    findings.push({ severity: "blocker", message: "no products in Fourthwall", fix: "npm run shop:new -- --apply" });
    return { title, findings, ready: false, priceRowsWrong: 0 };
  }

  // Prices, per product, against the one ladder.
  for (const p of selling) {
    const { wrong } = comparePrices(p.finish, p.prices);
    const missing = wrong.filter((r) => r.now === null);
    const drifted = wrong.filter((r) => r.now !== null);
    priceRowsWrong += wrong.length;
    if (drifted.length > 0) {
      findings.push({
        severity: "blocker",
        message: `${p.name}: ${plural(drifted.length, "price")} off the ladder`,
        fix: "npm run shop:prices",
      });
    }
    if (missing.length > 0) {
      findings.push({
        severity: "warning",
        message: `${p.name}: does not sell ${missing.map((r) => r.sizeId).join(", ")}`,
        fix: "add the size in Fourthwall, or drop it from TARGET_PRICES",
      });
    }
  }

  // A version sold in one finish only quietly changes what the page can offer.
  const byVersion = new Map<string, Set<string>>();
  for (const p of selling) {
    const key = p.version ?? "";
    if (!byVersion.has(key)) byVersion.set(key, new Set());
    byVersion.get(key)!.add(p.finish);
  }
  for (const [version, finishes] of byVersion) {
    if (!finishes.has("unframed")) {
      findings.push({
        severity: "blocker",
        message: `${version || "this print"} sells framed only, so its cheapest price is the framed one`,
        fix: "publish the unframed product in Fourthwall",
      });
    }
  }

  const publicCount = selling.filter((p) => p.access === "PUBLIC").length;
  if (publicCount === 0) {
    findings.push({
      severity: "blocker",
      message: `all ${selling.length} products are hidden in Fourthwall`,
      fix: "review the mockups and prices, then set them Public",
    });
  } else if (publicCount < selling.length) {
    findings.push({
      severity: "blocker",
      message: `${publicCount} of ${selling.length} products are public, so the site sees a partial listing`,
      fix: "publish the rest, or the page offers fewer choices than you think",
    });
  }

  if (!studio) {
    findings.push({
      severity: "blocker",
      message: "not in Studio yet",
      fix: publicCount > 0 ? "npm run shop:sync" : "publish in Fourthwall first, then npm run shop:sync",
    });
    return { title, findings, ready: false, priceRowsWrong };
  }

  // Every public Fourthwall product should have arrived as an offer.
  for (const p of selling.filter((x) => x.access === "PUBLIC")) {
    const match = studio.offers.find(
      (o) => o.providerProductId === p.id || (o.finish === p.finish && (o.version ?? null) === p.version),
    );
    if (!match) {
      findings.push({ severity: "blocker", message: `${p.name}: public in Fourthwall but not an offer in Studio`, fix: "npm run shop:sync" });
    }
  }

  const versions = [...new Set(selling.map((p) => p.version).filter((v): v is string => !!v))];
  const finishes = [...new Set(selling.map((p) => p.finish))];
  const copyInput = { title, category: studio.category, versions, finishes };

  if (studio.isDraft) {
    findings.push({ severity: "blocker", message: "still a draft in Studio", fix: "open it in Studio and press Publish" });
  }
  if (!studio.hasPreviewImage) {
    findings.push({ severity: "blocker", message: "no card image", fix: "npm run shop:art -- --apply" });
  }
  const noArt = studio.offers.filter((o) => !o.hasArt).length;
  if (noArt > 0) {
    findings.push({
      severity: "blocker",
      message: `${plural(noArt, "offer")} without the flat artwork, so the page shows a mockup instead of the art`,
      fix: "npm run shop:art -- --apply",
    });
  }
  const noMockup = studio.offers.filter((o) => !o.hasMockup).length;
  if (noMockup > 0) {
    findings.push({ severity: "blocker", message: `${plural(noMockup, "offer")} with no photo`, fix: "npm run shop:sync" });
  }
  if (!studio.category) {
    findings.push({ severity: "blocker", message: "no category, so it is missing from every collection page", fix: "set it in Studio" });
  }
  if (!studio.tags?.length) {
    findings.push({ severity: "warning", message: "no tags", fix: "set them in Studio" });
  }
  if (isUntouchedCopy(studio.description, "description", copyInput)) {
    findings.push({ severity: "warning", message: "description is still the generated one", fix: "rewrite it in Studio" });
  }
  if (isUntouchedCopy(studio.longDescription, "longDescription", copyInput)) {
    findings.push({ severity: "warning", message: "long description is still the generated one", fix: "rewrite it in Studio" });
  }
  if (versions.length > 1 && !studio.defaultVersion) {
    findings.push({
      severity: "warning",
      message: `${versions.length} versions and no default, so the page opens on whichever sorts first`,
      fix: "pick one in Studio",
    });
  }
  if (studio.roomPhotos === 0) {
    // Not a blocker: an empty gallery is a decision, and 4edc2f1 exists to keep it one.
    findings.push({ severity: "warning", message: "no room photos", fix: "npm run shop:photo -- --room" });
  }

  const order = { blocker: 0, warning: 1 };
  findings.sort((a, b) => order[a.severity] - order[b.severity]);
  return { title, findings, ready: !findings.some((f) => f.severity === "blocker"), priceRowsWrong };
}
