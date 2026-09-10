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
