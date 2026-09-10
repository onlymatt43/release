export const dynamic = "force-dynamic";

import Link from "next/link";
import { headers } from "next/headers";
import { notFound, unstable_rethrow } from "next/navigation";
import { getSession } from "@/lib/session";
import { getIdentityProvider } from "@/lib/identity";
import { getAgreement, pendingFor, seatOf, seatMatches, seatTakenBy } from "@/lib/agreements";
import { requireProfile } from "@/lib/app-request";
import NoProfile from "@/components/app/NoProfile";
import RemindButton from "@/components/app/RemindButton";
import { loadReminderConfig } from "@/lib/reminders";
import { resolveBaseUrl, siteTimeZone } from "@/lib/site-config";
import { pickLocale, type Locale } from "@/lib/locale";
import { getAppDict } from "@/lib/app-i18n";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import AcceptForm from "@/components/app/AcceptForm";
import ContractText from "@/components/app/ContractText";
import SignInPrompt from "@/components/app/SignInPrompt";
import LangToggle from "@/components/app/LangToggle";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ lang?: string }>;
}

export default async function AgreementPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { lang } = await searchParams;
  const h = await headers();
  const locale: Locale = pickLocale(h.get("accept-language"), lang);
  const t = getAppDict(locale);

  const session = await getSession();
  const provider = getIdentityProvider();

  if (!session) {
    const base = await resolveBaseUrl();
    return <SignInPrompt providerName={provider.name} loginUrl={provider.loginUrl(`${base}/app/a/${id}`)} locale={locale} />;
  }

  // Mandatory: no profile on file, no access. Redirects to the profile form
  // and back here once it exists.
  let profileOk = false;
  let providerError: string | null = null;
  try {
    profileOk = (await requireProfile(provider, session, `/app/a/${id}`)) !== null;
  } catch (err) {
    unstable_rethrow(err); // redirect() to the profile form travels as a thrown error
    providerError = err instanceof Error ? err.message : "Identity provider unavailable";
  }
  if (!profileOk) return <NoProfile providerName={provider.name} error={providerError} locale={locale} />;

  const agreement = await getAgreement(id);
  if (!agreement) notFound();

  const seat = seatOf(agreement, session);
  if (!seat) notFound();
  const pending = pendingFor(agreement, session);

  // Reminder controls for the requester, when reminders are configured.
  let reminderTotal = 0;
  if (agreement.requesterId === session.id && agreement.status === "pending") {
    try { reminderTotal = (await loadReminderConfig())?.messages.length ?? 0; } catch { reminderTotal = 0; }
  }

  const timeZone = siteTimeZone() ?? undefined;
  const fmt = (iso: string) => new Date(iso).toLocaleString(locale, { timeZone });

  return (
    <div className="flex min-h-screen items-start justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle>{agreement.contract.title}</CardTitle>
            <div className="flex items-center gap-3">
              <LangToggle />
              <Badge variant={agreement.status === "sealed" ? "default" : "secondary"}>
                {agreement.status === "sealed" ? t.agreement.sealed : t.agreement.pending}
              </Badge>
            </div>
          </div>
          {agreement.title && <CardDescription>{agreement.title}</CardDescription>}
        </CardHeader>

        <CardContent className="flex flex-col gap-5">
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">{t.agreement.parties}</h2>
            <ul className="flex flex-col gap-1 text-sm">
              {agreement.invited.map((i) => {
                const p = seatTakenBy(agreement, i);
                return (
                  <li key={i.id ?? i.handle} className="flex items-center justify-between">
                    <span>
                      @{p?.subject.handle ?? i.handle}
                      {seatMatches(i, session) ? ` (${t.agreement.you})` : ""}
                    </span>
                    {reminderTotal > 0 && i.signs && !p && !seatMatches(i, session) ? (
                      <RemindButton
                        agreementId={agreement.id}
                        handle={i.handle}
                        sent={i.reminders ?? 0}
                        total={reminderTotal}
                        lastAt={i.lastReminderAt ?? null}
                        locale={locale}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        {!i.signs ? t.agreement.receivesCopy : p ? t.agreement.signedOn(fmt(p.acceptedAt)) : t.agreement.notSignedYet}
                      </span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          <ContractText contract={agreement.contract} />

          {pending && <AcceptForm agreementId={agreement.id} contract={agreement.contract} locale={locale} />}

          {agreement.status === "sealed" && (
            <a
              href={`/api/app/agreements/${agreement.id}/pdf`}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {t.agreement.download}
            </a>
          )}

          {!pending && agreement.status !== "sealed" && (
            <p className="text-sm text-muted-foreground">
              {t.agreement.waitingToSign(agreement.invited.length > 2)}
              {agreement.autoRemind ? ` ${t.agreement.autoRemindOn}` : ""}
            </p>
          )}

          <p className="text-xs text-muted-foreground">{t.agreement.expires(fmt(agreement.expiresAt))}</p>

          <Link href="/app" className="text-sm underline">{t.agreement.back}</Link>
        </CardContent>
      </Card>
    </div>
  );
}
