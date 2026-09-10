-- ===========================================================
-- Schema Turso / libSQL – model release & consent forms
-- ===========================================================

-- Table des shoots (séances photo/vidéo)
CREATE TABLE IF NOT EXISTS shoots (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  title        TEXT NOT NULL,
  shoot_date   TEXT NOT NULL,            -- ISO-8601 : YYYY-MM-DD
  photographer TEXT NOT NULL,
  location     TEXT,
  category     TEXT,                     -- étiquette admin (ex: Premium, Promo…)
  notes        TEXT,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Profils permanents des modèles (un seul par email)
CREATE TABLE IF NOT EXISTS contacts (
  id           TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  legal_name   TEXT NOT NULL,
  stage_name   TEXT NOT NULL,
  main_url     TEXT,
  birth_date   TEXT NOT NULL,            -- ISO-8601 : YYYY-MM-DD
  email        TEXT NOT NULL,
  phone        TEXT,
  address      TEXT NOT NULL,
  doc_type     TEXT,                     -- passport | drivers_license | id_card
  recto_id_key TEXT,                     -- clé R2 : contacts/{id}/recto.jpg
  verso_id_key TEXT,                     -- clé R2 : contacts/{id}/verso.jpg
  selfie_key   TEXT,                     -- clé R2 : contacts/{id}/selfie.jpg
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);

-- Participations : lien contact ↔ shoot + consentement signé
CREATE TABLE IF NOT EXISTS participations (
  id                  TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  contact_id          TEXT NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  shoot_id            TEXT NOT NULL REFERENCES shoots(id)   ON DELETE CASCADE,
  category            TEXT,                      -- étiquette libre (défaut: nom de scène)
  signature_data      TEXT NOT NULL,
  consent_recording   INTEGER NOT NULL DEFAULT 0 CHECK (consent_recording   IN (0,1)),
  consent_publication INTEGER NOT NULL DEFAULT 0 CHECK (consent_publication IN (0,1)),
  consent_adult       INTEGER NOT NULL DEFAULT 0 CHECK (consent_adult       IN (0,1)),
  ip_address          TEXT,
  user_agent          TEXT,
  signed_at           TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_participations_contact ON participations(contact_id);
CREATE INDEX IF NOT EXISTS idx_participations_shoot   ON participations(shoot_id);

-- ===========================================================
-- Transport flow: agreements exist only while in transit.
-- Rows are hard-deleted once every party has downloaded the
-- sealed document, or when expires_at passes (cron purge).
-- ===========================================================

CREATE TABLE IF NOT EXISTS agreements (
  id              TEXT PRIMARY KEY,
  contract_json   TEXT NOT NULL,             -- contract frozen at creation
  title           TEXT,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sealed')),
  requester_id    TEXT NOT NULL,             -- provider subject id of the requester
  auto_remind     INTEGER NOT NULL DEFAULT 0 CHECK (auto_remind IN (0,1)),
  invited_json    TEXT NOT NULL,             -- JSON array of {handle, id|null, signs, reminders?, lastReminderAt?}, requester first
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
  PRIMARY KEY (agreement_id, subject_id)
);

CREATE INDEX IF NOT EXISTS idx_agreement_parties_subject ON agreement_parties(subject_id);

-- Who has downloaded the sealed document (signing or receiving seats alike)
CREATE TABLE IF NOT EXISTS agreement_deliveries (
  agreement_id  TEXT NOT NULL REFERENCES agreements(id) ON DELETE CASCADE,
  subject_id    TEXT NOT NULL,
  downloaded_at TEXT NOT NULL,
  PRIMARY KEY (agreement_id, subject_id)
);
