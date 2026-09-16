import { Resend } from "resend";
import { renderBrandedEmail, escapeHtml } from "./email-template";
// Replies go to an inbox that exists. The From address has to stay on the verified domain, and
// hitting Reply on it used to bounce, which is both a lost customer and a deliverability signal.
import { SUPPORT_EMAIL } from "@/config/support";

export interface EmailProvider {
  addToAudience(email: string): Promise<void>;
  sendDownloadEmail(opts: {
    to: string;
    artTitle: string;
    downloadUrl: string;
  }): Promise<void>;
  sendWelcomeEmail(to: string): Promise<void>;
}

/**
 * Unwrapped: in .env.local this value is quoted, dotenv strips those quotes, and a dashboard that
 * stores the literal characters does not. A from address carrying quotes is refused by Resend, and
 * before the wrapper below that refusal was invisible.
 */
export function normalizeFrom(value: string | undefined): string {
  const v = (value ?? "").trim();
  const unquoted = v.length > 1 && ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'")))
    ? v.slice(1, -1).trim()
    : v;
  return unquoted || "The Pixel Prince <hello@thepixelprince.com>";
}

const FROM = normalizeFrom(process.env.EMAIL_FROM);

function resendClient(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY not configured");
  return new Resend(key);
}

/**
 * The Resend SDK resolves with `{ data, error }` rather than rejecting, so an awaited send that
 * failed looks exactly like one that worked. Every call goes through here: a refused send now
 * throws, the route returns 500 instead of a cheerful ok, and the reason reaches the log.
 */
async function sent<T>(what: string, call: Promise<{ data: T | null; error: unknown }>): Promise<T> {
  const { data, error } = await call;
  if (error) {
    const detail = typeof error === "object" && error && "message" in error ? String((error as { message: unknown }).message) : JSON.stringify(error);
    throw new Error(`Resend refused ${what}: ${detail}`);
  }
  return data as T;
}

export const emailProvider: EmailProvider = {
  async addToAudience(email) {
    const audienceId = process.env.RESEND_AUDIENCE_ID;
    if (!audienceId) throw new Error("RESEND_AUDIENCE_ID not configured");
    await sent("the audience add", resendClient().contacts.create({ email, audienceId, unsubscribed: false }));
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
    await sent(
      `the download email to ${to}`,
      resendClient().emails.send({
        from: FROM,
        replyTo: SUPPORT_EMAIL,
        to,
        subject: `Your free print: ${artTitle}`,
        html,
      }),
    );
  },

  async sendWelcomeEmail(to) {
    const html = renderBrandedEmail({
      preheader: "Player 2 has entered your inbox.",
      heading: "Hey, I'm Kenny",
      bodyHtml: `
        <p style="margin:0 0 12px 0;">I design retro gaming and map wall art. Every piece designed by an actual human, not pulled from a generator.</p>
        <p style="margin:0 0 12px 0;">Here's the deal: <strong>one email a month</strong> with a brand-new free print, plus whatever's new in the shop. That's it. No spam.</p>
        <p style="margin:0;">
          <a href="https://www.thepixelprince.com/prints?utm_source=pixelprince&utm_medium=email&utm_campaign=welcome" style="color:#c2521f;">Browse the prints</a>
        </p>`,
    });
    await sent(
      `the welcome email to ${to}`,
      resendClient().emails.send({
        from: FROM,
        replyTo: SUPPORT_EMAIL,
        to,
        subject: "Welcome: here's how the free prints work",
        html,
      }),
    );
  },
};
