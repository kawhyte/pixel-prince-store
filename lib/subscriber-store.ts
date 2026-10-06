import { randomUUID } from "crypto";
import { writeClient } from "@/sanity/lib/write-client";
import { WEEKLY_DOWNLOAD_LIMIT } from "@/config/free-art";

export interface SubscriberDownload {
  _key?: string;
  artId: string;
  sizeId?: string; // legacy only: pre single-file-pipeline records
  requestedAt: string;
  claims?: number; // times the emailed link has been used
}

export interface SubscriberDoc {
  _id: string;
  _rev?: string;
  email: string;
  downloads?: SubscriberDownload[];
}

/** How many times one emailed link can be used: covers a retry or a second device, not a public share. */
export const MAX_CLAIMS_PER_LINK = 3;

const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);
const KEY_RE = /^[a-zA-Z0-9-]{1,64}$/;

export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

/**
 * The mailbox an address delivers to: drops a "+tag", and Gmail's ignored dots.
 * Used only as the limit key; mail always goes to the address as typed.
 */
export function canonicalEmail(email: string): string {
  const normalized = normalizeEmail(email);
  const at = normalized.lastIndexOf("@");
  if (at < 1) return normalized;
  let local = normalized.slice(0, at);
  let domain = normalized.slice(at + 1);
  const plus = local.indexOf("+");
  if (plus > 0) local = local.slice(0, plus);
  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
    domain = "gmail.com";
  }
  return `${local}@${domain}`;
}

function hexId(value: string): string {
  return `subscriber-${Buffer.from(value).toString("hex")}`;
}

// Deterministic id per mailbox → natural dedupe, and one weekly limit per inbox.
export function docIdForEmail(email: string): string {
  return hexId(canonicalEmail(email));
}

// Before canonical ids, docs were keyed by the normalized address.
function legacyDocId(email: string): string | null {
  const legacy = hexId(normalizeEmail(email));
  return legacy === docIdForEmail(email) ? null : legacy;
}

function isConflict(error: unknown): boolean {
  return (error as { statusCode?: number })?.statusCode === 409;
}

function client() {
  if (!writeClient) throw new Error("Sanity write client not configured");
  return writeClient;
}

async function existedBefore(email: string): Promise<boolean> {
  const legacy = legacyDocId(email);
  return legacy ? Boolean(await client().getDocument(legacy)) : false;
}

export async function getSubscriber(email: string): Promise<SubscriberDoc | null> {
  return client().getDocument<SubscriberDoc>(docIdForEmail(email)).then((d) => d ?? null);
}

export function weeklyDownloadCount(sub: SubscriberDoc | null): number {
  if (!sub?.downloads) return 0;
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return sub.downloads.filter((d) => new Date(d.requestedAt).getTime() > cutoff).length;
}

export function isOverWeeklyLimit(sub: SubscriberDoc | null): boolean {
  return weeklyDownloadCount(sub) >= WEEKLY_DOWNLOAD_LIMIT;
}

export type ClaimResult =
  | { ok: true; key: string; isNewSubscriber: boolean }
  | { ok: false; reason: "limit" };

/**
 * Checks the weekly limit and records the download in one step. The write only lands
 * on the revision that was checked, so parallel requests cannot each slip under the limit.
 */
export async function claimDownloadSlot(email: string, artId: string, source: string): Promise<ClaimResult> {
  const id = docIdForEmail(email);
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await getSubscriber(email);
    if (isOverWeeklyLimit(existing)) return { ok: false, reason: "limit" };

    const key = randomUUID();
    const record = { _key: key, artId, requestedAt: new Date().toISOString() };
    try {
      if (!existing) {
        await client().create({
          _id: id,
          _type: "subscriber",
          email: normalizeEmail(email),
          consentAt: new Date().toISOString(),
          source,
          downloads: [record],
        });
        return { ok: true, key, isNewSubscriber: !(await existedBefore(email)) };
      }
      await client()
        .patch(id)
        .ifRevisionId(existing._rev!)
        .setIfMissing({ downloads: [] })
        .append("downloads", [record])
        .commit();
      return { ok: true, key, isNewSubscriber: false };
    } catch (error) {
      if (!isConflict(error)) throw error;
      // Someone else wrote first: re-read and check the limit again.
    }
  }
  throw new Error("Download slot still contended after retries");
}

/** Gives a slot back when its email never went out. */
export async function releaseDownloadSlot(email: string, key: string): Promise<void> {
  if (!KEY_RE.test(key)) return;
  await client().patch(docIdForEmail(email)).unset([`downloads[_key=="${key}"]`]).commit();
}

/**
 * Counts a use of an emailed link. False once the link has been used MAX_CLAIMS_PER_LINK times.
 * Links issued before keys existed (or whose record is gone) are let through.
 */
export async function recordLinkUse(email: string, key: string): Promise<boolean> {
  if (!KEY_RE.test(key)) return false;
  const sub = await getSubscriber(email);
  const record = sub?.downloads?.find((d) => d._key === key);
  if (!sub || !record) return true;
  if ((record.claims ?? 0) >= MAX_CLAIMS_PER_LINK) return false;
  const path = `downloads[_key=="${key}"].claims`;
  await client().patch(sub._id).setIfMissing({ [path]: 0 }).inc({ [path]: 1 }).commit();
  return true;
}

/** Creates the subscriber if new (no download record). Returns true if the subscriber is brand new. */
export async function recordSubscription(
  email: string,
  source: string
): Promise<{ isNewSubscriber: boolean }> {
  const id = docIdForEmail(email);
  const existing = await client().getDocument(id);
  const isNewSubscriber = !existing && !(await existedBefore(email));
  await client().createIfNotExists({
    _id: id,
    _type: "subscriber",
    email: normalizeEmail(email),
    consentAt: new Date().toISOString(),
    source,
    downloads: [],
  });
  return { isNewSubscriber };
}
