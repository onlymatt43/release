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
