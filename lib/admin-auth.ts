import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Gate for the studio-only API routes: alt text, the description generator, and the Cloudinary
 * delete.
 *
 * What this protects is worth being clear about, because it is not Studio. Studio is already behind
 * a Sanity login. These are public URLs on the internet, and a route does not know that the browser
 * calling it happens to have a Studio tab open. Without a gate anyone who guessed the path could
 * POST to them and spend the Gemini quota, or delete Cloudinary assets. The secret is the thing
 * standing between a stranger with curl and the bill.
 *
 * On a developer machine none of that applies, so the gate stands down: no prompt, no friction. It
 * requires BOTH a development build and a request addressed to localhost, so starting the dev
 * server on a LAN address (`next dev -H 0.0.0.0`) to test on a phone does not quietly open it up.
 */
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

function isLocalRequest(request: NextRequest): boolean {
  const host = request.headers.get("host") ?? "";
  // strip the port; ipv6 literals keep their brackets
  const name = host.startsWith("[") ? host.slice(0, host.indexOf("]") + 1) : host.split(":")[0];
  return LOCAL_HOSTS.has(name);
}

export function isAdminGateBypassed(request: NextRequest): boolean {
  return process.env.NODE_ENV !== "production" && isLocalRequest(request);
}

export function requireAdminSecret(request: NextRequest): NextResponse | null {
  if (isAdminGateBypassed(request)) return null;

  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Admin API not configured" }, { status: 503 });
  }
  const provided = request.headers.get("x-admin-secret") ?? "";
  const a = Buffer.from(provided);
  const b = Buffer.from(secret);
  // constant-time compare, and only on equal lengths: timingSafeEqual throws otherwise
  const equal = a.length === b.length && timingSafeEqual(a, b);
  if (!equal) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
