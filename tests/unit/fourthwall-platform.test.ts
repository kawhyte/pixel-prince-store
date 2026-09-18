import { describe, it, expect, vi } from "vitest";
import {
  productName,
  titleFromFilename,
  readImageDims,
  dimsWarning,
  designProductBody,
  createPlatformClient,
  listAllProducts,
  PlatformError,
  SIZE_NAMES,
  TEMPLATES,
  sizeNameForId,
  sizeNamesFor,
} from "@/lib/fourthwall-platform";
import { RATIO_FAMILIES, SHOP_SIZE_LADDER } from "@/config/commerce";

function png(width: number, height: number): Uint8Array {
  const b = new Uint8Array(33);
  b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const dv = new DataView(b.buffer);
  dv.setUint32(8, 13);
  b.set([0x49, 0x48, 0x44, 0x52], 12);
  dv.setUint32(16, width);
  dv.setUint32(20, height);
  return b;
}

function jpeg(width: number, height: number): Uint8Array {
  // SOI, APP0 (length 16), SOF0 (length 17) with height/width
  const b = new Uint8Array(2 + 18 + 19);
  b.set([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  b.set([0xff, 0xc0, 0x00, 0x11, 0x08], 20);
  const dv = new DataView(b.buffer);
  dv.setUint16(25, height);
  dv.setUint16(27, width);
  return b;
}

describe("fourthwall platform helpers", () => {
  it("names products for the PLAN-46 import", () => {
    expect(productName("Sweden Map", "poster")).toBe("Sweden Map");
    expect(productName("Sweden Map ", "framed")).toBe("Sweden Map | Framed");
    expect(productName("Sweden Map", "canvas")).toBe("Sweden Map | Canvas");
    expect(titleFromFilename("Sweden Map.png")).toBe("Sweden Map");
    expect(titleFromFilename("Old | Trafford.jpeg")).toBe("Old Trafford");
  });

  it("reads PNG and JPEG dimensions and reports what a master can actually print", () => {
    expect(readImageDims(png(4800, 6000))).toEqual({ width: 4800, height: 6000, contentType: "image/png" });
    expect(readImageDims(jpeg(2400, 3000))).toEqual({ width: 2400, height: 3000, contentType: "image/jpeg" });
    expect(readImageDims(new Uint8Array([1, 2, 3]))).toBeNull();
    // 4800x6000 used to pass silently. It is 300 dpi at 16x20 and 167 at the 24x36 the shop
    // actually sells, so it now says so: the old rule only ever measured 8x10.
    expect(dimsWarning({ width: 4800, height: 6000, contentType: "image/png" })).toMatch(/167 dpi/);
    expect(dimsWarning({ width: 1200, height: 1500, contentType: "image/png" })).toMatch(/below/);
    // A square is a legal orientation for Fourthwall (the toggle is Vertical | Square), so the
    // deprecated shim judges it on resolution. The create script still refuses it earlier, because
    // detectRatio finds no family on the ladder for 1:1.
    expect(dimsWarning({ width: 3000, height: 3000, contentType: "image/png" })).toMatch(/dpi/);
  });

  it("builds the verified create-product body", () => {
    const body = designProductBody({ finish: "framed", title: "Sweden Map", imageId: "img1", marginUsd: 30 });
    expect(body).toMatchObject({
      type: "design",
      productTemplateId: TEMPLATES.framed.id,
      name: "Sweden Map | Framed",
      regions: [{ region: "default", imageId: "img1", placementStrategy: "FULL_REGION" }],
      // Only the default ratio's sizes: a product carries one master, so it sells only the sizes
      // whose paper matches that master's shape. The rest live on sibling products.
      sizes: sizeNamesFor("4:5", "framed"),
      colors: ["Black", "Red Oak", "White"],
      profitMargin: 30,
      publishOnCreate: false,
    });
    expect(designProductBody({ finish: "poster", title: "X", imageId: "i", marginUsd: 18 })).not.toHaveProperty("colors");
    expect(designProductBody({ finish: "framed", title: "X", imageId: "i", marginUsd: 30, frameColors: ["White"] })).toMatchObject({ colors: ["White"] });
  });


  it("a tagged ratio names the product and narrows its sizes", () => {
    const body = designProductBody({ finish: "poster", title: "Sweden Map", ratio: "2:3", imageId: "i", marginUsd: 18 });
    expect(body).toMatchObject({ name: "Sweden Map [2x3]", sizes: ['24" x 36"'] });
    const framed = designProductBody({ finish: "framed", title: "Sweden Map", ratio: "3:4", imageId: "i", marginUsd: 30 });
    expect(framed).toMatchObject({ name: "Sweden Map [3x4] | Framed", sizes: ['18" x 24"'] });
  });

  it("every ratio's product together covers the whole ladder exactly once", () => {
    const all = RATIO_FAMILIES.flatMap((f) => sizeNamesFor(f.ratio, "poster"));
    expect(new Set(all).size).toBe(all.length);
    expect(all.sort()).toEqual(SHOP_SIZE_LADDER.map((s) => sizeNameForId(s.id)).sort());
  });

  it("client sends basic auth and pages the product list", async () => {
    const seen: string[] = [];
    const fetchImpl = vi.fn(async (url: string, init?: RequestInit) => {
      seen.push(`${init?.method} ${url} ${(init?.headers as Record<string, string>)?.Authorization?.slice(0, 6)}`);
      const page = Number(new URL(url).searchParams.get("page"));
      const results = page === 0 ? Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, name: `P${i}` })) : [{ id: "p100", name: "P100" }];
      return new Response(JSON.stringify({ results }), { status: 200 });
    }) as unknown as typeof fetch;
    const client = createPlatformClient("user", "pass", fetchImpl);
    const all = await listAllProducts(client);
    expect(all).toHaveLength(101);
    expect(seen[0]).toMatch(/^GET https:\/\/api\.fourthwall\.com\/open-api\/v1\.0\/products\?page=0&size=100 Basic /);
  });

  it("client throws a PlatformError with the status", async () => {
    const fetchImpl = vi.fn(async () => new Response('{"code":"X"}', { status: 400 })) as unknown as typeof fetch;
    const client = createPlatformClient("u", "p", fetchImpl);
    await expect(client.post("/products", {})).rejects.toBeInstanceOf(PlatformError);
    await expect(client.post("/products", {})).rejects.toMatchObject({ status: 400 });
  });
});

describe("masters folder", () => {
  it("walks subfolders, skips dot and underscore folders, and keeps art files only", async () => {
    const { listMasterFiles } = await import("@/lib/fourthwall-platform");
    const dir = (name: string) => ({ name, isDirectory: () => true });
    const file = (name: string) => ({ name, isDirectory: () => false });
    const tree: Record<string, { name: string; isDirectory(): boolean }[]> = {
      "/m": [dir("maps"), dir("_done"), dir(".git"), file("Loose Print.png"), file("notes.txt")],
      "/m/maps": [file("Brooklyn (Earth).png"), file("Brooklyn (Bright).jpg"), dir("wip")],
      "/m/maps/wip": [file("Queens.png")],
      "/m/_done": [file("Sold Out.png")],
      "/m/.git": [file("nope.png")],
    };
    const got = listMasterFiles("/m", (d) => tree[d] ?? []);
    expect(got.map((m) => m.path)).toEqual([
      "Loose Print.png",
      "maps/Brooklyn (Bright).jpg",
      "maps/Brooklyn (Earth).png",
      "maps/wip/Queens.png",
    ]);
    expect(got.find((m) => m.file === "Queens.png")?.group).toBe("maps/wip");
  });
});
