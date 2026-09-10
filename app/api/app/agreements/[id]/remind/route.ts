// The requester nudges a seat that has not signed yet. Release hands back
// the message text and, when configured, a link that opens the requester's
// own messaging client with it; the requester sends it. The reminder is
// counted so the next one uses the next configured message.

import { NextResponse, type NextRequest } from "next/server";
import { getAgreement, recordReminder, unsignedSeats } from "@/lib/agreements";
import { loadReminderConfig, ReminderError } from "@/lib/reminders";
import { buildReminder } from "@/lib/remind";
import { requireSession } from "@/lib/app-request";
import { normalizeHandle } from "@/lib/identity";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (session instanceof NextResponse) return session;

  const { id } = await params;
  const agreement = await getAgreement(id);
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (agreement.requesterId !== session.id) return NextResponse.json({ error: "Only the requester can send reminders" }, { status: 403 });
  if (agreement.status !== "pending") return NextResponse.json({ error: "Nothing left to sign" }, { status: 409 });

  let body: Record<string, unknown> = {};
  try { body = (await req.json()) as Record<string, unknown>; } catch { /* no body */ }
  const handle = typeof body.handle === "string" ? normalizeHandle(body.handle) : "";
  const seat = unsignedSeats(agreement).find((s) => s.handle === handle);
  if (!seat) return NextResponse.json({ error: "No unsigned seat for that handle" }, { status: 422 });

  try {
    const config = await loadReminderConfig();
    if (!config) return NextResponse.json({ error: "Reminders are not configured" }, { status: 404 });
    const built = await buildReminder(config, agreement, seat);
    if (!built) return NextResponse.json({ error: "No reminders left for this seat" }, { status: 409 });
    await recordReminder(agreement, seat);
    return NextResponse.json({ text: built.text, composeUrl: built.composeUrl, sent: (seat.reminders ?? 0) + 1, total: config.messages.length });
  } catch (err) {
    if (err instanceof ReminderError) return NextResponse.json({ error: err.message }, { status: 500 });
    console.error("[agreements remind]", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
