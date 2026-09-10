# Release — Neutral White-Label Consent & Transport System

This is a **zero-retention transport flow** for two-party consent agreements. No user accounts, profiles, or documents are stored permanently. Identity comes from an external provider, documents circulate, PDFs are generated, then everything is deleted.

## What This Project Is

- **NOT** a general-purpose Next.js application—it is a specialized consent and document delivery system
- **NOT** a multi-user platform—it handles temporary sessions and immediate cleanup
- A bridge between external identity providers and secure agreement workflows
- Configuration-driven: all operator values (branding, URLs, webhooks) come from environment variables, never hardcoded

## Core Principles for Development

1. **Zero retention**: All data is deleted after delivery or expiration. No archival, no backup recovery, no "undo" options for deleted records.
2. **Session-based identity**: Users are authenticated via short-lived tokens from external providers. No persistent user accounts.
3. **Immutable agreements**: Once created, an agreement is frozen at that moment. Profile data, contract text, and consent state are captured and never change.
4. **Environment-driven configuration**: Use `node_modules/next/dist/docs/` to understand this version's Next.js APIs. All runtime values come from `.env` or `IDENTITY_*`, `AGREEMENT_*`, `CONTRACT_*` prefixed variables—never hardcode them.

## Before Writing Any Code

- Read `docs/INTEGRATION.md` to understand the transport flow, endpoints, and data flow
- Check `.env.example` for the complete list of configuration variables
- Understand that this is NOT a social network, CMS, or user-facing app—it's infrastructure for agreement workflows
- When suggesting features or refactors, consider whether they break the zero-retention or session-based model

## Git Development Branch

Work on: `claude/awesome-davinci-pilqt8`

Always commit with clear messages explaining *why*, not just what changed. The history is the audit trail for a consent system.

---

## For AI Agents

**Disruptive behaviors to avoid:**

- Suggesting user accounts, persistent storage, or undo/recovery logic
- Adding hardcoded values for branding, URLs, or settings (these must always come from env vars)
- Recommending general-purpose authentication libraries (this system uses external identity providers only)
- Treating this like a typical web app—it's not. Agreements are temporary, immutable, and auto-purged
- Adding features without checking if they conflict with zero-retention or session-based architecture

**When working here, prioritize:**

1. Session security and token validation (not user account management)
2. Environment variable integration (not config files)
3. Immediate PDF delivery and cleanup (not archival)
4. Compliance with the transport flow spec in `docs/INTEGRATION.md`

---

*Last updated: 2026-09-10*
