// Helpers shared by the transport flow's route handlers.

import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import type { Identity } from "@/lib/identity/types";
import type { Contract } from "@/lib/contract";

export async function requireSession(): Promise<Identity | NextResponse> {
  const session = await getSession();
  return session ?? NextResponse.json({ error: "Sign in first" }, { status: 401 });
}

export function clientInfo(req: NextRequest): { ipAddress: string | null; userAgent: string | null } {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || null;
  return {
    ipAddress: forwarded || req.headers.get("x-real-ip") || null,
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

const SAME_SITE_BASE = "https://release.invalid";

/**
 * Only same-site paths are accepted as a post-sign-in destination. The
 * value is resolved the way the browser will resolve it, since the URL
 * parser strips tabs and newlines first (so "/\t/host" is "//host") and
 * treats a backslash as a slash.
 */
export function safeReturnPath(raw: string | null | undefined, fallback = "/app"): string {
  if (!raw || !raw.startsWith("/") || /[\s\p{C}]/u.test(raw)) return fallback;
  try {
    const url = new URL(raw, SAME_SITE_BASE);
    if (url.origin !== SAME_SITE_BASE || !url.pathname.startsWith("/")) return fallback;
  } catch {
    return fallback;
  }
  return raw;
}
