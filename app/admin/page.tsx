export const dynamic = "force-dynamic";

import LogoutButton from "@/components/admin/LogoutButton";

// Contenu à définir par l'auteur
export default function AdminPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold">Admin</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <p className="text-muted-foreground">Admin panel content to be defined by author.</p>
      </main>
    </div>
  );
}
