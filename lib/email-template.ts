// Branded transactional email wrapper for The Pixel Prince.
//
// Email-safe rules baked in (see docs/PLAN-18): table-based layout, inline
// styles only, no flexbox/grid/web-fonts, explicit background-color + color on
// every text element (dark-mode safe), max width 560px, single column.
//
// Brand tokens (from app/globals.css): background #f3f1e8, card #fdfcfa,
// text #2a2a2a, muted #6b6b6b, accent #c2521f, button radius 8px.

export interface BrandedEmailOpts {
  /** Hidden preview text shown in the inbox list. */
  preheader?: string;
  heading: string;
  /**
   * Trusted internal HTML only: NEVER interpolate raw user input here.
   * Escape untrusted values (e.g. an art title) with escapeHtml() first.
   */
  bodyHtml: string;
  cta?: { label: string; url: string };
}

/** Escape a string for safe interpolation into trusted HTML (e.g. `M&M's Map`). */
export function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const BG = "#f3f1e8";
const CARD = "#fdfcfa";
const TEXT = "#2a2a2a";
const MUTED = "#6b6b6b";
const ACCENT = "#c2521f";
const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";

export function renderBrandedEmail(opts: BrandedEmailOpts): string {
  const { preheader, heading, bodyHtml, cta } = opts;

  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${BG};">${preheader}</div>`
    : "";

  // TODO(wordmark asset): swap this text wordmark for a Cloudinary-hosted PNG
  // <img> when PLAN-14 E4 delivers the pixel wordmark.
  const wordmark = `<span style="font-family:${FONT};letter-spacing:2px;font-weight:700;font-size:14px;color:${TEXT};">THE PIXEL PRINCE</span>`;

  const ctaHtml = cta
    ? `<tr><td style="padding:8px 32px 28px 32px;background-color:${CARD};">
        <a href="${cta.url}" style="background-color:${ACCENT};color:#ffffff;padding:14px 28px;border-radius:8px;text-decoration:none;font-family:${FONT};font-weight:700;display:inline-block;font-size:15px;">${cta.label}</a>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
</head>
<body style="margin:0;padding:0;background-color:${BG};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BG};">
  <tr>
    <td align="center" style="padding:32px 16px;">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background-color:${CARD};border-radius:8px;">
        <tr>
          <td style="padding:28px 32px 12px 32px;background-color:${CARD};border-bottom:1px solid #eae6da;">
            ${wordmark}
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px 32px;background-color:${CARD};">
            <h1 style="margin:0;font-family:${FONT};font-size:22px;font-weight:700;color:${TEXT};line-height:1.3;">${heading}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 32px 8px 32px;background-color:${CARD};font-family:${FONT};font-size:15px;color:${TEXT};line-height:1.6;">
            ${bodyHtml}
          </td>
        </tr>
        ${ctaHtml}
        <tr>
          <td style="padding:20px 32px 28px 32px;background-color:${CARD};border-top:1px solid #eae6da;font-family:${FONT};font-size:12px;color:${MUTED};line-height:1.6;">
            - Kenny, The Pixel Prince
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}
