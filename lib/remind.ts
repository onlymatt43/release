// Build and record one reminder to an unsigned seat. Shared by the manual
// button (the requester sends the text themselves) and the scheduled run
// (the provider sends it).

import { getIdentityProvider } from "@/lib/identity";
import { recordReminder, type Agreement, type Invitee } from "@/lib/agreements";
import { loadReminderConfig, nextReminderIndex, renderReminder, type ReminderConfig } from "@/lib/reminders";
import { resolveBaseUrl } from "@/lib/site-config";

export interface BuiltReminder {
  text: string;
  composeUrl: string | null;
  index: number;
}

export async function buildReminder(
  config: ReminderConfig,
  agreement: Agreement,
  seat: Invitee,
  baseUrl?: string,
): Promise<BuiltReminder | null> {
  const index = nextReminderIndex(config, seat);
  if (index === null) return null;
  const requester = agreement.invited[0];
  const base = baseUrl ?? (await resolveBaseUrl());
  const text = renderReminder(config.messages[index], {
    handle: seat.handle,
    from: requester.handle,
    title: agreement.title ?? agreement.contract.title,
    link: `${base}/app/a/${agreement.id}`,
  });
  return { text, composeUrl: getIdentityProvider().composeMessageUrl(seat, text), index };
}

/** Send every reminder that is due through the provider. Returns how many went out. */
export async function sendDueReminders(
  agreements: Agreement[],
  isDue: (config: ReminderConfig, a: Agreement, seat: Invitee) => boolean,
  unsigned: (a: Agreement) => Invitee[],
  baseUrl: string,
): Promise<number> {
  const config = await loadReminderConfig();
  const provider = getIdentityProvider();
  if (!config || !provider.canNotify()) return 0;

  let sent = 0;
  for (const agreement of agreements) {
    for (const seat of unsigned(agreement)) {
      if (!isDue(config, agreement, seat)) continue;
      const built = await buildReminder(config, agreement, seat, baseUrl);
      if (!built) continue;
      try {
        await provider.notify(seat, built.text, { agreementId: agreement.id });
        await recordReminder(agreement, seat);
        sent++;
      } catch (err) {
        console.error("[reminders] delivery failed", err instanceof Error ? err.message : err);
      }
    }
  }
  return sent;
}
