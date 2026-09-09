import { ImageResponse } from "next/og";
import { getProductBySlug } from "@/sanity/lib/client";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const art = await getProductBySlug(id);
  const title = art?.title ?? "The Pixel Prince";
  const titleFontSize = title.length > 40 ? 40 : title.length > 24 ? 48 : 56;

  return new ImageResponse(
    (
      <div style={{
        width: "100%", height: "100%", display: "flex",
        background: "#f3f1e8", alignItems: "center", padding: 48, gap: 48,
      }}>
        {art?.previewImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={art.previewImage} width={420} height={534}
               style={{ borderRadius: 24, objectFit: "cover", flexShrink: 0 }} alt="" />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: titleFontSize, fontWeight: 700, color: "#2a2a2a", lineHeight: 1.15 }}>
            {title}
          </div>
          <div style={{ fontSize: 28, color: "#c2521f" }}>Free printable wall art</div>
          <div style={{ fontSize: 24, color: "#4a4a4a" }}>thepixelprince.com</div>
        </div>
      </div>
    ),
    size
  );
}
