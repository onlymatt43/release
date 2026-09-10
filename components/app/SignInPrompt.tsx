import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

export default function SignInPrompt({
  providerName,
  loginUrl,
  locale,
}: {
  providerName: string;
  loginUrl: string | null;
  locale: Locale;
}) {
  const t = getAppDict(locale).signIn;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{t.title}</CardTitle>
          <CardDescription>{t.subtitle(providerName)}</CardDescription>
        </CardHeader>
        <CardContent>
          {loginUrl ? (
            <a
              href={loginUrl}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              {t.button(providerName)}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">{t.notConfigured}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
