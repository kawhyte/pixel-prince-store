import { Resend } from "resend";
import { renderBrandedEmail, escapeHtml } from "./email-template";

export interface EmailProvider {
  addToAudience(email: string): Promise<void>;
  sendDownloadEmail(opts: {
    to: string;
    artTitle: string;
    downloadUrl: string;
  }): Promise<void>;
  sendWelcomeEmail(to: string): Promise<void>;
}

const FROM = process.env.EMAIL_FROM || "The Pixel Prince <hello@thepixelprince.com>";

function resendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  return new Resend(key);
}

export const emailProvider: EmailProvider = {
  async addToAudience(email) {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) throw new Error("RESEND_AUDIENCE_ID not configured");
    await resendClient().contacts.create({ email, audienceId, unsubscribed: false });
  },

  async sendDownloadEmail({ to, artTitle, downloadUrl }) {
    const safeTitle = escapeHtml(artTitle);
    const html = renderBrandedEmail({
      preheader: `${artTitle} is ready to download.`,
      heading: "Your download is ready",
      bodyHtml: `
        <p style="margin:0 0 12px 0;"><strong>${safeTitle}</strong> is waiting for you.</p>
        <p style="margin:0 0 12px 0;font-size:13px;color:#6b6b6b;">This link works for 72 hours. Personal use only, see the license note included with your file.</p>
        <p style="margin:0;font-size:13px;color:#6b6b6b;"><a href="https://www.thepixelprince.com/prints?utm_source=pixelprince&utm_medium=email&utm_campaign=download" style="color:#c2521f;">Printed prints, shipped free in the US</a></p>`,
      cta: { label: "Download your print", url: downloadUrl },
    });
    await resendClient().emails.send({
      from: FROM,
      to,
      subject: `Your free print: ${artTitle}`,
      html,
    });
  },

  async sendWelcomeEmail(to) {
    const html = renderBrandedEmail({
      preheader: "Player 2 has entered your inbox.",
      heading: "Hey, I'm Kenny",
      bodyHtml: `
        <p style="margin:0 0 12px 0;">I design retro gaming and map wall art. Every piece drawn by an actual human.</p>
        <p style="margin:0 0 12px 0;">Here's the deal: <strong>one email a month</strong> with a brand-new free print, plus whatever's new in the shop. That's it. No spam.</p>
        <p style="margin:0;">
          <a href="https://www.thepixelprince.com/prints?utm_source=pixelprince&utm_medium=email&utm_campaign=welcome" style="color:#c2521f;">Browse the prints</a>
        </p>`,
    });
    await resendClient().emails.send({
      from: FROM,
      to,
      subject: "Welcome: here's how the free prints work",
      html,
    });
  },
};
