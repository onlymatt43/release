import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    turso_url: process.env.TURSO_DATABASE_URL ? "set" : "MISSING",
    turso_token: process.env.TURSO_AUTH_TOKEN ? "set" : "MISSING",
    r2_endpoint: process.env.R2_ENDPOINT ? "set" : "MISSING",
    r2_bucket: process.env.R2_BUCKET_NAME ? "set" : "MISSING",
    google_maps: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? "set" : "MISSING",
  };

  try {
    const db = getDb();
    const res = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name");
    checks.db = "connected";
    checks.tables = res.rows.map(r => r.name);
  } catch (err) {
    checks.db = "ERROR";
    checks.db_error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(checks);
}
