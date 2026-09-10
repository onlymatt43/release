import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import SignOutButton from "@/components/app/SignOutButton";

/**
 * Shown only when a signed-in visitor has no profile on file and no profile
 * form is configured to send them to, or the provider could not be reached.
 */
export default function NoProfile({ providerName, error }: { providerName: string; error: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>{error ? "Temporarily unavailable" : "Profile required"}</CardTitle>
          <CardDescription>
            {error
              ? `Could not reach ${providerName}. Try again in a moment.`
              : `Complete your profile on ${providerName} first, then come back.`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
