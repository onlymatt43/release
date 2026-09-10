export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSession } from "@/lib/session";
import { getIdentityProvider } from "@/lib/identity";
import { loadContract, ContractError, type Contract } from "@/lib/contract";
import { listAgreementsFor, pendingFor, partyOf, seatMatches, seatTakenBy, agreementTtlDays, type Agreement } from "@/lib/agreements";
import { resolveBaseUrl, siteLocale } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RequestForm from "@/components/app/RequestForm";
import SignInPrompt from "@/components/app/SignInPrompt";
import SignOutButton from "@/components/app/SignOutButton";
import type { Identity } from "@/lib/identity/types";

function describe(a: Agreement, me: Identity): { label: string; tone: "default" | "secondary" | "outline" } {
  if (pendingFor(a, me)) return { label: "Waiting for you", tone: "default" };
  if (a.status === "sealed") {
    const myParty = partyOf(a, me);
    if (!myParty) return { label: "Closed", tone: "outline" };
    return myParty.downloadedAt
      ? { label: "Downloaded", tone: "outline" }
      : { label: "Ready to download", tone: "default" };
  }
  const waiting = a.invited.filter((i) => !seatTakenBy(a, i));
  return { label: `Waiting for ${waiting.map((i) => `@${i.handle}`).join(", ")}`, tone: "secondary" };
}

export default async function AppHome() {
  const session = await getSession();
  const provider = getIdentityProvider();

  if (!session) {
    const base = await resolveBaseUrl();
    return <SignInPrompt providerName={provider.name} loginUrl={provider.loginUrl(`${base}/app`)} />;
  }

  let contract: Contract | null = null;
  let contractError: string | null = null;
  try {
    contract = await loadContract();
  } catch (err) {
    contractError = err instanceof ContractError ? err.message : "Contract unavailable";
  }

  const agreements = await listAgreementsFor(session);
  const locale = siteLocale() ?? undefined;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="text-sm">@{session.handle}</div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        {contract ? (
          <RequestForm contract={contract} />
        ) : (
          <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{contractError}</p>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">In transit</CardTitle>
          </CardHeader>
          <CardContent>
            {agreements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing in transit.</p>
            ) : (
              <ul className="divide-y">
                {agreements.map((a) => {
                  const d = describe(a, session);
                  const others = a.invited.filter((i) => !seatMatches(i, session));
                  return (
                    <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <Link href={`/app/a/${a.id}`} className="font-medium hover:underline">
                          {others.map((i) => `@${i.handle}`).join(", ")}
                        </Link>
                        <div className="truncate text-xs text-muted-foreground">
                          {a.title ? `${a.title} · ` : ""}
                          {new Date(a.createdAt).toLocaleDateString(locale)}
                        </div>
                      </div>
                      <Badge variant={d.tone}>{d.label}</Badge>
                    </li>
                  );
                })}
              </ul>
            )}
            <p className="mt-4 text-xs text-muted-foreground">
              Documents are deleted once every party has downloaded them, and in any case after {agreementTtlDays()} days.
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
