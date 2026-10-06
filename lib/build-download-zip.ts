import archiver from "archiver";
import { PassThrough, Readable } from "stream";
import { createReadStream, existsSync, readdirSync } from "fs";
import path from "path";

const EXTRAS_DIR = path.join(process.cwd(), "assets", "download-extras");

// Everything in EXTRAS_DIR ships in every download: drop-in, no code change
// to add/replace extras. README.md is the folder's own docs; never bundle it.
const EXTRAS_IGNORE = new Set(["README.md", ".DS_Store"]);

/**
 * Streams a ZIP of: master PNG (fetched from its URL) + every file in
 * assets/download-extras/ (the printing guide, LICENSE.txt, …).
 * Never buffers the PNG fully in memory.
 */
export async function buildDownloadZip(opts: {
  fileUrl: string;
  pngName: string; // e.g. "Ethereal-Dreams.png"
}): Promise<ReadableStream> {
  const res = await fetch(opts.fileUrl);
  if (!res.ok || !res.body) {
    throw new Error(`Master file fetch failed (${res.status})`);
  }
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    // Legacy Drive links can serve an HTML interstitial: never zip that.
    throw new Error(`Master file URL returned ${contentType}, not an image`);
  }

  const archive = archiver("zip", { zlib: { level: 1 } }); // PNGs are pre-compressed; level 1 = fast
  const out = new PassThrough();
  // Without a listener, a failed master stream would throw out of the process.
  archive.on("warning", (e) => console.warn("[CLAIM-ART] zip warning", e));
  archive.on("error", (e) => {
    console.error("[CLAIM-ART] zip failed mid-stream", e);
    out.destroy(e);
  });
  archive.pipe(out);

  archive.append(Readable.fromWeb(res.body as import("stream/web").ReadableStream), { name: opts.pngName });

  if (existsSync(EXTRAS_DIR)) {
    for (const name of readdirSync(EXTRAS_DIR)) {
      if (EXTRAS_IGNORE.has(name)) continue;
      const filePath = path.join(EXTRAS_DIR, name);
      if (!existsSync(filePath)) {
        console.warn(`[CLAIM-ART] missing extra: ${name}`);
        continue;
      }
      archive.append(createReadStream(filePath), { name });
    }
  }
  void archive.finalize();

  return Readable.toWeb(out) as ReadableStream;
}
