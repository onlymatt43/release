// Scheduled purge of agreements past their deadline (see vercel.json).
// Authenticated with the CRON_SECRET bearer the platform sends.

import { NextResponse, type NextRequest } from "next/server";
import { purgeExpired } from "@/lib/agreements";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const removed = await purgeExpired();
    return NextResponse.json({ removed });
  } catch (err) {
    console.error("[cron purge]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
