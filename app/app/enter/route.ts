// Entry point from the identity provider: it sends the visitor here with a
// signed token; release verifies it, opens a session, and continues.

import { NextResponse, type NextRequest } from "next/server";
import { getIdentityProvider, IdentityError } from "@/lib/identity";
import { SESSION_COOKIE, createSessionToken, sessionCookieOptions } from "@/lib/session";
import { safeReturnPath } from "@/lib/app-request";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const returnTo = safeReturnPath(req.nextUrl.searchParams.get("return_to"));
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  try {
    const identity = await getIdentityProvider().verifyEntryToken(token);
    const res = NextResponse.redirect(new URL(returnTo, req.url));
    res.cookies.set(SESSION_COOKIE, await createSessionToken(identity), sessionCookieOptions());
    return res;
  } catch (err) {
    const status = err instanceof IdentityError ? err.status : 500;
    const message = err instanceof Error ? err.message : "Sign-in failed";
    return NextResponse.json({ error: message }, { status });
  }
}
