import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface Params { params: Promise<{ shootId: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { shootId } = await params;
  try {
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

    if (shootResult.rows.length === 0) {
      return NextResponse.json({ error: "Shoot not found" }, { status: 404 });
    }

    return NextResponse.json({
      shoot: shootResult.rows[0],
      participations: contractsResult.rows,
    });
  } catch (err) {
    console.error("[admin/shoots/:id GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { shootId } = await params;
  try {
    const db = getDb();
    await db.execute({ sql: "DELETE FROM shoots WHERE id = ?", args: [shootId] });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[admin/shoots/:id DELETE]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
