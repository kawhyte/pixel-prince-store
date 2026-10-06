import crypto from "crypto";
import { describe, expect, it } from "vitest";
import { orphanedPublicIds, verifyWebhookSignature, SIGNATURE_TOLERANCE_MS } from "@/lib/sanity-webhook-utils";

const SECRET = "test-secret";
const BODY = '{"_id":"abc","_type":"product"}';

function sign(body: string, t: number, secret = SECRET) {
  const v1 = crypto.createHmac("sha256", secret).update(`${t}.${body}`).digest("base64url");
  return `t=${t},v1=${v1}`;
}

describe("verifyWebhookSignature", () => {
  const now = 1_760_000_000_000;

  it("accepts a fresh, correctly signed delivery", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, now), SECRET, now)).toBe(true);
  });

  it("rejects a replay older than the tolerance", () => {
    const old = now - SIGNATURE_TOLERANCE_MS - 1;
    expect(verifyWebhookSignature(BODY, sign(BODY, old), SECRET, now)).toBe(false);
  });

  it("rejects a changed body", () => {
    expect(verifyWebhookSignature(BODY + " ", sign(BODY, now), SECRET, now)).toBe(false);
  });

  it("rejects the wrong secret", () => {
    expect(verifyWebhookSignature(BODY, sign(BODY, now, "other"), SECRET, now)).toBe(false);
  });

  it("rejects a missing or malformed header", () => {
    expect(verifyWebhookSignature(BODY, null, SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(BODY, "v1=abc", SECRET, now)).toBe(false);
    expect(verifyWebhookSignature(BODY, `t=${now},v1=short`, SECRET, now)).toBe(false);
  });
});

describe("orphanedPublicIds", () => {
  const deleted = {
    _id: "abc",
    _type: "product",
    operation: "delete" as const,
    deletedPublicIds: ["free-art/moon", null, "free-art/moon"],
  };

  it("returns a deleted artwork's print file, once", () => {
    expect(orphanedPublicIds(deleted, false)).toEqual(["free-art/moon"]);
  });

  it("keeps the file when a draft survives (unpublish)", () => {
    expect(orphanedPublicIds(deleted, true)).toEqual([]);
  });

  it("ignores updates, creates, posts, drafts and versions", () => {
    expect(orphanedPublicIds({ ...deleted, operation: "update" }, false)).toEqual([]);
    expect(orphanedPublicIds({ ...deleted, operation: "create" }, false)).toEqual([]);
    expect(orphanedPublicIds({ ...deleted, _type: "post" }, false)).toEqual([]);
    expect(orphanedPublicIds({ ...deleted, _id: "drafts.abc" }, false)).toEqual([]);
    expect(orphanedPublicIds({ ...deleted, _id: "versions.r1.abc" }, false)).toEqual([]);
  });

  it("ignores a delivery without the signed operation field", () => {
    expect(orphanedPublicIds({ ...deleted, operation: undefined }, false)).toEqual([]);
  });
});
