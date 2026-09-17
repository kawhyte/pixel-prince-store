/**
 * Fourthwall Platform API helpers (PLAN-47). Server-side scripts only: the API user has full
 * shop access and must never reach the browser or Vercel. Pure helpers are unit-tested; the
 * client wraps fetch with Basic auth (Node's fetch decodes gzip on its own).
 */

import { DEFAULT_RATIO, RATIO_FAMILIES, ratioTag, type RatioId } from "@/config/commerce";

export const PLATFORM_BASE = "https://api.fourthwall.com/open-api/v1.0";

/**
 * Verified template ids (docs/PLAN-47). Whether the API can create from a template is not a
 * guess: `GET /product-templates/page/{n}` returns `supportsBackendRendering` per template.
 * Checked 2026-09-10: both poster templates true, both canvas templates false. So canvas is a
 * dashboard job whichever canvas you pick, and switching to Thin Canvas would not change that.
 */
export const TEMPLATES = {
  poster: { id: "pro_15bc29bc8a324d449d", label: "Enhanced Matte Paper Poster (in)", apiCreatable: true },
  framed: { id: "pro_kRSsoYjwSoyyTEmWko5o0A", label: "Framed High-Quality Matte Poster (in)", apiCreatable: true },
  /** thick gallery wrap, 46 sizes, cheaper at 20x30 and up. The one our copy describes. */
  canvas: { id: "pro_f0b3df34ce6144fb86", label: "Canvas (in)", apiCreatable: false },
  /** thin profile on pine with a wall mount, 13 sizes, cheaper below 20x30 */
  canvasThin: { id: "pro__bw1lug-S9qtAWjykD6lmQ", label: "Thin Canvas (in)", apiCreatable: false },
} as const;

export type ApiFinish = "poster" | "framed";

/** Ladder sizes in the exact strings each template expects. */
/**
 * Ladder sizes in the exact strings each template expects. Verified against the templates on
 * 2026-09-10; trimmed to five on 2026-09-17 to match config/commerce.ts, which explains why.
 * Both templates carry all five, so every size offers every finish. Canvas is listed for the
 * dashboard reminder only, because the API cannot create it.
 */
export const SIZE_NAMES = {
  poster: ['8" x 10"', '11" x 14"', '16" x 20"', '18" x 24"', '24" x 36"'],
  framed: ['8" x 10"', '11" x 14"', '16" x 20"', '18" x 24"', '24" x 36"'],
  canvas: ["11″×14″", "16″×20″", "18″×24″", "24″×36″"],
} as const;

export const FRAME_COLORS = ["Black", "Red Oak", "White"] as const;

/** '8x10' -> '8" x 10"', the string the templates expect. */
export function sizeNameForId(sizeId: string): string {
  const [w, h] = sizeId.split("x");
  return `${w}" x ${h}"`;
}

/**
 * The size strings one product should carry, for one ratio and one finish.
 *
 * A product per ratio is the whole point: it holds only the sizes whose paper matches its master,
 * so every print reaches the edge of the sheet. Sizes the template does not stock are dropped, and
 * a family with none left produces no product at all.
 */
export function sizeNamesFor(ratio: RatioId, finish: ApiFinish): string[] {
  const family = RATIO_FAMILIES.find((f) => f.ratio === ratio);
  if (!family) return [];
  const stocked = new Set<string>(SIZE_NAMES[finish]);
  return family.sizeIds.map(sizeNameForId).filter((n) => stocked.has(n));
}

/** "World Map with Flags [3x4].png" -> "3x4", or null when the name carries no tag. */
export function ratioTagFromFilename(filename: string): string | null {
  const m = filename.replace(/\.[^.]+$/, "").match(/\[([0-9]+x[0-9]+)\]\s*$/i);
  return m ? m[1].toLowerCase() : null;
}

/**
 * The ratio a master really is, from its pixels rather than its name.
 *
 * The tag is a hint for the human reading the folder; the pixels are the truth. A file saved under
 * the wrong tag would otherwise create a product whose sizes do not match its artwork, and the
 * mistake would only show up on printed paper.
 */
export function detectRatio(d: ImageDims, tolerance = 0.015): RatioId | null {
  const r = Math.min(d.width, d.height) / Math.max(d.width, d.height);
  let best: { ratio: RatioId; off: number } | null = null;
  for (const f of RATIO_FAMILIES) {
    const [a, b] = f.ratio.split(":").map(Number);
    const want = Math.min(a, b) / Math.max(a, b);
    const off = Math.abs(want - r) / want;
    if (!best || off < best.off) best = { ratio: f.ratio, off };
  }
  return best && best.off <= tolerance ? best.ratio : null;
}

/**
 * Product names the PLAN-46 import groups into one artwork.
 *
 * One artwork can now be several products per finish, one per aspect ratio, so the ratio goes in
 * the name. 4:5 stays bare: every product made before 2026-09-17 is named this way with a 4:5
 * master behind it, and tagging it now would orphan all of them.
 *
 *   Retro Consoles (Beige)                  4:5 poster
 *   Retro Consoles (Beige) | Framed         4:5 framed
 *   Retro Consoles (Beige) [2x3]            2:3 poster
 *   Retro Consoles (Beige) [2x3] | Framed   2:3 framed
 */
export function productName(title: string, finish: "poster" | "framed" | "canvas", ratio: RatioId = DEFAULT_RATIO): string {
  const t = title.trim();
  const tagged = ratio === DEFAULT_RATIO ? t : `${t} [${ratioTag(ratio)}]`;
  if (finish === "poster") return tagged;
  return `${tagged} | ${finish === "framed" ? "Framed" : "Canvas"}`;
}

/**
 * "Sweden Map [3x4].png" -> "Sweden Map". Pipes are stripped so titles never collide with a finish
 * suffix, and the ratio tag comes off so every ratio of one artwork shares a title and lands on one
 * Sanity artwork.
 */
export function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.[^.]+$/, "")
    .replace(/\s*\[[0-9]+x[0-9]+\]\s*$/i, "")
    .replace(/\s*\|\s*/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export interface ImageDims {
  width: number;
  height: number;
  contentType: "image/png" | "image/jpeg";
}

/** Reads PNG (IHDR) or JPEG (SOF marker) dimensions from the first bytes. Returns null for anything else. */
export function readImageDims(buf: Uint8Array): ImageDims | null {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // PNG: 8-byte signature, then IHDR chunk with width/height at offsets 16 and 20
  if (buf.length >= 24 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return { width: dv.getUint32(16), height: dv.getUint32(20), contentType: "image/png" };
  }
  // JPEG: scan markers for SOF0..SOF15 (except DHT/JPG/DAC), height then width
  if (buf.length >= 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
        i += 2;
        continue;
      }
      const len = dv.getUint16(i + 2);
      const isSof = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSof) return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7), contentType: "image/jpeg" };
      i += 2 + len;
    }
  }
  return null;
}

/** What a print shop calls full resolution, and the lowest a paying customer should ever receive. */
export const PRINT_DPI_TARGET = 300;
export const PRINT_DPI_FLOOR = 150;

/** '24" x 36"' -> [24, 36]. The size strings are the one source of truth for the ladder. */
export function inchesFromSizeName(name: string): [number, number] | null {
  const m = name.match(/(\d+(?:\.\d+)?)\s*"?\s*[x×]\s*(\d+(?:\.\d+)?)/i);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

/**
 * The dpi a master delivers at one print size, whichever way up it is. A landscape master printed
 * at "16x20" is being printed 20 wide by 16 tall, so the short side of the paper is matched to the
 * short side of the file.
 */
export function dpiAtSize(d: ImageDims, inches: [number, number]): number {
  const [a, b] = inches;
  const long = Math.max(a, b);
  const short = Math.min(a, b);
  const [pw, ph] = d.width >= d.height ? [long, short] : [short, long];
  return Math.min(d.width / pw, d.height / ph);
}

export interface MasterQuality {
  /** false blocks creation: the biggest size the shop sells would print below the floor */
  ok: boolean;
  dpiAtLargest: number;
  largestSize: string;
  /** the biggest size this master still prints at 300 dpi, or null if none do */
  largestAt300: string | null;
  message: string | null;
}

/**
 * Whether a master can carry the whole ladder.
 *
 * The old check only looked for 2400x3000, which is 300 dpi at 8x10 and says nothing about the
 * 24x36 the shop actually sells: a file printing at 100 dpi on the largest size passed it without
 * a word. This measures the size that is hardest to satisfy, refuses below the floor rather than
 * warning, and names the largest size the file is genuinely good for so the answer is actionable.
 */
export function masterQuality(d: ImageDims, sizeNames: readonly string[]): MasterQuality {
  const sizes = sizeNames
    .map((n) => ({ name: n, inches: inchesFromSizeName(n) }))
    .filter((s): s is { name: string; inches: [number, number] } => s.inches !== null)
    .sort((a, b) => a.inches[0] * a.inches[1] - b.inches[0] * b.inches[1]);

  if (sizes.length === 0) return { ok: true, dpiAtLargest: 0, largestSize: "", largestAt300: null, message: null };

  const largest = sizes[sizes.length - 1];
  const dpiAtLargest = dpiAtSize(d, largest.inches);
  const at300 = sizes.filter((s) => dpiAtSize(d, s.inches) >= PRINT_DPI_TARGET);
  const largestAt300 = at300.length > 0 ? at300[at300.length - 1].name : null;

  const px = `${d.width}×${d.height} px`;
  if (dpiAtLargest < PRINT_DPI_FLOOR) {
    return {
      ok: false,
      dpiAtLargest,
      largestSize: largest.name,
      largestAt300,
      message:
        `${px} prints at ${Math.round(dpiAtLargest)} dpi on ${largest.name}, below the ${PRINT_DPI_FLOOR} dpi floor. ` +
        (largestAt300 ? `Good to ${largestAt300} at ${PRINT_DPI_TARGET} dpi.` : `Not ${PRINT_DPI_TARGET} dpi at any size in the ladder.`),
    };
  }
  if (dpiAtLargest < PRINT_DPI_TARGET) {
    return {
      ok: true,
      dpiAtLargest,
      largestSize: largest.name,
      largestAt300,
      message:
        `${px} prints at ${Math.round(dpiAtLargest)} dpi on ${largest.name}, under ${PRINT_DPI_TARGET}. ` +
        (largestAt300 ? `Full resolution only to ${largestAt300}.` : ""),
    };
  }
  return { ok: true, dpiAtLargest, largestSize: largest.name, largestAt300, message: null };
}

/** The aspect the poster template expects. A master outside it is letterboxed, not cropped. */
export function ratioWarning(d: ImageDims): string | null {
  const ratio = d.width / d.height;
  if (ratio < 0.76 || ratio > 0.84) {
    return `ratio ${ratio.toFixed(2)} is not 4:5. Fourthwall's poster template has a portrait print area, so this is letterboxed onto the sheet with blank paper above and below, not cropped (verified against a real mockup 2026-09-17).`;
  }
  return null;
}

/** @deprecated kept so older callers still compile; prefer masterQuality + ratioWarning. */
export function dimsWarning(d: ImageDims): string | null {
  return ratioWarning(d) ?? masterQuality(d, SIZE_NAMES.poster).message;
}

export interface MasterDirEntry {
  name: string;
  isDirectory(): boolean;
}

export interface MasterFile {
  /** path relative to the masters root, e.g. "maps/Brooklyn (Earth).png" */
  path: string;
  /** file name only, the artwork title plus version */
  file: string;
  /** subfolder it came from, "" at the root. Organisation only: the shop reads none of it. */
  group: string;
}

/**
 * Print files under a masters folder, walked recursively so art can be filed by type
 * ("maps/", "video-games/"). Folders starting with "." or "_" are skipped, so "_done/"
 * is a place to move art that is already live. Sorted by path for stable runs.
 */
export function listMasterFiles(
  dir: string,
  read: (d: string) => MasterDirEntry[],
  group = "",
  depth = 0,
): MasterFile[] {
  if (depth > 4) return [];
  const out: MasterFile[] = [];
  for (const entry of read(dir)) {
    if (entry.name.startsWith(".") || entry.name.startsWith("_")) continue;
    const path = group ? `${group}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...listMasterFiles(`${dir}/${entry.name}`, read, path, depth + 1));
    } else if (/\.(png|jpe?g)$/i.test(entry.name)) {
      out.push({ path, file: entry.name, group });
    }
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export interface PlatformClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body: unknown): Promise<T>;
  put<T>(path: string, body: unknown): Promise<T>;
  del(path: string): Promise<void>;
}

export class PlatformError extends Error {
  constructor(message: string, public status: number, public body: string) {
    super(message);
  }
}

export function createPlatformClient(user: string, password: string, fetchImpl: typeof fetch = fetch): PlatformClient {
  const auth = "Basic " + Buffer.from(`${user}:${password}`).toString("base64");
  async function run<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetchImpl(`${PLATFORM_BASE}${path}`, {
      method,
      headers: { Authorization: auth, ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new PlatformError(`Fourthwall ${method} ${path} -> ${res.status}`, res.status, text.slice(0, 400));
    return (text ? JSON.parse(text) : undefined) as T;
  }
  return {
    get: (path) => run("GET", path),
    post: (path, body) => run("POST", path, body),
    put: (path, body) => run("PUT", path, body),
    del: async (path) => {
      await run("DELETE", path);
    },
  };
}

export interface CreatedProduct {
  productId: string;
  images?: { url: string }[];
}

export interface PlatformProduct {
  id: string;
  name: string;
  slug?: string;
  access?: { type?: string };
  state?: { type?: string };
}

/** Every product in the shop (any access), for idempotency checks. */
export async function listAllProducts(client: PlatformClient): Promise<PlatformProduct[]> {
  const out: PlatformProduct[] = [];
  for (let page = 0; page < 50; page++) {
    const res = await client.get<{ results?: PlatformProduct[] }>(`/products?page=${page}&size=100`);
    const items = res.results ?? [];
    out.push(...items);
    if (items.length < 100) break;
  }
  return out;
}

/** Upload a master to the media library and return its image id. */
export async function uploadMedia(
  client: PlatformClient,
  bytes: Uint8Array,
  fileName: string,
  dims: ImageDims,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const up = await client.post<{ uploadUrl: string; fileUrl: string }>("/media/upload-url", {
    fileName,
    contentType: dims.contentType,
    size: bytes.byteLength,
  });
  const put = await fetchImpl(up.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": dims.contentType, "x-goog-content-length-range": `0,${bytes.byteLength}` },
    body: bytes as unknown as BodyInit,
  });
  if (!put.ok) throw new PlatformError(`upload PUT -> ${put.status}`, put.status, await put.text());
  const saved = await client.post<{ id: string }>("/media/images", { fileUrl: up.fileUrl, width: dims.width, height: dims.height });
  return saved.id;
}

/**
 * One profit margin for the whole product, which is all Fourthwall accepts. The price ladder in
 * `config/commerce.ts` is a price per size, and no single margin can produce it: on the framed
 * ladder the margin each size needs runs from $34.91 to $110.59.
 *
 * There is no second chance either. The Platform API's product endpoints are list, create, get,
 * inventory, availability, state and archive (checked against Fourthwall's own reference,
 * 2026-09-11). Nothing updates a price after creation, so every new product needs a pass in the
 * dashboard and `npm run shop:prices` exists to say which rows.
 */
export interface CreateDesignOptions {
  finish: ApiFinish;
  title: string;
  imageId: string;
  marginUsd: number;
  /** framed only; defaults to every frame color (one variant per color and size) */
  frameColors?: readonly (typeof FRAME_COLORS)[number][];
  publish?: boolean;
  description?: string;
}

export function designProductBody(o: CreateDesignOptions) {
  return {
    type: "design",
    productTemplateId: TEMPLATES[o.finish].id,
    name: productName(o.title, o.finish),
    ...(o.description ? { description: o.description } : {}),
    regions: [{ region: "default", imageId: o.imageId, placementStrategy: "FULL_REGION" }],
    sizes: [...SIZE_NAMES[o.finish]],
    ...(o.finish === "framed" ? { colors: [...(o.frameColors ?? FRAME_COLORS)] } : {}),
    profitMargin: o.marginUsd,
    publishOnCreate: o.publish === true,
  };
}

export function createDesignProduct(client: PlatformClient, o: CreateDesignOptions): Promise<CreatedProduct> {
  return client.post<CreatedProduct>("/products", designProductBody(o));
}

/** Publish or hide a product: PUT /products/{id}/state { state: PUBLIC | HIDDEN }. Archive is DELETE. */
export function setProductAccess(client: PlatformClient, productId: string, access: "PUBLIC" | "HIDDEN"): Promise<PlatformProduct> {
  return client.put<PlatformProduct>(`/products/${productId}/state`, { state: access });
}
