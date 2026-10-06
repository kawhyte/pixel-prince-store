import { afterEach, describe, expect, it, vi } from "vitest";
import { orderEvents, sendUmamiEvent, umamiPayload } from "@/lib/umami-server";

afterEach(() => vi.unstubAllGlobals());

describe("orderEvents", () => {
  it("sends one purchase with revenue in dollars, then one print_sold per print", () => {
    const events = orderEvents({
      orderId: "o-1",
      friendlyId: "1042",
      totalCents: 5998,
      currency: "usd",
      artworks: [{ slug: "brooklyn-neighborhood-map" }, { slug: "retro-controllers" }],
    });
    expect(events[0]).toEqual({
      name: "purchase",
      url: "/checkout/complete",
      data: { order: "1042", prints: "brooklyn-neighborhood-map,retro-controllers", revenue: 59.98, currency: "USD" },
    });
    expect(events.slice(1).map((e) => [e.name, e.url])).toEqual([
      ["print_sold", "/prints/brooklyn-neighborhood-map"],
      ["print_sold", "/prints/retro-controllers"],
    ]);
  });

  it("still records an order whose variants matched no artwork, without inventing revenue", () => {
    const [purchase, ...rest] = orderEvents({ orderId: "o-2", artworks: [] });
    expect(purchase.data).toEqual({ order: "o-2", prints: "unmatched" });
    expect(rest).toHaveLength(0);
  });
});

describe("umamiPayload / sendUmamiEvent", () => {
  it("does nothing without a website id", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect(umamiPayload({ name: "x", url: "/" }, undefined)).toBeNull();
    expect(await sendUmamiEvent({ name: "x", url: "/" }, undefined)).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("posts the event with a browser-like User-Agent", async () => {
    const fetchSpy = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchSpy);
    const ok = await sendUmamiEvent({ name: "purchase", url: "/checkout/complete", data: { revenue: 10 } }, "site-1");
    expect(ok).toBe(true);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe("https://cloud.umami.is/api/send");
    expect(init.headers["User-Agent"]).toMatch(/^Mozilla\/5\.0/);
    expect(JSON.parse(init.body)).toEqual({
      type: "event",
      payload: { website: "site-1", hostname: "www.thepixelprince.com", url: "/checkout/complete", name: "purchase", data: { revenue: 10 } },
    });
  });

  it("never throws when Umami is down", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await sendUmamiEvent({ name: "purchase", url: "/" }, "site-1")).toBe(false);
  });
});
