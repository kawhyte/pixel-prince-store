import { describe, it, expect } from "vitest";
import { createHmac } from "crypto";
import { verifyFourthwallSignature, parseOrderEvent, sanityIdForOrder } from "@/lib/fourthwall-webhook";

const secret = "e3f93c7c-c92b-4b8f-a9b1-5b70e0891abc";
const sign = (body: string) => createHmac("sha256", secret).update(body, "utf8").digest("base64");

describe("verifyFourthwallSignature", () => {
  it("accepts a matching base64 HMAC and rejects everything else", () => {
    const body = '{"type":"ORDER_PLACED","data":{}}';
    expect(verifyFourthwallSignature(body, sign(body), secret)).toBe(true);
    expect(verifyFourthwallSignature(body + " ", sign(body), secret)).toBe(false);
    expect(verifyFourthwallSignature(body, sign(body), "other")).toBe(false);
    expect(verifyFourthwallSignature(body, null, secret)).toBe(false);
    expect(verifyFourthwallSignature(body, sign(body), "")).toBe(false);
  });
});

describe("parseOrderEvent", () => {
  const envelope = {
    testMode: false,
    id: "weve_1",
    webhookId: "wcon_1",
    shopId: "sh_1",
    type: "ORDER_PLACED",
    apiVersion: "V1_BETA",
    createdAt: "2026-09-08T15:05:11Z",
    data: {
      id: "ord_abc",
      friendlyId: "PP-1001",
      email: "Buyer@Example.com",
      amounts: { total: { value: 36.99, currency: "USD" } },
      offers: [
        { variant: { id: "bf773c0b-41d5-40b0-aaf1-23ea19aab6d7", name: "16x20" }, quantity: 1 },
        { variantId: "a02c8293-0cd1-45a8-9e8c-c1b6d1554073", quantity: 2 },
        { variant: { id: "not-a-uuid" } },
      ],
    },
  };
  it("reads the envelope and finds email, total and variant ids wherever they sit", () => {
    const ev = parseOrderEvent(envelope)!;
    expect(ev.type).toBe("ORDER_PLACED");
    expect(ev.testMode).toBe(false);
    expect(ev.orderId).toBe("ord_abc");
    expect(ev.friendlyId).toBe("PP-1001");
    expect(ev.email).toBe("buyer@example.com");
    expect(ev.totalCents).toBe(3699);
    expect(ev.currency).toBe("USD");
    expect(ev.variantIds.sort()).toEqual(["a02c8293-0cd1-45a8-9e8c-c1b6d1554073", "bf773c0b-41d5-40b0-aaf1-23ea19aab6d7"]);
  });
  it("finds a nested email and tolerates missing amounts", () => {
    const ev = parseOrderEvent({ type: "ORDER_PLACED", data: { id: "o2", shippingAddress: { email: "a@b.co" } } })!;
    expect(ev.email).toBe("a@b.co");
    expect(ev.totalCents).toBeUndefined();
    expect(ev.variantIds).toEqual([]);
  });
  it("rejects non-envelopes", () => {
    expect(parseOrderEvent(null)).toBeNull();
    expect(parseOrderEvent({ data: {} })).toBeNull();
  });
  it("builds a safe Sanity id", () => {
    expect(sanityIdForOrder("ord_abc/1")).toBe("fworder-ord_abc_1");
  });
});
