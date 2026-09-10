// Scheduled delivery of automatic reminders (see vercel.json), through the
// identity provider's own channel. Authenticated with the CRON_SECRET bearer.

import { NextResponse, type NextRequest } from "next/server";
import { listAutoRemindPending, unsignedSeats } from "@/lib/agreements";
import { reminderDue } from "@/lib/reminders";
import { sendDueReminders } from "@/lib/remind";
import { resolveBaseUrl } from "@/lib/site-config";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const sent = await sendDueReminders(await listAutoRemindPending(), reminderDue, unsignedSeats, await resolveBaseUrl());
    return NextResponse.json({ sent });
  } catch (err) {
    console.error("[cron remind]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
