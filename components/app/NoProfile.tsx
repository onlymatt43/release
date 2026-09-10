import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SignOutButton from "@/components/app/SignOutButton";
import { getAppDict } from "@/lib/app-i18n";
import type { Locale } from "@/lib/locale";

/**
 * Shown only when a signed-in visitor has no profile on file and no profile
 * form is configured to send them to, or the provider could not be reached.
 */
export default function NoProfile({
  providerName,
  error,
  locale,
}: {
  providerName: string;
  error: string | null;
  locale: Locale;
}) {
  const t = getAppDict(locale).noProfile;
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{error ? t.titleUnavailable : t.titleRequired}</CardTitle>
          <CardDescription>
            {error ? t.unavailable(providerName) : t.required(providerName)}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton locale={locale} />
        </CardContent>
      </Card>
    </div>
  );
}
