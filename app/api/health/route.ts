import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const checks: Record<string, unknown> = {
    turso_url: process.env.TURSO_DATABASE_URL ? "set" : "MISSING",
    turso_token: process.env.TURSO_AUTH_TOKEN ? "set" : "MISSING",
    session_secret: process.env.SESSION_SECRET ? "set" : "MISSING",
    identity_jwt_secret: process.env.IDENTITY_JWT_SECRET ? "set" : "MISSING",
    identity_profile_url: process.env.IDENTITY_PROFILE_URL ? "set" : "MISSING",
    contract: (process.env.CONTRACT_URL || process.env.CONTRACT_JSON) ? "set" : "MISSING",
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
