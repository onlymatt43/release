export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getIdentityProvider } from "@/lib/identity";
import { getAgreement, pendingFor, seatOf, seatMatches, seatTakenBy } from "@/lib/agreements";
import { profileOrNull } from "@/lib/app-request";
import { resolveBaseUrl, siteLocale, siteTimeZone } from "@/lib/site-config";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AcceptForm from "@/components/app/AcceptForm";
import ContractText from "@/components/app/ContractText";
import SignInPrompt from "@/components/app/SignInPrompt";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AgreementPage({ params }: PageProps) {
  const { id } = await params;
  const session = await getSession();
  const provider = getIdentityProvider();

  if (!session) {
    const base = await resolveBaseUrl();
    return <SignInPrompt providerName={provider.name} loginUrl={provider.loginUrl(`${base}/app/a/${id}`)} />;
  }

  const agreement = await getAgreement(id);
  if (!agreement) notFound();

  const seat = seatOf(agreement, session);
  if (!seat) notFound();
  const pending = pendingFor(agreement, session);

  // A signer without a profile on file is sent to fill it in, then back here.
  let setupUrl: string | null = null;
  if (pending) {
    let hasProfile: boolean | null = null;
    try { hasProfile = (await profileOrNull(provider, session)) !== null; } catch { hasProfile = null; }
    if (hasProfile === false) {
      const base = await resolveBaseUrl();
      setupUrl = provider.profileSetupUrl(`${base}/app/a/${id}`) ?? "";
    }
  }

  const locale = siteLocale() ?? undefined;
  const timeZone = siteTimeZone() ?? undefined;
  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone });

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{agreement.contract.title}</CardTitle>
            <Badge variant={agreement.status === "sealed" ? "default" : "secondary"}>
              {agreement.status === "sealed" ? "Sealed" : "Pending"}
            </Badge>
          </div>
          {agreement.title && <CardDescription>{agreement.title}</CardDescription>}
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Parties</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {agreement.invited.map((i) => {
                const p = seatTakenBy(agreement, i);
                return (
                  <li key={i.id ?? i.handle} className="flex items-center justify-between">
                    <span>
                      @{p?.subject.handle ?? i.handle}
                      {seatMatches(i, session) ? " (you)" : ""}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {!i.signs ? "Receives a copy" : p ? `Signed ${fmt(p.acceptedAt)}` : "Not signed yet"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <ContractText contract={agreement.contract} />

          {pending && setupUrl === null && <AcceptForm agreementId={agreement.id} contract={agreement.contract} />}

          {pending && setupUrl !== null && (
            <div className="flex flex-col gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <span>Your profile is not on file yet. Fill it in once, then come back here to sign.</span>
              {setupUrl ? (
                <a href={setupUrl} className="inline-flex items-center justify-center rounded-lg bg-amber-900 px-4 py-2 text-sm font-medium text-white hover:bg-amber-800">
                  Complete my profile
                </a>
              ) : (
                <span className="text-xs">Ask the operator where to complete your profile.</span>
              )}
            </div>
          )}

          {agreement.status === "sealed" && (
            <a
              href={`/api/app/agreements/${agreement.id}/pdf`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Download my copy (PDF)
            </a>
          )}

          {!pending && agreement.status !== "sealed" && (
            <p className="text-sm text-muted-foreground">
              Waiting for the other {agreement.invited.length > 2 ? "parties" : "party"} to sign.
              Share this page with them:
              <span className="mt-1 block break-all font-mono text-xs">{`/app/a/${agreement.id}`}</span>
            </p>
          )}

          <p className="text-xs text-muted-foreground">
            Expires {fmt(agreement.expiresAt)}. Nothing is kept afterwards.
          </p>

          <Link href="/app" className="text-sm underline">Back</Link>
        </CardContent>
      </Card>
    </div>
  );
}
