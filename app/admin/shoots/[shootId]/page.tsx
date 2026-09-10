export const dynamic = "force-dynamic";

import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { resolveBaseUrl, siteLocale } from "@/lib/site-config";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import QRCodePanel from "@/components/admin/QRCodePanel";
import LogoutButton from "@/components/admin/LogoutButton";
import type { Shoot, Participation } from "@/lib/types";

interface PageProps {
  params: Promise<{ shootId: string }>;
}

export default async function ShootDetailPage({ params }: PageProps) {
  const { shootId } = await params;
  const db = getDb();

  const [shootResult, contractsResult] = await Promise.all([
    db.execute({ sql: "SELECT * FROM shoots WHERE id = ?", args: [shootId] }),
    db.execute({
      sql: `SELECT p.id, p.category, p.consent_recording, p.consent_publication,
                   p.consent_adult, p.signed_at,
                   c.legal_name, c.stage_name, c.email
            FROM participations p
            JOIN contacts c ON c.id = p.contact_id
            WHERE p.shoot_id = ? ORDER BY p.signed_at DESC`,
      args: [shootId],
    }),
  ]);

  if (shootResult.rows.length === 0) notFound();

  const shoot = shootResult.rows[0] as unknown as Shoot;
  const participations = contractsResult.rows as unknown as Participation[];
  const baseUrl = await resolveBaseUrl();
  const consentUrl = `${baseUrl}/consent/${shootId}`;
  const locale = siteLocale() ?? undefined;

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin">
              <Button variant="ghost" size="sm">← Shoots</Button>
            </Link>
            <h1 className="text-xl font-bold">{shoot.title}</h1>
          </div>
          <LogoutButton />
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 p-6">

        {/* Infos shoot + QR */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-background p-4 space-y-1">
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-medium">{new Date(shoot.shoot_date).toLocaleDateString(locale)}</p>
            <p className="text-sm text-muted-foreground mt-2">Photographer</p>
            <p className="font-medium">{shoot.photographer}</p>
            {shoot.location && (
              <>
                <p className="text-sm text-muted-foreground mt-2">Location</p>
                <p className="font-medium">{shoot.location}</p>
              </>
            )}
            {shoot.notes && (
              <>
                <p className="text-sm text-muted-foreground mt-2">Notes</p>
                <p className="text-sm">{shoot.notes}</p>
              </>
            )}
          </div>
          <QRCodePanel consentUrl={consentUrl} />
        </div>

        {/* Liste des contrats */}
        <div className="rounded-lg border bg-background">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="font-semibold">
              Participants{" "}
              <span className="text-muted-foreground font-normal">({participations.length})</span>
            </h2>
          </div>

          {participations.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              No participants for this shoot.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Signed on</TableHead>
                  <TableHead>Consents</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participations.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.legal_name}
                      <span className="text-muted-foreground text-xs ml-1">({p.stage_name})</span>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.category ?? p.stage_name}</TableCell>
                    <TableCell className="text-sm">
                      {new Date(p.signed_at).toLocaleString(locale)}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {p.consent_recording  ? <Badge className="bg-green-600 text-white text-xs">Rec.</Badge>  : null}
                        {p.consent_publication ? <Badge className="bg-green-600 text-white text-xs">Pub.</Badge>  : null}
                        {p.consent_adult       ? <Badge className="bg-green-600 text-white text-xs">Adult</Badge> : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link href={`/admin/participations/${p.id}/print`} target="_blank">
                        <Button variant="outline" size="sm" className="text-xs">
                          📄 PDF
                        </Button>
                      </Link>
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
