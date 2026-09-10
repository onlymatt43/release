// Visitor session for the transport flow: a signed, httpOnly cookie carrying
// only the identity the provider asserted (id, handle, display name, avatar).
// Nothing is stored server-side; the provider stays the source of truth.

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { parseIdentity, type Identity } from "@/lib/identity/types";

export const SESSION_COOKIE = "release_session";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET?.trim();
  if (!s) throw new Error("Missing env variable: SESSION_SECRET");
  return new TextEncoder().encode(s);
}

function ttlSeconds(): number {
  const hours = Number.parseFloat(process.env.SESSION_TTL_HOURS ?? "");
  return Math.round((Number.isFinite(hours) && hours > 0 ? hours : 24) * 3600);
}

export async function createSessionToken(identity: Identity): Promise<string> {
  return new SignJWT({ handle: identity.handle })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(identity.id)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds())
    .sign(secret());
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: ttlSeconds(),
  };
}

export async function readSessionToken(token: string | undefined): Promise<Identity | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret(), { algorithms: ["HS256"] });
    return parseIdentity({ id: payload.sub, ...payload });
  } catch {
    return null;
  }
}

/** Identity of the current visitor, or null when there is no valid session. */
export async function getSession(): Promise<Identity | null> {
  const store = await cookies();
  return readSessionToken(store.get(SESSION_COOKIE)?.value);
}
