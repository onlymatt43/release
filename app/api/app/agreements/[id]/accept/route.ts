// An invited handle joins: its profile is fetched from the provider and
// frozen in. The agreement seals once every invited handle has joined.

import { NextResponse, type NextRequest } from "next/server";
import { getIdentityProvider, IdentityError } from "@/lib/identity";
import { getAgreement, acceptAgreement, pendingFor } from "@/lib/agreements";
import { requireSession, clientInfo, checkConsents, profileOrNull } from "@/lib/app-request";
import { resolveBaseUrl } from "@/lib/site-config";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const agreement = await getAgreement(id);
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!pendingFor(agreement, session)) {
    return NextResponse.json({ error: "This account is not expected to join this agreement" }, { status: 403 });
  }

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* no body */ }

  const consents = checkConsents(agreement.contract, body.consents);
  if (!consents.ok) return NextResponse.json({ error: `Consent "${consents.missing}" is required` }, { status: 422 });

  try {
    const provider = getIdentityProvider();
    const profile = await profileOrNull(provider, session);
    if (!profile) {
      const setupUrl = provider.profileSetupUrl(`${await resolveBaseUrl()}/app/a/${id}`);
      return NextResponse.json({ error: "Your profile is not on file yet", setupUrl }, { status: 404 });
    }
    const updated = await acceptAgreement(agreement, {
      subject: session, profile, consents: consents.keys, ...clientInfo(req),
    });
    return NextResponse.json({ id: updated.id, status: updated.status });
  } catch (err) {
    if (err instanceof IdentityError) return NextResponse.json({ error: err.message }, { status: err.status });
    console.error("[agreements accept]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
