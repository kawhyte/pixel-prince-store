/**
 * A new shop listing should read like a listing, not like a form waiting to be filled in
 * (PLAN-52). These write the first draft: good enough to publish, plain enough that Kenny can
 * see what to improve. Studio's AI button rewrites them, and he rewrites the ones that matter.
 *
 * Pure and tested. No em dashes, house rule.
 */

export interface CopyInput {
  title: string;
  category?: string;
  /** finishes on sale, in FINISHES order */
  finishes?: string[];
  /** version names, when the print comes several ways */
  versions?: string[];
}

const CATEGORY_LEAD: Record<string, (title: string) => string> = {
  Maps: (t) => `${t}, drawn by hand and colour blocked so the whole place reads at a glance.`,
  "Video Games": (t) => `${t}, built from the palettes and shapes of the games worth remembering.`,
  Quotes: (t) => `${t}, set in type that earns its place on a wall rather than shouting from it.`,
  Funny: (t) => `${t}. It is a joke you will still like in a year, which is the hard part.`,
  Minimalist: (t) => `${t}, stripped back to the few shapes that carry it.`,
  Botanical: (t) => `${t}, drawn from the plant rather than traced from a stock photo.`,
};

const PAPER = "Printed to order on 189 gsm museum grade matte paper with archival inks, shipped flat or in a tube.";

/** The card and meta description. Sanity caps this at 200 characters. */
export function draftDescription(input: CopyInput): string {
  const lead = (CATEGORY_LEAD[input.category ?? ""] ?? ((t: string) => `${t}, drawn by hand and printed to order.`))(
    input.title.trim()
  );
  const versions = input.versions ?? [];
  const colourway =
    versions.length > 1 ? ` ${versions.slice(0, -1).join(", ")} or ${versions[versions.length - 1]}.` : "";
  const out = `${lead}${colourway} Museum grade matte paper, printed to order.`;
  return out.length <= 200 ? out : `${out.slice(0, 197).trimEnd()}...`;
}

/** The longer body on the print page. Two short paragraphs. */
export function draftLongDescription(input: CopyInput): string {
  const title = input.title.trim();
  const lead = (CATEGORY_LEAD[input.category ?? ""] ?? ((t: string) => `${t}, drawn by hand.`))(title);
  const versions = input.versions ?? [];
  const finishes = input.finishes ?? [];

  const choice: string[] = [];
  if (versions.length > 1) {
    choice.push(`It comes in ${versions.length} colourways, ${versions.slice(0, -1).join(", ")} and ${versions[versions.length - 1]}, so you can match the room rather than work around the print.`);
  }
  if (finishes.length > 1) {
    const names = finishes.map((f) => (f === "unframed" ? "unframed" : f));
    choice.push(`Pick it ${names.slice(0, -1).join(", ")} or ${names[names.length - 1]}.`);
  }

  const second = [choice.join(" "), PAPER].filter(Boolean).join(" ");
  return `${lead} Five sizes, from 8x10 for a desk wall up to 24x36 when it needs to hold a room on its own.\n\n${second}`;
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
