// Agreements exist only while in transit: from the moment a party requests
// one until every party has downloaded the sealed document, or until the
// configured deadline passes. Deletion is a real DELETE, not a status.

import { randomBytes } from "node:crypto";
import { getDb } from "@/lib/db";
import type { Contract } from "@/lib/contract";
import type { Identity, Profile } from "@/lib/identity/types";

export type AgreementStatus = "pending" | "sealed";

export interface Party {
  subject: Identity;
  profile: Profile;
  consents: string[];
  acceptedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

/**
 * A seat at the agreement. When the provider resolved the handle at
 * invitation time, `id` binds the seat to that account even if the handle
 * later changes hands; otherwise the seat is bound to the handle alone.
 * A seat that does not sign only receives the document: someone who already
 * holds their own release, or who is being granted consent.
 */
export interface Invitee {
  handle: string;
  id: string | null;
  signs: boolean;
  /** Reminders already sent to this seat. */
  reminders?: number;
  lastReminderAt?: string | null;
}

export interface Agreement {
  id: string;
  contract: Contract;
  title: string | null;
  status: AgreementStatus;
  requesterId: string;
  /** Whether the provider sends reminders to unsigned seats on a schedule. */
  autoRemind: boolean;
  /** Every seat, requester first, in invitation order. */
  invited: Invitee[];
  /** Signers who have accepted, with the profile they accepted with. */
  parties: Party[];
  createdAt: string;
  sealedAt: string | null;
  expiresAt: string;
}

export function agreementTtlDays(): number {
  const days = Number.parseFloat(process.env.AGREEMENT_TTL_DAYS ?? "");
  return Number.isFinite(days) && days > 0 ? days : 7;
}

/** Most agreements one account may have in transit at once (default 10). */
export function maxInTransitPerRequester(): number {
  const n = Number.parseInt(process.env.AGREEMENT_MAX_IN_TRANSIT ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : 10;
}

/**
 * Minutes a fully delivered agreement lingers before deletion, so a party
 * whose download broke off can retry (default 0: deleted at once).
 */
export function deliveryGraceMinutes(): number {
  const n = Number.parseFloat(process.env.AGREEMENT_DELIVERY_GRACE_MINUTES ?? "");
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function rowToAgreement(row: Record<string, unknown>, partyRows: Record<string, unknown>[]): Agreement {
  return {
    id: row.id as string,
    contract: JSON.parse(row.contract_json as string) as Contract,
    title: (row.title as string | null) ?? null,
    status: row.status as AgreementStatus,
    requesterId: row.requester_id as string,
    autoRemind: Boolean(row.auto_remind),
    invited: JSON.parse(row.invited_json as string) as Invitee[],
    parties: partyRows.map((p) => ({
      subject: JSON.parse(p.subject_json as string) as Identity,
      profile: JSON.parse(p.profile_json as string) as Profile,
      consents: JSON.parse(p.consents_json as string) as string[],
      acceptedAt: p.accepted_at as string,
      ipAddress: (p.ip_address as string | null) ?? null,
      userAgent: (p.user_agent as string | null) ?? null,
    })),
    createdAt: row.created_at as string,
    sealedAt: (row.sealed_at as string | null) ?? null,
    expiresAt: row.expires_at as string,
  };
}

/**
 * Load an agreement. One past its deadline is deleted on the spot and
 * reported as absent, so nothing outlives its deadline even between
 * scheduled purges.
 */
export async function getAgreement(id: string): Promise<Agreement | null> {
  const db = getDb();
  const a = await db.execute({ sql: "SELECT * FROM agreements WHERE id = ?", args: [id] });
  if (!a.rows[0]) return null;
  if ((a.rows[0].expires_at as string) <= nowIso()) {
    await deleteAgreement(id);
    return null;
  }
  const p = await db.execute({
    sql: "SELECT * FROM agreement_parties WHERE agreement_id = ? ORDER BY accepted_at ASC",
    args: [id],
  });
  return rowToAgreement(a.rows[0] as Record<string, unknown>, p.rows as Record<string, unknown>[]);
}

/** Every in-transit agreement the subject is invited to or has joined. */
export async function listAgreementsFor(subject: Identity): Promise<Agreement[]> {
  const db = getDb();
  const res = await db.execute({
    sql: `SELECT DISTINCT a.id
          FROM agreements a
          LEFT JOIN agreement_parties p ON p.agreement_id = a.id
          WHERE p.subject_id = :id
             OR EXISTS (
               SELECT 1 FROM json_each(a.invited_json) i
               WHERE (json_extract(i.value, '$.id') IS NOT NULL AND json_extract(i.value, '$.id') = :id)
                  OR (json_extract(i.value, '$.id') IS NULL AND json_extract(i.value, '$.handle') = :handle)
             )
          ORDER BY a.created_at DESC`,
    args: { id: subject.id, handle: subject.handle },
  });
  const out: Agreement[] = [];
  for (const row of res.rows) {
    const a = await getAgreement(row.id as string);
    if (a) out.push(a);
  }
  return out;
}

export interface PartyInput {
  subject: Identity;
  profile: Profile;
  consents: string[];
  ipAddress: string | null;
  userAgent: string | null;
}

async function insertParty(agreementId: string, party: PartyInput, acceptedAt: string): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO agreement_parties
            (agreement_id, subject_id, handle, subject_json, profile_json, consents_json,
             accepted_at, ip_address, user_agent)
          VALUES (:agreementId, :subjectId, :handle, :subjectJson, :profileJson, :consentsJson,
                  :acceptedAt, :ipAddress, :userAgent)`,
    args: {
      agreementId,
      subjectId: party.subject.id,
      handle: party.subject.handle,
      subjectJson: JSON.stringify(party.subject),
      profileJson: JSON.stringify(party.profile),
      consentsJson: JSON.stringify(party.consents),
      acceptedAt,
      ipAddress: party.ipAddress,
      userAgent: party.userAgent,
    },
  });
}

/** Subjects who have downloaded the sealed document. */
async function deliveredTo(agreementId: string): Promise<Set<string>> {
  const res = await getDb().execute({
    sql: "SELECT subject_id FROM agreement_deliveries WHERE agreement_id = ?",
    args: [agreementId],
  });
  return new Set(res.rows.map((r) => r.subject_id as string));
}

/** How many in-transit agreements this account has requested. */
export async function countInTransitRequestedBy(subjectId: string): Promise<number> {
  const res = await getDb().execute({
    sql: "SELECT COUNT(*) AS n FROM agreements WHERE requester_id = ? AND expires_at > ?",
    args: [subjectId, nowIso()],
  });
  return Number(res.rows[0]?.n ?? 0);
}

/** Create an agreement: the requester joins immediately, the others are invited. */
/**
 * Create an agreement. The requester takes the first seat; when they sign,
 * their acceptance is recorded at once (`requester.party` carries their
 * profile). The agreement seals immediately if no other seat signs.
 */
export async function createAgreement(input: {
  contract: Contract;
  title: string | null;
  requester: { subject: Identity; party: PartyInput | null };
  invited: Invitee[];
  autoRemind?: boolean;
}): Promise<Agreement> {
  const id = newId();
  const now = nowIso();
  const expires = new Date(Date.now() + agreementTtlDays() * 86_400_000).toISOString();
  const requester = input.requester.subject;
  const requesterSigns = input.requester.party !== null;
  const invited: Invitee[] = [{ handle: requester.handle, id: requester.id, signs: requesterSigns }, ...input.invited];
  if (!invited.some((i) => i.signs)) throw new Error("At least one seat must sign");

  const sealedNow = !input.invited.some((i) => i.signs);

  await getDb().execute({
    sql: `INSERT INTO agreements (id, contract_json, title, status, requester_id, auto_remind, invited_json, created_at, sealed_at, expires_at)
          VALUES (:id, :contract, :title, :status, :requesterId, :autoRemind, :invited, :now, :sealedAt, :expires)`,
    args: {
      id,
      contract: JSON.stringify(input.contract),
      title: input.title,
      status: sealedNow ? "sealed" : "pending",
      requesterId: requester.id,
      autoRemind: input.autoRemind ? 1 : 0,
      invited: JSON.stringify(invited),
      now,
      sealedAt: sealedNow ? now : null,
      expires,
    },
  });
  if (input.requester.party) await insertParty(id, input.requester.party, now);

  const created = await getAgreement(id);
  if (!created) throw new Error("Agreement vanished after creation");
  return created;
}

/** Whether an invitation seat belongs to this subject. */
export function seatMatches(invitee: Invitee, subject: Identity): boolean {
  return invitee.id !== null ? invitee.id === subject.id : invitee.handle === subject.handle;
}

/** The party who has taken this seat, if any. */
export function seatTakenBy(agreement: Agreement, invitee: Invitee): Party | null {
  return agreement.parties.find((p) => seatMatches(invitee, p.subject)) ?? null;
}

/** The seat this subject holds, if any. */
export function seatOf(agreement: Agreement, subject: Identity): Invitee | null {
  return agreement.invited.find((i) => seatMatches(i, subject)) ?? null;
}

/** Whether this subject is expected to sign and has not signed yet. */
export function pendingFor(agreement: Agreement, subject: Identity): boolean {
  const seat = seatOf(agreement, subject);
  return (
    agreement.status === "pending" &&
    seat !== null &&
    seat.signs &&
    !agreement.parties.some((p) => p.subject.id === subject.id)
  );
}

export function partyOf(agreement: Agreement, subject: Identity): Party | null {
  return agreement.parties.find((p) => p.subject.id === subject.id) ?? null;
}

/** A subject joins; the agreement seals once every invited handle has joined. */
export async function acceptAgreement(agreement: Agreement, party: PartyInput): Promise<Agreement> {
  if (!pendingFor(agreement, party.subject)) throw new Error("This account is not expected to join");
  const now = nowIso();
  await insertParty(agreement.id, party, now);

  const joined = [...agreement.parties.map((p) => p.subject), party.subject];
  const complete = agreement.invited.every((i) => !i.signs || joined.some((s) => seatMatches(i, s)));
  if (complete) {
    await getDb().execute({
      sql: "UPDATE agreements SET status = 'sealed', sealed_at = ? WHERE id = ?",
      args: [now, agreement.id],
    });
  }

  const updated = await getAgreement(agreement.id);
  if (!updated) throw new Error("Agreement vanished after acceptance");
  return updated;
}

/** Record that one more reminder went to this seat. */
export async function recordReminder(agreement: Agreement, seat: Invitee): Promise<void> {
  const invited = agreement.invited.map((i) =>
    i === seat || (i.handle === seat.handle && i.id === seat.id)
      ? { ...i, reminders: (i.reminders ?? 0) + 1, lastReminderAt: nowIso() }
      : i
  );
  await getDb().execute({
    sql: "UPDATE agreements SET invited_json = ? WHERE id = ?",
    args: [JSON.stringify(invited), agreement.id],
  });
}

/** Pending agreements that asked for automatic reminders. */
export async function listAutoRemindPending(): Promise<Agreement[]> {
  const res = await getDb().execute({
    sql: "SELECT id FROM agreements WHERE status = 'pending' AND auto_remind = 1 AND expires_at > ?",
    args: [nowIso()],
  });
  const out: Agreement[] = [];
  for (const row of res.rows) {
    const a = await getAgreement(row.id as string);
    if (a) out.push(a);
  }
  return out;
}

/** Signing seats nobody has signed for yet. */
export function unsignedSeats(agreement: Agreement): Invitee[] {
  return agreement.invited.filter((i) => i.signs && !seatTakenBy(agreement, i));
}

export async function markDownloaded(agreementId: string, subjectId: string): Promise<void> {
  await getDb().execute({
    sql: `INSERT OR IGNORE INTO agreement_deliveries (agreement_id, subject_id, downloaded_at)
          VALUES (?, ?, ?)`,
    args: [agreementId, subjectId, nowIso()],
  });
}

/** Whether every seat, signing or not, has downloaded the document. */
export async function everyoneDownloaded(agreement: Agreement): Promise<boolean> {
  const delivered = await deliveredTo(agreement.id);
  return agreement.invited.every((seat) => {
    if (seat.id) return delivered.has(seat.id);
    // A handle-only seat is identified by whoever signed for it, if anyone.
    const party = seatTakenBy(agreement, seat);
    return party ? delivered.has(party.subject.id) : false;
  });
}

/** Whether this subject already has their copy. */
export async function hasDownloaded(agreementId: string, subjectId: string): Promise<boolean> {
  return (await deliveredTo(agreementId)).has(subjectId);
}

/**
 * Everyone has their copy: delete now, or, when a grace window is
 * configured, move the deadline to the end of that window so a broken
 * download can be retried. Never pushes an existing deadline later.
 */
export async function finishDelivery(agreementId: string): Promise<void> {
  const grace = deliveryGraceMinutes();
  if (grace <= 0) {
    await deleteAgreement(agreementId);
    return;
  }
  const deadline = new Date(Date.now() + grace * 60_000).toISOString();
  await getDb().execute({
    sql: "UPDATE agreements SET expires_at = MIN(expires_at, ?) WHERE id = ?",
    args: [deadline, agreementId],
  });
}

/** Remove an agreement and everything attached to it. */
export async function deleteAgreement(agreementId: string): Promise<void> {
  const db = getDb();
  await db.batch(
    [
      { sql: "DELETE FROM agreement_deliveries WHERE agreement_id = ?", args: [agreementId] },
      { sql: "DELETE FROM agreement_parties WHERE agreement_id = ?", args: [agreementId] },
      { sql: "DELETE FROM agreements WHERE id = ?", args: [agreementId] },
    ],
    "write"
  );
}

/** Delete every agreement past its deadline. Returns how many were removed. */
export async function purgeExpired(): Promise<number> {
  const db = getDb();
  const now = nowIso();
  const expired = await db.execute({
    sql: "SELECT id FROM agreements WHERE expires_at <= ?",
    args: [now],
  });
  for (const row of expired.rows) await deleteAgreement(row.id as string);
  return expired.rows.length;
}
