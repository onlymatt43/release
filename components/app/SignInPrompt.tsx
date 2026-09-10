import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignInPrompt({ providerName, loginUrl }: { providerName: string; loginUrl: string | null }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <CardTitle>Sign in to continue</CardTitle>
          <CardDescription>Your identity and profile come from {providerName}.</CardDescription>
        </CardHeader>
        <CardContent>
          {loginUrl ? (
            <a
              href={loginUrl}
              className="inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Continue with {providerName}
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Sign-in is not configured for this deployment.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
