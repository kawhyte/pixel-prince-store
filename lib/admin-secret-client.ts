"use client";

/**
 * The admin secret that gates the studio-only API routes, held for one browser session.
 *
 * sessionStorage rather than localStorage, so it does not outlive the tab on a shared machine.
 * Every caller should go through `adminFetch`: the trap this avoids is a mistyped secret being
 * cached and then silently rejected on every later call, with no way back short of dev tools.
 */

const KEY = "pp_admin_secret";

/**
 * True on a dev server, where lib/admin-auth.ts lets local requests through and there is nothing
 * to type. Kept in step with that file: if one side changes, so must the other.
 */
function gateIsDown(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  // optional: a window without a location is not a real browser, and crashing here would take the
  // whole helper down rather than just falling back to asking for the secret
  const hostname = typeof window === "undefined" ? undefined : window.location?.hostname;
  return hostname !== undefined && LOCAL_HOSTS.has(hostname);
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]", "::1", "0.0.0.0"]);

export function getAdminSecret(): string | null {
  if (typeof window === "undefined") return null;
  if (gateIsDown()) return "";
  let secret = sessionStorage.getItem(KEY);
  if (!secret) {
    secret = window.prompt("Enter admin secret to use this tool:");
    if (secret) sessionStorage.setItem(KEY, secret);
  }
  return secret;
}

/** Forget a secret the server would not accept, so the next call asks again. */
export function clearAdminSecret(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

/**
 * fetch with the admin secret attached. If the server rejects it, the stored value is dropped and
 * the call is retried once with a freshly typed one, so a typo costs a second prompt rather than
 * the rest of the session. Cancelling the second prompt returns the rejection to the caller.
 */
export async function adminFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const send = (secret: string | null) =>
    fetch(input, { ...init, headers: { ...(init.headers ?? {}), "x-admin-secret": secret ?? "" } });

  const first = await send(getAdminSecret());
  if (first.status !== 401 && first.status !== 403) return first;
  if (gateIsDown()) return first;

  clearAdminSecret();
  const retrySecret = getAdminSecret();
  if (!retrySecret) return first;
  return send(retrySecret);
}
