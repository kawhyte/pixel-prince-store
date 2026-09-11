/**
 * A new shop listing should read like a listing, not like a form waiting to be filled in
 * (PLAN-52). These write the first draft: good enough to publish, plain enough that Kenny can
 * see what to improve. Studio's AI button rewrites them, and he rewrites the ones that matter.
 *
 * Pure and tested. No em dashes, house rule.
 */
import { SIZE_RANGE_SENTENCE } from "@/config/commerce";

export interface CopyInput {
  title: string;
  category?: string;
  /** finishes on sale, in FINISHES order */
  finishes?: string[];
  /** version names, when the print comes several ways */
  versions?: string[];
}

const CATEGORY_LEAD: Record<string, (title: string) => string> = {
  Maps: (t) => `${t}, designed and color blocked so the whole place reads at a glance.`,
  "Video Games": (t) => `${t}, built from the palettes and shapes of the games worth remembering.`,
  Quotes: (t) => `${t}, set in type that earns its place on a wall rather than shouting from it.`,
  Funny: (t) => `${t}. It is a joke you will still like in a year, which is the hard part.`,
  Minimalist: (t) => `${t}, stripped back to the few shapes that carry it.`,
  Botanical: (t) => `${t}, designed from the plant rather than traced from a stock photo.`,
};

const PAPER = "Printed to order on 189 gsm museum grade matte paper with archival inks, shipped flat or in a tube.";

/** The card and meta description. Sanity caps this at 200 characters. */
export function draftDescription(input: CopyInput): string {
  const lead = (CATEGORY_LEAD[input.category ?? ""] ?? ((t: string) => `${t}, designed in the studio and printed to order.`))(
    input.title.trim()
  );
  const versions = input.versions ?? [];
  const colorway =
    versions.length > 1 ? ` ${versions.slice(0, -1).join(", ")} or ${versions[versions.length - 1]}.` : "";
  const out = `${lead}${colorway} Museum grade matte paper, printed to order.`;
  return out.length <= 200 ? out : `${out.slice(0, 197).trimEnd()}...`;
}

/** The longer body on the print page. Two short paragraphs. */
export function draftLongDescription(input: CopyInput): string {
  const title = input.title.trim();
  const lead = (CATEGORY_LEAD[input.category ?? ""] ?? ((t: string) => `${t}, designed in the studio.`))(title);
  const versions = input.versions ?? [];
  const finishes = input.finishes ?? [];

  const choice: string[] = [];
  if (versions.length > 1) {
    choice.push(`It comes in ${versions.length} colorways, ${versions.slice(0, -1).join(", ")} and ${versions[versions.length - 1]}, so you can match the room rather than work around the print.`);
  }
  if (finishes.length > 1) {
    const names = finishes.map((f) => (f === "unframed" ? "unframed" : f));
    choice.push(`Pick it ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}.`);
  }

  const second = [choice.join(" "), PAPER].filter(Boolean).join(" ");
  // Built from the ladder, never typed. This said "Five sizes" long after the ladder grew to
  // eight, which is the kind of claim nobody notices and every visitor can count.
  return `${lead} ${SIZE_RANGE_SENTENCE}, small enough for a desk wall and big enough to hold a room on its own.\n\n${second}`;
}

const STOP_WORDS = new Set(["the", "and", "of", "a", "an", "with", "for", "in", "on", "to", "wall", "art", "print"]);

/** Search tags from the title and category. Lowercase, no duplicates, no filler. */
export function draftTags(input: CopyInput): string[] {
  const out: string[] = [];
  const add = (tag: string) => {
    const clean = tag.trim().toLowerCase();
    if (clean.length > 2 && !out.includes(clean)) out.push(clean);
  };

  for (const word of input.title.split(/[\s,]+/)) {
    const clean = word.replace(/[^\p{L}\p{N}'-]/gu, "");
    if (clean && !STOP_WORDS.has(clean.toLowerCase())) add(clean);
  }
  if (input.category) add(input.category);
  add("wall art");
  return out.slice(0, 10);
}

export type ImageKind = "main" | "room";

export interface ImageNaming {
  title: string;
  /** version of the artwork, when it has several */
  version?: string | null;
  finish?: string;
  kind: ImageKind;
  /** 1-based, only used to keep several room photos distinct */
  index?: number;
}

const FINISH_PHRASE: Record<string, string> = {
  unframed: "",
  framed: ", in a black wood frame",
  canvas: ", on a gallery wrapped canvas",
};

/**
 * Alt text is the part of an image that search engines and screen readers actually read.
 * Sanity serves images from a content hash, so the file name never appears in a URL and cannot
 * help ranking; this can. Built only from what we know to be true about the product, because
 * inventing what a photo shows is both a lie and a penalty.
 */
export function imageAlt({ title, version, finish, kind, index }: ImageNaming): string {
  const colorway = version ? `, ${version} colorway` : "";
  const framing = FINISH_PHRASE[finish ?? "unframed"] ?? "";
  const shown = kind === "room" ? " shown on a wall" : "";
  const nth = kind === "room" && index && index > 1 ? `, view ${index}` : "";
  return `${title.trim()} wall art print${shown}${colorway}${framing}${nth}`;
}

/** A readable, unique file name. It never reaches a URL, but it makes the media library findable. */
export function imageFileName({ title, version, finish, kind, index }: ImageNaming, extension = "webp"): string {
  const slug = (text: string) =>
    text
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/(^-|-$)/g, "");
  const parts = [slug(title), version ? slug(version) : "", finish && finish !== "unframed" ? slug(finish) : ""];
  if (kind === "room") parts.push(`wall-${index ?? 1}`);
  return `${parts.filter(Boolean).join("-")}.${extension}`;
}
