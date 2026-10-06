import { SignJWT, jwtVerify } from "jose";

export interface DownloadClaim {
  email: string;
  artId: string;
  /** the download record this link belongs to (absent on links issued before per-link limits) */
  key?: string;
}

const TOKEN_TTL_HOURS = 72;

function secretKey(): Uint8Array {
  const secret = process.env.DOWNLOAD_LINK_SECRET;
  if (!secret) throw new Error("DOWNLOAD_LINK_SECRET not configured");
  return new TextEncoder().encode(secret);
}

export async function signDownloadToken(claim: DownloadClaim): Promise<string> {
  const { key, ...rest } = claim;
  const jwt = new SignJWT({ ...rest }).setProtectedHeader({ alg: "HS256" });
  if (key) jwt.setJti(key);
  return jwt
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_TTL_HOURS}h`)
    .sign(secretKey());
}

export async function verifyDownloadToken(token: string): Promise<DownloadClaim | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    if (
      typeof payload.email !== "string" ||
      typeof payload.artId !== "string"
    ) return null;
    const claim: DownloadClaim = { email: payload.email, artId: payload.artId };
    if (typeof payload.jti === "string") claim.key = payload.jti;
    return claim;
  } catch {
    return null;
  }
}
