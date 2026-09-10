export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/session";
import { getIdentityProvider } from "@/lib/identity";
import { getAgreement, pendingFor, partyOf, seatMatches, seatTakenBy } from "@/lib/agreements";
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

  const me = partyOf(agreement, session);
  const pending = pendingFor(agreement, session);
  if (!me && !pending) notFound();

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
                      {p ? `Accepted ${fmt(p.acceptedAt)}` : "Not yet"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <ContractText contract={agreement.contract} />

          {pending && <AcceptForm agreementId={agreement.id} contract={agreement.contract} />}

          {me && agreement.status === "sealed" && (
            <a
              href={`/api/app/agreements/${agreement.id}/pdf`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Download my copy (PDF)
            </a>
          )}

          {me && agreement.status !== "sealed" && (
            <p className="text-sm text-muted-foreground">
              Waiting for the other {agreement.invited.length > 2 ? "parties" : "party"} to accept.
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
