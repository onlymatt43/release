// Helpers shared by the transport flow's route handlers.

import { NextResponse, type NextRequest } from "next/server";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { resolveBaseUrl } from "@/lib/site-config";
import type { Identity } from "@/lib/identity/types";
import type { Contract } from "@/lib/contract";
import { IdentityError, type IdentityProvider, type Profile } from "@/lib/identity/types";

/**
 * Fetch a subject's profile, or null when the provider has none on file.
 * Any other provider failure still throws.
 */
export async function profileOrNull(provider: IdentityProvider, subject: Identity): Promise<Profile | null> {
  try {
    return await provider.getProfile(subject);
  } catch (err) {
    if (err instanceof IdentityError && err.status === 404) return null;
    throw err;
  }
}

export async function requireSession(): Promise<Identity | NextResponse> {
  const session = await getSession();
  return session ?? NextResponse.json({ error: "Sign in first" }, { status: 401 });
}

export function clientInfo(req: NextRequest): { ipAddress: string | null; userAgent: string | null } {
  return {
    ipAddress:
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
      req.headers.get("x-real-ip") ??
      null,
    userAgent: req.headers.get("user-agent") ?? null,
  };
}

/** Keep only consent keys the contract defines; reject if a required one is missing. */
export function checkConsents(contract: Contract, raw: unknown): { ok: true; keys: string[] } | { ok: false; missing: string } {
  const given = new Set(Array.isArray(raw) ? raw.filter((k): k is string => typeof k === "string") : []);
  const keys = contract.consents.filter((c) => given.has(c.key)).map((c) => c.key);
  const missing = contract.consents.find((c) => c.required && !given.has(c.key));
  return missing ? { ok: false, missing: missing.key } : { ok: true, keys };
}

/** Only same-site paths are accepted as a post-sign-in destination. */
export function safeReturnPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//") || raw.startsWith("/\\")) return fallback;
  return raw;
}

/**
 * A profile on file is mandatory to use the transport flow at all. A signed-in
 * visitor without one is sent to the provider's profile form and brought back
 * to `returnPath` once done. Returns the profile otherwise. When no setup URL
 * is configured, the caller gets null and shows a blocking message instead.
 */
export async function requireProfile(
  provider: IdentityProvider,
  subject: Identity,
  returnPath: string,
): Promise<Profile | null> {
  const profile = await profileOrNull(provider, subject);
  if (profile) return profile;
  const setupUrl = provider.profileSetupUrl(`${await resolveBaseUrl()}${returnPath}`);
  if (setupUrl) redirect(setupUrl);
  return null;
}
