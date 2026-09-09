import { describe, it, expect } from "vitest";
import { renderBrandedEmail, escapeHtml } from "@/lib/email-template";

describe("renderBrandedEmail", () => {
  const html = renderBrandedEmail({
    preheader: "Player 2 has entered your inbox.",
    heading: "Your download is ready",
    bodyHtml: "<p>Body content here.</p>",
    cta: { label: "Download your print", url: "https://example.com/claim?token=abc123" },
  });

  it("includes the CTA url verbatim", () => {
    expect(html).toContain("https://example.com/claim?token=abc123");
    expect(html).toContain("Download your print");
  });

  it("includes the preheader preview text", () => {
    expect(html).toContain("Player 2 has entered your inbox.");
  });

  it("uses the accent color token", () => {
    expect(html).toContain("#c2521f");
  });

  it("uses table-based layout with inline styles only (no class attrs)", () => {
    expect(html).not.toContain("class=");
    expect(html).toContain('role="presentation"');
  });

  it("renders the wordmark and heading", () => {
    expect(html).toContain("THE PIXEL PRINCE");
    expect(html).toContain("Your download is ready");
  });

  it("does not use serif or web fonts", () => {
    expect(html).not.toContain("Georgia");
    expect(html).toContain("-apple-system");
  });

  it("omits the CTA block when no cta is passed", () => {
    const noCta = renderBrandedEmail({ heading: "Hi", bodyHtml: "<p>x</p>" });
    expect(noCta).not.toContain("border-radius:8px;text-decoration:none");
  });
});

describe("escapeHtml", () => {
  it("escapes ampersands, angle brackets, and quotes", () => {
    expect(escapeHtml("M&M's <Map>")).toBe("M&amp;M&#39;s &lt;Map&gt;");
    expect(escapeHtml('"quoted"')).toBe("&quot;quoted&quot;");
  });
});

describe("download email HTML (via wrapper)", () => {
  const html = renderBrandedEmail({
    preheader: "Zelda Map is ready to download.",
    heading: "Your download is ready",
    bodyHtml: `<p><strong>${escapeHtml("Zelda Map")}</strong> is waiting for you.</p>
      <p>This link works for 72 hours.</p>
      <p><a href="https://thepixelprince.etsy.com?utm_source=pixelprince&utm_medium=email&utm_campaign=download">Printed versions on Etsy</a></p>`,
    cta: { label: "Download your print", url: "https://example.com/download" },
  });

  it("contains the download url", () => {
    expect(html).toContain("https://example.com/download");
  });

  it("contains the 72 hours note", () => {
    expect(html).toContain("72 hours");
  });

  it("preserves the download UTM string exactly", () => {
    expect(html).toContain(
      "utm_source=pixelprince&utm_medium=email&utm_campaign=download",
    );
  });
});
