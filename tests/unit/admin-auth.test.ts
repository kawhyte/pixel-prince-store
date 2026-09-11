import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

/** requireAdminSecret only reads headers, so a map is enough of a request. */
const req = (headers: Record<string, string>) =>
  ({ headers: { get: (k: string) => headers[k.toLowerCase()] ?? null } }) as unknown as NextRequest;

const SECRET = "a".repeat(64);

describe("admin gate", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("ADMIN_API_SECRET", SECRET);
  });
  afterEach(() => vi.unstubAllEnvs());

  it("lets a local request through on a dev server, so there is nothing to type", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { requireAdminSecret } = await import("@/lib/admin-auth");
    for (const host of ["localhost:3000", "127.0.0.1:3000", "[::1]:3000"]) {
      expect(requireAdminSecret(req({ host }))).toBeNull();
    }
  });

  it("still challenges a dev server reached on a LAN address", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const { requireAdminSecret } = await import("@/lib/admin-auth");
    // `next dev -H 0.0.0.0` to test on a phone must not open the routes to the network
    const res = requireAdminSecret(req({ host: "192.168.1.24:3000" }));
    expect(res?.status).toBe(401);
    // and the right secret still works from there
    expect(requireAdminSecret(req({ host: "192.168.1.24:3000", "x-admin-secret": SECRET }))).toBeNull();
  });

  it("never stands down in production, whatever the host claims to be", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { requireAdminSecret } = await import("@/lib/admin-auth");
    expect(requireAdminSecret(req({ host: "localhost:3000" }))?.status).toBe(401);
    expect(requireAdminSecret(req({ host: "www.thepixelprince.com" }))?.status).toBe(401);
    expect(requireAdminSecret(req({ host: "www.thepixelprince.com", "x-admin-secret": SECRET }))).toBeNull();
  });

  it("rejects a wrong secret of the same length, not just a short one", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { requireAdminSecret } = await import("@/lib/admin-auth");
    expect(requireAdminSecret(req({ host: "x.com", "x-admin-secret": "b".repeat(64) }))?.status).toBe(401);
    expect(requireAdminSecret(req({ host: "x.com", "x-admin-secret": "a".repeat(63) }))?.status).toBe(401);
  });

  it("says so rather than letting everything through when the secret is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("ADMIN_API_SECRET", "");
    const { requireAdminSecret } = await import("@/lib/admin-auth");
    expect(requireAdminSecret(req({ host: "x.com" }))?.status).toBe(503);
  });
});
