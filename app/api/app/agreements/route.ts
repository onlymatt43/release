// Create an agreement: the requester's own profile is fetched from the
// identity provider and frozen in; the other handles are invited.

import { NextResponse, type NextRequest } from "next/server";
import { getIdentityProvider, IdentityError, normalizeHandle } from "@/lib/identity";
import { loadContract, ContractError } from "@/lib/contract";
import { createAgreement, countInTransitRequestedBy, maxInTransitPerRequester, type Invitee } from "@/lib/agreements";
import { requireSession, clientInfo, checkConsents } from "@/lib/app-request";

/** Most handles one request may invite; each one costs a provider lookup. */
const MAX_INVITEES = 10;
/** Handles are the provider's business; only length and printable characters are checked here. */
const HANDLE_PATTERN = /^[^\s\p{C}]{1,64}$/u;

export async function POST(req: NextRequest) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 }); }

  const rawHandles = Array.isArray(body.handles) ? body.handles : [body.handle];
  const handles = Array.from(new Set(
    rawHandles.filter((h): h is string => typeof h === "string").map(normalizeHandle).filter(Boolean)
  ));
  if (!handles.length) return NextResponse.json({ error: "At least one handle is required" }, { status: 422 });
  if (handles.length > MAX_INVITEES) {
    return NextResponse.json({ error: `At most ${MAX_INVITEES} handles per agreement` }, { status: 422 });
  }
  const invalid = handles.find((h) => !HANDLE_PATTERN.test(h));
  if (invalid !== undefined) return NextResponse.json({ error: "Invalid handle" }, { status: 422 });
  if (handles.includes(session.handle)) return NextResponse.json({ error: "You cannot invite yourself" }, { status: 422 });

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;

  try {
    const cap = maxInTransitPerRequester();
    if ((await countInTransitRequestedBy(session.id)) >= cap) {
      return NextResponse.json({ error: `You already have ${cap} agreements in transit` }, { status: 429 });
    }

    const contract = await loadContract();
    const consents = checkConsents(contract, body.consents);
    if (!consents.ok) return NextResponse.json({ error: `Consent "${consents.missing}" is required` }, { status: 422 });

    const provider = getIdentityProvider();

    // Bind each seat to the account behind the handle when the provider can
    // tell us; a handle that later changes hands then no longer opens it.
    const [profile, ...resolved] = await Promise.all([
      provider.getProfile(session),
      ...handles.map((h) => provider.resolveHandle(h)),
    ]);
    if (resolved.some((r) => r?.id === session.id)) {
      return NextResponse.json({ error: "You cannot invite yourself" }, { status: 422 });
    }

    // Two handles may name one account (aliases, old names): one seat each,
    // or a single acceptance would fill both.
    const invited: Invitee[] = [];
    const seen = new Set<string>();
    resolved.forEach((r, i) => {
      const seat: Invitee = { handle: r?.handle ?? handles[i], id: r?.id ?? null };
      const key = seat.id !== null ? `id:${seat.id}` : `handle:${seat.handle}`;
      if (seen.has(key)) return;
      seen.add(key);
      invited.push(seat);
    });

    const agreement = await createAgreement({
      contract,
      title,
      invited,
      requester: { subject: session, profile, consents: consents.keys, ...clientInfo(req) },
    });
    return NextResponse.json({ id: agreement.id }, { status: 201 });
  } catch (err) {
    if (err instanceof IdentityError || err instanceof ContractError) {
      const status = err instanceof IdentityError ? err.status : 500;
      return NextResponse.json({ error: err.message }, { status });
    }
    console.error("[agreements POST]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
