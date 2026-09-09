/**
 * Fourthwall Platform API helpers (PLAN-47). Server-side scripts only: the API user has full
 * shop access and must never reach the browser or Vercel. Pure helpers are unit-tested; the
 * client wraps fetch with Basic auth (Node's fetch decodes gzip on its own).
 */

export const PLATFORM_BASE = "https://api.fourthwall.com/open-api/v1.0";

/** Verified template ids on 2026-09-09 (docs/PLAN-47). */
export const TEMPLATES = {
  poster: { id: "pro_15bc29bc8a324d449d", label: "Enhanced Matte Paper Poster (in)" },
  framed: { id: "pro_kRSsoYjwSoyyTEmWko5o0A", label: "Framed High-Quality Matte Poster (in)" },
  /** not creatable through the API (backend rendering unsupported); listed for the reminder only */
  canvas: { id: "pro_f0b3df34ce6144fb86", label: "Canvas (in)" },
} as const;

export type ApiFinish = "poster" | "framed";

/** Ladder sizes in the exact strings each template expects. */
export const SIZE_NAMES = {
  poster: ['8" x 10"', '11" x 14"', '16" x 20"', '18" x 24"', '24" x 36"'],
  framed: ['8" x 10"', '11" x 14"', '16" x 20"', '18" x 24"', '24" x 36"'],
  canvas: ["8″×10″", "11″×14″", "16″×20″", "18″×24″", "24″×36″"],
} as const;

export const FRAME_COLORS = ["Black", "Red Oak", "White"] as const;

/** Product names the PLAN-46 import groups into one artwork. */
export function productName(title: string, finish: "poster" | "framed" | "canvas"): string {
  const t = title.trim();
  if (finish === "poster") return t;
  return `${t} | ${finish === "framed" ? "Framed" : "Canvas"}`;
}

/** "Sweden Map.png" -> "Sweden Map". Pipes are stripped so titles never collide with a finish suffix. */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, "").replace(/\s*\|\s*/g, " ").replace(/\s+/g, " ").trim();
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

/** Warn below 300 dpi at 8x10 (2400x3000); the ladder tops out at 24x36 which wants 7200x10800 for 300 dpi. */
export function dimsWarning(d: ImageDims): string | null {
  if (d.width < 2400 || d.height < 3000) return `only ${d.width}×${d.height} px, soft above 8x10`;
  const ratio = d.width / d.height;
  if (ratio < 0.76 || ratio > 0.84) return `ratio ${ratio.toFixed(2)} is not 4:5, the poster will crop`;
  return null;
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
