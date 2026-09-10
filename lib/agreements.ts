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

export interface Agreement {
  id: string;
  contract: Contract;
  title: string | null;
  status: AgreementStatus;
  /** Handles (lowercase, no "@") expected to take part, in invitation order. */
  invitedHandles: string[];
  parties: Party[];
  createdAt: string;
  sealedAt: string | null;
  expiresAt: string;
}

export function agreementTtlDays(): number {
  const days = Number.parseFloat(process.env.AGREEMENT_TTL_DAYS ?? "");
  return Number.isFinite(days) && days > 0 ? days : 7;
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
    invitedHandles: JSON.parse(row.invited_handles as string) as string[],
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

export async function getAgreement(id: string): Promise<Agreement | null> {
  const db = getDb();
  const a = await db.execute({ sql: "SELECT * FROM agreements WHERE id = ?", args: [id] });
  if (!a.rows[0]) return null;
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
               SELECT 1 FROM json_each(a.invited_handles) h WHERE h.value = :handle
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

/** Create an agreement: the requester joins immediately, the others are invited. */
export async function createAgreement(input: {
  contract: Contract;
  title: string | null;
  requester: PartyInput;
  invitedHandles: string[];
}): Promise<Agreement> {
  const id = newId();
  const now = nowIso();
  const expires = new Date(Date.now() + agreementTtlDays() * 86_400_000).toISOString();
  const invited = [input.requester.subject.handle, ...input.invitedHandles];

  await getDb().execute({
    sql: `INSERT INTO agreements (id, contract_json, title, status, invited_handles, created_at, expires_at)
          VALUES (:id, :contract, :title, 'pending', :invited, :now, :expires)`,
    args: {
      id,
      contract: JSON.stringify(input.contract),
      title: input.title,
      invited: JSON.stringify(invited),
      now,
      expires,
    },
  });
  await insertParty(id, input.requester, now);

  const created = await getAgreement(id);
  if (!created) throw new Error("Agreement vanished after creation");
  return created;
}

/** Whether this subject is expected to join and has not joined yet. */
export function pendingFor(agreement: Agreement, subject: Identity): boolean {
  return (
    agreement.status === "pending" &&
    agreement.invitedHandles.includes(subject.handle) &&
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

  const joined = new Set([...agreement.parties.map((p) => p.subject.handle), party.subject.handle]);
  const complete = agreement.invitedHandles.every((h) => joined.has(h));
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
  const expired = await db.execute({
    sql: "SELECT id FROM agreements WHERE expires_at <= ?",
    args: [now],
  });
  for (const row of expired.rows) await deleteAgreement(row.id as string);
  return expired.rows.length;
}
