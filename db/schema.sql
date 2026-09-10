-- =========================================================
-- Schema Turso / libSQL – release agreements in transit
-- =========================================================
--
-- This database stores no user data. Agreements and parties
-- exist only during transit and are hard-deleted once every
-- party has downloaded the sealed PDF or when expires_at passes
-- (via daily cron purge).
-- =========================================================

CREATE TABLE IF NOT EXISTS agreements (
  id              TEXT PRIMARY KEY,
  contract_json   TEXT NOT NULL,             -- contract frozen at creation
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sealed')),
  requester_id    TEXT NOT NULL,             -- provider subject id of the requester
  invited_json    TEXT NOT NULL,             -- JSON array of {handle, id|null}, requester first
  created_at      TEXT NOT NULL,
  sealed_at       TEXT,
  expires_at      TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agreements_expires   ON agreements(expires_at);
CREATE INDEX IF NOT EXISTS idx_agreements_requester ON agreements(requester_id);

CREATE TABLE IF NOT EXISTS agreement_parties (
  agreement_id  TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  subject_id    TEXT NOT NULL,               -- provider subject id
  handle        TEXT NOT NULL,
  subject_json  TEXT NOT NULL,               -- identity as asserted by the provider
  profile_json  TEXT NOT NULL,               -- profile snapshot at acceptance
  consents_json TEXT NOT NULL,               -- JSON array of accepted consent keys
  accepted_at   TEXT NOT NULL,
  ip_address    TEXT,
  user_agent    TEXT,
  downloaded_at TEXT,
  PRIMARY KEY (agreement_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_agreement_parties_subject ON agreement_parties(subject_id);
