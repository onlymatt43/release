-- ===========================================================
-- Migration: invitation seats carry the account id.
--
-- For databases created before agreements.requester_id and
-- agreements.invited_json existed (they had invited_handles).
-- Apply once; a fresh database needs only db/schema.sql.
--
--   turso db shell <db> < db/migrations/2026-09-10-agreement-seats.sql
-- ===========================================================

ALTER TABLE agreements ADD COLUMN requester_id TEXT NOT NULL DEFAULT '';
ALTER TABLE agreements ADD COLUMN invited_json TEXT NOT NULL DEFAULT '[]';

-- The requester is the first party to have joined.
UPDATE agreements
SET requester_id = (
  SELECT p.subject_id FROM agreement_parties p
  WHERE p.agreement_id = agreements.id
  ORDER BY p.accepted_at ASC
  LIMIT 1
)
WHERE requester_id = '';

-- Seats were handles only; they stay bound to the handle (id null).
UPDATE agreements
SET invited_json = (
  SELECT json_group_array(json_object('handle', h.value, 'id', NULL))
  FROM json_each(agreements.invited_handles) h
)
WHERE invited_json = '[]';

ALTER TABLE agreements DROP COLUMN invited_handles;

CREATE INDEX IF NOT EXISTS idx_agreements_requester ON agreements(requester_id);
