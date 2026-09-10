// Reminders nudge a signer who has not signed yet. Release never sends
// anything itself: a reminder is either handed to the requester as a
// pre-filled direct message they send, or passed to the identity provider,
// which owns the messaging channel. What the messages say lives in
// configuration, never in code.
//
//   REMINDER_URL / REMINDER_JSON   JSON document:
//     {
//       "messages": ["first nudge…", "second…", "last: {link}"],
//       "intervalDays": 2
//     }
//   The n-th reminder uses the n-th message; after the last one, no more
//   reminders are offered or sent. Placeholders: {handle} (the signer),
//   {from} (the requester), {title} (the agreement reference), {link}
//   (the agreement page).

import type { Agreement, Invitee } from "@/lib/agreements";

export interface ReminderConfig {
  messages: string[];
  intervalDays: number;
}

export class ReminderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReminderError";
  }
}

function parse(raw: unknown): ReminderConfig {
  const o = (raw ?? {}) as Record<string, unknown>;
  const messages = (Array.isArray(o.messages) ? o.messages : [])
    .map((m) => (typeof m === "string" ? m.trim() : ""))
    .filter(Boolean);
  if (!messages.length) throw new ReminderError("Reminder config has no messages");
  const days = Number.parseFloat(String(o.intervalDays ?? ""));
  return { messages, intervalDays: Number.isFinite(days) && days > 0 ? days : 1 };
}

/** Reminder configuration, or null when none is configured (feature off). */
export async function loadReminderConfig(): Promise<ReminderConfig | null> {
  const url = process.env.REMINDER_URL?.trim();
  const inline = process.env.REMINDER_JSON?.trim();
  if (url) {
    let res: Response;
    try {
      res = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    } catch {
      throw new ReminderError("Reminder URL unreachable");
    }
    if (!res.ok) throw new ReminderError(`Reminder URL returned ${res.status}`);
    try {
      return parse(await res.json());
    } catch (err) {
      if (err instanceof ReminderError) throw err;
      throw new ReminderError("Reminder URL returned invalid JSON");
    }
  }
  if (inline) {
    try {
      return parse(JSON.parse(inline));
    } catch (err) {
      if (err instanceof ReminderError) throw err;
      throw new ReminderError("REMINDER_JSON is not valid JSON");
    }
  }
  return null;
}

export function renderReminder(
  template: string,
  vars: { handle: string; from: string; title: string; link: string },
): string {
  return template
    .replaceAll("{handle}", `@${vars.handle}`)
    .replaceAll("{from}", `@${vars.from}`)
    .replaceAll("{title}", vars.title)
    .replaceAll("{link}", vars.link);
}

/** Message index the next reminder to this seat would use, or null when exhausted. */
export function nextReminderIndex(config: ReminderConfig, seat: Invitee): number | null {
  const sent = seat.reminders ?? 0;
  return sent < config.messages.length ? sent : null;
}

/** Whether an automatic reminder to this seat is due now. */
export function reminderDue(config: ReminderConfig, agreement: Agreement, seat: Invitee, now = Date.now()): boolean {
  if (nextReminderIndex(config, seat) === null) return false;
  const since = seat.lastReminderAt ?? agreement.createdAt;
  return new Date(since).getTime() + config.intervalDays * 86_400_000 <= now;
}
