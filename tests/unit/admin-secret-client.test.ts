import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

/**
 * The module reads `window` at call time, so a small fake browser is enough; the vitest
 * environment is node.
 */
function fakeBrowser(prompts: (string | null)[], hostname = "www.thepixelprince.com") {
  const store = new Map<string, string>();
  const asked: string[] = [];
  const sessionStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
  const prompt = (message: string) => {
    asked.push(message);
    return prompts.length ? prompts.shift()! : null;
  };
  vi.stubGlobal("window", { prompt, location: { hostname } });
  vi.stubGlobal("sessionStorage", sessionStorage);
  return { store, asked };
}

describe("admin secret", () => {
  // these cover the path where the gate is up; the dev bypass has its own case at the end
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NODE_ENV", "production");
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("asks once and reuses the answer", async () => {
    const { asked, store } = fakeBrowser(["s3cret"]);
    const { getAdminSecret } = await import("@/lib/admin-secret-client");
    expect(getAdminSecret()).toBe("s3cret");
    expect(getAdminSecret()).toBe("s3cret");
    expect(asked).toHaveLength(1);
    expect(store.get("pp_admin_secret")).toBe("s3cret");
  });

  it("does not store a cancelled prompt, so the next call asks again", async () => {
    const { asked, store } = fakeBrowser([null, "later"]);
    const { getAdminSecret } = await import("@/lib/admin-secret-client");
    expect(getAdminSecret()).toBeNull();
    expect(store.has("pp_admin_secret")).toBe(false);
    expect(getAdminSecret()).toBe("later");
    expect(asked).toHaveLength(2);
  });

  it("sends the secret as a header and leaves the rest of the request alone", async () => {
    fakeBrowser(["s3cret"]);
    const calls: RequestInit[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init: RequestInit) => {
      calls.push(init);
      return new Response("{}", { status: 200 });
    }));
    const { adminFetch } = await import("@/lib/admin-secret-client");
    await adminFetch("/api/x", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: "{}" });
    expect(calls).toHaveLength(1);
    expect(calls[0].method).toBe("DELETE");
    expect(calls[0].body).toBe("{}");
    expect((calls[0].headers as Record<string, string>)["x-admin-secret"]).toBe("s3cret");
    expect((calls[0].headers as Record<string, string>)["Content-Type"]).toBe("application/json");
  });

  it("forgets a rejected secret and retries once with a fresh one", async () => {
    const { asked, store } = fakeBrowser(["wrong", "right"]);
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init: RequestInit) => {
      const secret = (init.headers as Record<string, string>)["x-admin-secret"];
      seen.push(secret);
      return new Response("{}", { status: secret === "right" ? 200 : 401 });
    }));
    const { adminFetch } = await import("@/lib/admin-secret-client");
    const res = await adminFetch("/api/x", { method: "POST" });
    expect(seen).toEqual(["wrong", "right"]);
    expect(res.status).toBe(200);
    expect(store.get("pp_admin_secret")).toBe("right");
    expect(asked).toHaveLength(2);
  });

  it("retries only once, so cancelling the second prompt does not loop", async () => {
    fakeBrowser(["wrong", null, "never used"]);
    const fetchMock = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { adminFetch, getAdminSecret } = await import("@/lib/admin-secret-client");
    const res = await adminFetch("/api/x", { method: "POST" });
    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // and the bad secret is gone, so the next attempt starts clean
    expect(getAdminSecret()).toBe("never used");
  });

  it("asks for nothing on a dev server at localhost, where the route lets it through", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { asked } = fakeBrowser(["never asked"], "localhost");
    const sent: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init: RequestInit) => {
      sent.push((init.headers as Record<string, string>)["x-admin-secret"]);
      return new Response("{}", { status: 200 });
    }));
    const { adminFetch } = await import("@/lib/admin-secret-client");
    expect((await adminFetch("/api/x")).status).toBe(200);
    expect(asked).toHaveLength(0);
    expect(sent).toEqual([""]);
  });

  it("does not re-prompt on a dev server when the route rejects anyway", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { asked } = fakeBrowser(["x"], "127.0.0.1");
    const fetchMock = vi.fn(async () => new Response("{}", { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const { adminFetch } = await import("@/lib/admin-secret-client");
    expect((await adminFetch("/api/x")).status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(asked).toHaveLength(0);
  });

  it("still asks on a dev build reached on a LAN address, matching the route", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { asked } = fakeBrowser(["s3cret"], "192.168.1.24");
    const { getAdminSecret } = await import("@/lib/admin-secret-client");
    expect(getAdminSecret()).toBe("s3cret");
    expect(asked).toHaveLength(1);
  });

  it("treats a 403 the same as a 401", async () => {
    fakeBrowser(["wrong", "right"]);
    const seen: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (_u: unknown, init: RequestInit) => {
      const secret = (init.headers as Record<string, string>)["x-admin-secret"];
      seen.push(secret);
      return new Response("{}", { status: secret === "right" ? 200 : 403 });
    }));
    const { adminFetch } = await import("@/lib/admin-secret-client");
    expect((await adminFetch("/api/x")).status).toBe(200);
    expect(seen).toEqual(["wrong", "right"]);
  });
});
