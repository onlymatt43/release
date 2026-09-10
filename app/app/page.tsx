export const dynamic = "force-dynamic";

import Link from "next/link";
import { getSession } from "@/lib/session";
import { getIdentityProvider } from "@/lib/identity";
import { loadContract, ContractError, type Contract } from "@/lib/contract";
import { listAgreementsFor, pendingFor, seatMatches, seatTakenBy, hasDownloaded, agreementTtlDays, type Agreement } from "@/lib/agreements";
import { profileOrNull } from "@/lib/app-request";
import { resolveBaseUrl, siteLocale } from "@/lib/site-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RequestForm from "@/components/app/RequestForm";
import SignInPrompt from "@/components/app/SignInPrompt";
import SignOutButton from "@/components/app/SignOutButton";
import type { Identity } from "@/lib/identity/types";

async function describe(a: Agreement, me: Identity): Promise<{ label: string; tone: "default" | "secondary" | "outline" }> {
  if (pendingFor(a, me)) return { label: "Waiting for you", tone: "default" };
  if (a.status === "sealed") {
    return (await hasDownloaded(a.id, me.id))
      ? { label: "Downloaded", tone: "outline" }
      : { label: "Ready to download", tone: "default" };
  }
  const waiting = a.invited.filter((i) => i.signs && !seatTakenBy(a, i));
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
  const rows = await Promise.all(agreements.map(async (a) => ({ a, d: await describe(a, session) })));
  const locale = siteLocale() ?? undefined;

  // Whether the provider has a profile on file for this visitor; null when
  // the provider could not be reached (the request form will say so).
  let hasProfile: boolean | null = null;
  try {
    hasProfile = (await profileOrNull(provider, session)) !== null;
  } catch {
    hasProfile = null;
  }
  const base = await resolveBaseUrl();
  const setupUrl = provider.profileSetupUrl(`${base}/app`);

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <div className="flex items-center gap-3">
            {session.avatar && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={session.avatar} alt="" className="h-8 w-8 rounded-full" />
            )}
            <div className="leading-tight">
              {session.name && <div className="text-sm font-medium">{session.name}</div>}
              <div className="text-xs text-muted-foreground">@{session.handle}</div>
            </div>
          </div>
          <SignOutButton />
        </div>
      </header>

      <main className="mx-auto flex max-w-3xl flex-col gap-6 p-6">
        {hasProfile === false && (
          <div className="flex flex-col gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>Your profile is not on file yet. You need it to sign; you can still request a consent you do not sign yourself.</span>
            {setupUrl && (
              <a href={setupUrl} className="inline-flex shrink-0 items-center justify-center rounded-lg bg-amber-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800">
                Complete my profile
              </a>
            )}
          </div>
        )}

        {contract ? (
          <RequestForm contract={contract} hasProfile={hasProfile} />
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
                {rows.map(({ a, d }) => {
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
