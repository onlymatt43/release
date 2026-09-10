<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# This is NOT a typical web application

This is a **zero-retention, session-based consent and document transport system**, not a user-facing platform. Every suggestion must respect:

- **No persistent user data**: Sessions expire, agreements auto-purge, nothing is archived
- **All config is external**: Branding, URLs, providers come from environment variables, never hardcoded
- **Immutable agreements**: Once created, frozen forever; no edits, rollbacks, or recovery
- **Session identity only**: No accounts, profiles, or user management—authentication is delegated to external providers via short-lived JWT tokens
- **Immediate delivery**: PDFs are generated on-demand and deleted after download (with optional grace window)

Before suggesting any feature, change, or refactor, verify it aligns with these constraints. Read `docs/INTEGRATION.md` and `.env.example` first.

Do NOT suggest:
- User registration, account management, or persistent profiles
- Hardcoded settings, branding, or locale defaults
- "Soft deletes" or archival logic (agreements are hard-deleted when expired or fully downloaded)
- Multi-role access control or permission systems (this is not multi-tenant)
- Undo, recovery, or audit-log features that would violate zero-retention

<!-- END:nextjs-agent-rules -->
