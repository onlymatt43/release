export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { resolveBaseUrl } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import ShootCard from "@/components/admin/ShootCard";
import LogoutButton from "@/components/admin/LogoutButton";
import type { Shoot } from "@/lib/types";

export default async function AdminPage() {
  const db = getDb();
  const result = await db.execute(`
    SELECT s.id, s.title, s.shoot_date, s.photographer, s.location, s.notes, s.created_at,
           COUNT(p.id) as contract_count
    FROM shoots s
    LEFT JOIN participations p ON p.shoot_id = s.id
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);

  const shoots = result.rows as unknown as Shoot[];
  const baseUrl = await resolveBaseUrl();

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <h1 className="text-xl font-bold">Admin</h1>
          <div className="flex gap-2">
            <Link href="/admin/contacts">
              <Button variant="outline" size="sm">Contacts</Button>
            </Link>
            <Link href="/admin/shoots/new">
              <Button size="sm">+ New shoot</Button>
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        {shoots.length === 0 ? (
          <div className="rounded-lg border border-dashed p-12 text-center">
            <p className="text-muted-foreground">
              No shoots yet.{" "}
              <Link href="/admin/shoots/new" className="underline">
                Create one.
              </Link>
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {shoots.map((shoot) => (
              <ShootCard key={shoot.id} shoot={shoot} baseUrl={baseUrl} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
