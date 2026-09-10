export const dynamic = "force-dynamic";

import Link from "next/link";
import { getDb } from "@/lib/db";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import LogoutButton from "@/components/admin/LogoutButton";
import type { Contact } from "@/lib/types";

export default async function ContactsPage() {
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT c.*, COUNT(p.id) as participation_count
          FROM contacts c
          LEFT JOIN participations p ON p.contact_id = c.id
          GROUP BY c.id
          ORDER BY c.updated_at DESC`,
    args: [],
  });

  const contacts = result.rows as unknown as Contact[];

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">← Admin</Button>
            </Link>
            <h1 className="text-xl font-bold">Contacts</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl p-6">
        <div className="rounded-lg border bg-background">
          <div className="border-b px-4 py-3">
            <h2 className="font-semibold">
              All models{" "}
              <span className="text-muted-foreground font-normal">({contacts.length})</span>
            </h2>
          </div>

          {contacts.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No contacts registered.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legal name</TableHead>
                  <TableHead>Stage name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>X profile</TableHead>
                  <TableHead>Shoots</TableHead>
                  <TableHead>Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.legal_name}</TableCell>
                    <TableCell>{c.stage_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{c.email}</TableCell>
                    <TableCell className="text-sm">
                      {c.main_url ? (
                        <a href={c.main_url} target="_blank" rel="noopener noreferrer"
                          className="text-blue-600 hover:underline truncate max-w-[140px] block">
                          {c.main_url.replace("https://", "")}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <span className="text-sm font-medium">{c.participation_count ?? 0}</span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(c.updated_at).toLocaleDateString("en-CA")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}
