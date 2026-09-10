// Entry point from the identity provider: it sends the visitor here with a
// signed token; release verifies it, opens a session, and continues.
//
// POST (form or JSON body) is preferred: the token then stays out of URLs,
// browser history and request logs. GET with ?token= is accepted for
// providers that can only redirect.

import { NextResponse, type NextRequest } from "next/server";
import { getIdentityProvider, IdentityError } from "@/lib/identity";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { safeReturnPath } from "@/lib/app-request";

export async function GET(req: NextRequest) {
  return enter(req, req.nextUrl.searchParams.get("token"), req.nextUrl.searchParams.get("return_to"));
}

export async function POST(req: NextRequest) {
  let token: string | null = null;
  let returnTo: string | null = null;
  const type = req.headers.get("content-type") ?? "";
  try {
    if (type.includes("application/json")) {
      const body = (await req.json()) as Record<string, unknown>;
      token = typeof body.token === "string" ? body.token : null;
      returnTo = typeof body.return_to === "string" ? body.return_to : null;
    } else {
      const form = await req.formData();
      const t = form.get("token");
      const r = form.get("return_to");
      token = typeof t === "string" ? t : null;
      returnTo = typeof r === "string" ? r : null;
    }
  } catch {
    return NextResponse.json({ error: "Unreadable body" }, { status: 400 });
  }
  return enter(req, token, returnTo);
}

async function enter(req: NextRequest, token: string | null, rawReturnTo: string | null) {
  const returnTo = safeReturnPath(rawReturnTo);
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  try {
    const identity = await getIdentityProvider().verifyEntryToken(token);
    const res = NextResponse.redirect(new URL(returnTo, req.url), 303);
    res.cookies.set(SESSION_COOKIE, await createSessionToken(identity), sessionCookieOptions());
    return res;
  } catch (err) {
    const status = err instanceof IdentityError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Sign-in failed";
    return NextResponse.json({ error: message }, { status });
  }
}
