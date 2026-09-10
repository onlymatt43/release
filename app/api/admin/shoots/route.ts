import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { siteOperatorName } from "@/lib/site-config";

export async function GET() {
  try {
    const db = getDb();
    const result = await db.execute(`
      SELECT s.id, s.title, s.shoot_date, s.photographer, s.location, s.created_at,
             COUNT(p.id) as contract_count
      FROM shoots s
      LEFT JOIN participations p ON p.shoot_id = s.id
      GROUP BY s.id
      ORDER BY s.created_at DESC
    `);
    return NextResponse.json({ shoots: result.rows });
  } catch (err) {
    console.error("[admin/shoots GET]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { title, shootDate, location, category, notes } = body as Record<string, unknown>;

  if (typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "title required" }, { status: 422 });
  }
  if (typeof shootDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(shootDate)) {
    return NextResponse.json({ error: "invalid shootDate (YYYY-MM-DD)" }, { status: 422 });
  }

  try {
    const db = getDb();
    const result = await db.execute({
      sql: `INSERT INTO shoots (title, shoot_date, photographer, location, category, notes)
            VALUES (:title, :shootDate, :photographer, :location, :category, :notes)
            RETURNING id`,
      args: {
        title: title.trim(),
        shootDate,
        photographer: siteOperatorName() ?? "—",
        location: typeof location === "string" ? location.trim() || null : null,
        category: typeof category === "string" ? category.trim() || null : null,
        notes: typeof notes === "string" ? notes.trim() || null : null,
      },
    });
    const id = result.rows[0].id as string;
    return NextResponse.json({ id }, { status: 201 });
  } catch (err) {
    console.error("[admin/shoots POST]", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
