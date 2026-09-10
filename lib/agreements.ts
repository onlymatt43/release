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
  downloadedAt: string | null;
}

/**
 * Someone expected to take part. When the provider resolved the handle at
 * invitation time, `id` binds the seat to that account even if the handle
 * later changes hands; otherwise the seat is bound to the handle alone.
 */
export interface Invitee {
  handle: string;
  id: string | null;
}

export interface Agreement {
  id: string;
  contract: Contract;
  title: string | null;
  status: AgreementStatus;
  requesterId: string;
  /** Everyone expected to take part, requester first, in invitation order. */
  invited: Invitee[];
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
 * whose download broke off can retry (default 15). The download is recorded
 * when the response is handed off, not when the bytes reach the browser, so
 * 0 (delete at once) is only safe when every party is on a reliable link.
 */
export function deliveryGraceMinutes(): number {
  const n = Number.parseFloat(process.env.AGREEMENT_DELIVERY_GRACE_MINUTES ?? "");
  return Number.isFinite(n) && n >= 0 ? n : 15;
}

function newId(): string {
  return randomBytes(16).toString("hex");
}

function nowIso(): string {
  return new Date().toISOString();
}

function parseInvited(json: string): Invitee[] {
  return JSON.parse(json) as Invitee[];
}

function rowToAgreement(row: Record<string, unknown>, partyRows: Record<string, unknown>[]): Agreement {
  return {
    id: row.id as string,
    contract: JSON.parse(row.contract_json as string) as Contract,
    title: (row.title as string | null) ?? null,
    status: row.status as AgreementStatus,
    requesterId: row.requester_id as string,
    invited: parseInvited(row.invited_json as string),
    parties: partyRows.map((p) => ({
      subject: JSON.parse(p.subject_json as string) as Identity,
      profile: JSON.parse(p.profile_json as string) as Profile,
      consents: JSON.parse(p.consents_json as string) as string[],
      acceptedAt: p.accepted_at as string,
      ipAddress: (p.ip_address as string | null) ?? null,
      userAgent: (p.user_agent as string | null) ?? null,
      downloadedAt: (p.downloaded_at as string | null) ?? null,
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
  const now = nowIso();
  const res = await db.execute({
    sql: `SELECT DISTINCT a.id, a.contract_json, a.title, a.status, a.requester_id,
                 a.invited_json, a.created_at, a.sealed_at, a.expires_at
          FROM agreements a
          LEFT JOIN agreement_parties p ON p.agreement_id = a.id
          WHERE a.expires_at > :now
             AND (p.subject_id = :id
             OR EXISTS (
               SELECT 1 FROM json_each(a.invited_json) i
               WHERE (json_extract(i.value, '$.id') IS NOT NULL AND json_extract(i.value, '$.id') = :id)
                  OR (json_extract(i.value, '$.id') IS NULL AND json_extract(i.value, '$.handle') = :handle)
             ))
          ORDER BY a.created_at DESC`,
    args: { id: subject.id, handle: subject.handle, now },
  });

  if (res.rows.length === 0) return [];

  const agreementIds = res.rows.map((row) => (row.id as string));
  const parties = await db.execute({
    sql: `SELECT * FROM agreement_parties WHERE agreement_id IN (${agreementIds.map(() => "?").join(",")}) ORDER BY agreement_id, accepted_at ASC`,
    args: agreementIds,
  });

  const partiesByAgreement = new Map<string, Record<string, unknown>[]>();
  for (const party of parties.rows) {
    const id = party.agreement_id as string;
    if (!partiesByAgreement.has(id)) {
      partiesByAgreement.set(id, []);
    }
    partiesByAgreement.get(id)!.push(party as Record<string, unknown>);
  }

  const out: Agreement[] = [];
  for (const row of res.rows) {
    const id = row.id as string;
    const partyRows = partiesByAgreement.get(id) ?? [];
    out.push(rowToAgreement(row as Record<string, unknown>, partyRows));
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

/** Record a party. A second acceptance by the same account keeps the first one. */
async function insertParty(agreementId: string, party: PartyInput, acceptedAt: string): Promise<void> {
  await getDb().execute({
    sql: `INSERT OR IGNORE INTO agreement_parties
            (agreement_id, subject_id, handle, subject_json, profile_json, consents_json,
             accepted_at, ip_address, user_agent)
          SELECT :agreementId, :subjectId, :handle, :subjectJson, :profileJson, :consentsJson,
                 :acceptedAt, :ipAddress, :userAgent
          WHERE EXISTS (SELECT 1 FROM agreements WHERE id = :agreementId AND expires_at > :acceptedAt)`,
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

/** How many in-transit agreements this account has requested. */
export async function countInTransitRequestedBy(subjectId: string): Promise<number> {
  const res = await getDb().execute({
    sql: `SELECT COUNT(DISTINCT a.id) AS n FROM agreements a
          WHERE a.requester_id = ? AND a.expires_at > ?
            AND (a.status = 'pending' OR EXISTS (
              SELECT 1 FROM agreement_parties p
              WHERE p.agreement_id = a.id AND p.downloaded_at IS NULL
            ))`,
    args: [subjectId, nowIso()],
  });
  return Number(res.rows[0]?.n ?? 0);
}

/** Create an agreement: the requester joins immediately, the others are invited. */
export async function createAgreement(input: {
  contract: Contract;
  title: string | null;
  requester: PartyInput;
  invited: Invitee[];
}): Promise<Agreement> {
  const id = newId();
  const now = nowIso();
  const expires = new Date(Date.now() + agreementTtlDays() * 86_400_000).toISOString();
  const requester = input.requester.subject;
  const invited: Invitee[] = [{ handle: requester.handle, id: requester.id }, ...input.invited];

  const db = getDb();
  await db.batch(
    [
      {
        sql: `INSERT INTO agreements (id, contract_json, title, status, requester_id, invited_json, created_at, expires_at)
              VALUES (:id, :contract, :title, 'pending', :requesterId, :invited, :now, :expires)`,
        args: {
          id,
          contract: JSON.stringify(input.contract),
          title: input.title,
          requesterId: requester.id,
          invited: JSON.stringify(invited),
          now,
          expires,
        },
      },
      {
        sql: `INSERT INTO agreement_parties (agreement_id, subject_id, handle, subject_json, profile_json, consents_json, accepted_at, ip_address, user_agent)
              SELECT :id, :subjectId, :handle, :subject, :profile, :consents, :now, :ip, :ua
              WHERE EXISTS (SELECT 1 FROM agreements WHERE id = :id AND expires_at > :now)`,
        args: {
          id,
          subjectId: requester.id,
          handle: requester.handle,
          subject: JSON.stringify(input.requester.subject),
          profile: JSON.stringify(input.requester.profile),
          consents: JSON.stringify(input.requester.consents),
          now,
          ip: input.requester.ipAddress,
          ua: input.requester.userAgent,
        },
      },
    ],
    "write"
  );

  const created = await getAgreement(id);
  if (!created) throw new Error("Agreement vanished after creation");
  return created;
}

/** Whether an invitation seat belongs to this subject. */
export function seatMatches(invitee: Invitee, subject: Identity): boolean {
  return invitee.id != null ? invitee.id === subject.id : invitee.handle === subject.handle;
}

/** The party who has taken this seat, if any. */
export function seatTakenBy(agreement: Agreement, invitee: Invitee): Party | null {
  return agreement.parties.find((p) => seatMatches(invitee, p.subject)) ?? null;
}

/**
 * Whether this subject is expected to join and has not joined yet: there is
 * a seat for them that nobody has taken. A seat bound to a handle alone is
 * closed by whoever took it first, even to another account with that handle.
 */
export function pendingFor(agreement: Agreement, subject: Identity): boolean {
  return (
    agreement.status === "pending" &&
    partyOf(agreement, subject) === null &&
    agreement.invited.some((i) => seatMatches(i, subject) && !seatTakenBy(agreement, i))
  );
}

export function partyOf(agreement: Agreement, subject: Identity): Party | null {
  return agreement.parties.find((p) => p.subject.id === subject.id) ?? null;
}

/**
 * A subject joins; the agreement seals once every seat is taken.
 *
 * Completeness is decided from what the database holds after the insert,
 * never from the caller's snapshot: two invitees accepting at the same
 * moment each see the other's row, so the last one in seals. The UPDATE is
 * conditional so that sealing happens exactly once.
 */
export async function acceptAgreement(agreement: Agreement, party: PartyInput): Promise<Agreement> {
  if (!pendingFor(agreement, party.subject)) throw new Error("This account is not expected to join");
  await insertParty(agreement.id, party, nowIso());

  const joined = await getAgreement(agreement.id);
  if (!joined) throw new Error("Agreement vanished after acceptance");
  if (joined.status !== "pending" || !joined.invited.every((i) => seatTakenBy(joined, i))) return joined;

  const sealedAt = nowIso();
  const res = await getDb().execute({
    sql: "UPDATE agreements SET status = 'sealed', sealed_at = ? WHERE id = ? AND status = 'pending'",
    args: [sealedAt, joined.id],
  });
  if (res.rowsAffected > 0) return { ...joined, status: "sealed", sealedAt };
  return (await getAgreement(joined.id)) ?? joined;
}

export async function markDownloaded(agreementId: string, subjectId: string): Promise<void> {
  await getDb().execute({
    sql: `UPDATE agreement_parties SET downloaded_at = ?
          WHERE agreement_id = ? AND subject_id = ? AND downloaded_at IS NULL`,
    args: [nowIso(), agreementId, subjectId],
  });
}

export async function everyoneDownloaded(agreementId: string): Promise<boolean> {
  const res = await getDb().execute({
    sql: `SELECT COUNT(*) AS remaining FROM agreement_parties
          WHERE agreement_id = ? AND downloaded_at IS NULL`,
    args: [agreementId],
  });
  return Number(res.rows[0]?.remaining ?? 1) === 0;
}

/**
 * Everyone has their copy: move the deadline to the end of the grace window
 * so a broken download can be retried, or delete now when the window is
 * configured to 0. Never pushes an existing deadline later.
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
  const result = await db.batch(
    [
      { sql: "DELETE FROM agreement_parties WHERE agreement_id IN (SELECT id FROM agreements WHERE expires_at <= ?)", args: [now] },
      { sql: "DELETE FROM agreements WHERE expires_at <= ?", args: [now] },
      { sql: "DELETE FROM agreement_parties WHERE agreement_id NOT IN (SELECT id FROM agreements)", args: [] },
    ],
    "write"
  );
  return result[1]?.rowsAffected ?? 0;
}
