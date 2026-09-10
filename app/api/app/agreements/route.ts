// Create an agreement: the requester's own profile is fetched from the
// identity provider and frozen in; the other handles are invited.

import { NextResponse, type NextRequest } from "next/server";
import { getIdentityProvider, IdentityError, normalizeHandle } from "@/lib/identity";
import { loadContract, ContractError } from "@/lib/contract";
import { createAgreement, countInTransitRequestedBy, maxInTransitPerRequester, type Invitee } from "@/lib/agreements";
import { requireSession, clientInfo, checkConsents, profileOrNull } from "@/lib/app-request";
import { resolveBaseUrl } from "@/lib/site-config";

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
  if (handles.includes(session.handle)) return NextResponse.json({ error: "You cannot invite yourself" }, { status: 422 });

  const title = typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;
  // Who signs: the requester (default yes) and the invited seats (default yes).
  const requesterSigns = body.requesterSigns !== false;
  const invitedSign = body.invitedSign !== false;
  if (!requesterSigns && !invitedSign) {
    return NextResponse.json({ error: "At least one side must sign" }, { status: 422 });
  }

  try {
    const cap = maxInTransitPerRequester();
    if ((await countInTransitRequestedBy(session.id)) >= cap) {
      return NextResponse.json({ error: `You already have ${cap} agreements in transit` }, { status: 429 });
    }

    const contract = await loadContract();
    const consents = requesterSigns ? checkConsents(contract, body.consents) : { ok: true as const, keys: [] };
    if (!consents.ok) return NextResponse.json({ error: `Consent "${consents.missing}" is required` }, { status: 422 });

    const provider = getIdentityProvider();

    // Bind each seat to the account behind the handle when the provider can
    // tell us; a handle that later changes hands then no longer opens it.
    const invited: Invitee[] = [];
    for (const handle of handles) {
      const resolved = await provider.resolveHandle(handle);
      if (resolved && resolved.id === session.id) {
        return NextResponse.json({ error: "You cannot invite yourself" }, { status: 422 });
      }
      invited.push({ handle: resolved?.handle ?? handle, id: resolved?.id ?? null, signs: invitedSign });
    }

    let party = null;
    if (requesterSigns) {
      const profile = await profileOrNull(provider, session);
      if (!profile) {
        const setupUrl = provider.profileSetupUrl(`${await resolveBaseUrl()}/app`);
        return NextResponse.json({ error: "Your profile is not on file yet", setupUrl }, { status: 404 });
      }
      party = { subject: session, profile, consents: consents.keys, ...clientInfo(req) };
    }

    const agreement = await createAgreement({
      contract,
      title,
      invited,
      requester: { subject: session, party },
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
