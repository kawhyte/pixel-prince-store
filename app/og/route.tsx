import { ImageResponse } from "next/og";

/**
 * The site-wide social preview, at a stable path.
 *
 * config/seo.json pointed every page's og:image at /og-image.jpg, a file that was never added to
 * public/, so the shop, the free gallery and every collection shared with no preview at all. This
 * replaces it with an image that is generated rather than uploaded, so it cannot go missing again.
 *
 * Deliberately dependency-free: no Sanity fetch, no remote image. It is the fallback every page
 * without art of its own falls back to, and a fallback that can fail is not one. Pages that do have
 * art (a print, a free download) keep their own opengraph-image route and never reach this.
 */
export const runtime = "edge";

const SIZE = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f3f1e8",
          padding: 72,
        }}
      >
        <div style={{ display: "flex", fontSize: 30, letterSpacing: 6, color: "#4a4a4a", textTransform: "uppercase" }}>
          The Pixel Prince
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 700, color: "#2a2a2a", lineHeight: 1.1 }}>
            Retro gaming and map wall art
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#4a4a4a" }}>
            Printed to order, shipped free in the US
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 30, color: "#c2521f" }}>thepixelprince.com</div>
          <div style={{ display: "flex", fontSize: 26, color: "#6b6b6b" }}>A new free printable every month</div>
        </div>
      </div>
    ),
    SIZE,
  );
}
