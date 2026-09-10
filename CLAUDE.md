# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Core Invariant

**Rule from the author:** `release` stores absolutely no user data.

What the code does to respect this rule:
1. Identity and profiles come from an external provider via `lib/identity/`. Release displays and prints what it receives without defining what a profile contains.
2. The contract is configuration (`CONTRACT_URL` / `CONTRACT_JSON`), frozen in each agreement at creation time.
3. An agreement exists only in transit with an expiration date (`expires_at`). The only database tables are `agreements` and `agreement_parties`.

**Before any code modification:** `npm run check:invariants` must pass. If it fails, making it pass is the first task. Do not modify the script to bypass failures.

See `AGENTS.md` for the complete invariants section and enforcement script.

## Quick Reference: Commands

```bash
npm ci                    # Install dependencies
npm run dev              # Start development server (localhost:3000)
npm run build            # Production build
npm run lint             # Lint + invariants check + type check (all must pass before commit)
npm run check:invariants # Verify project invariants
npx tsc --noEmit         # Type checking only
```

## Architecture Overview

### Identity & Sessions

- **Entry point:** `/app/enter` (GET with `?token=` or POST with form/JSON body)
- Identity comes as a signed JWT from an external provider via `IDENTITY_JWT_SECRET` (HS256)
- Session stored in signed HTTP-only cookie (`SESSION_COOKIE`, TTL via `SESSION_TTL_HOURS`, default 24h)
- Session contains only `sub` (subject id) and `handle`; no PII stored beyond sign-in

### Agreement Lifecycle

1. **Creation:** Requester creates agreement with invited handles
   - Requester's profile fetched from provider and frozen
   - Agreement status: `pending`
   - Both inserts (`agreements` + `agreement_parties`) batched atomically via `db.batch(..., "write")`

2. **Acceptance:** Each invited party accepts and downloads PDF
   - Party's profile fetched and frozen at acceptance time
   - Acceptance recorded with timestamp, IP, user agent
   - When all invitees accept: status → `sealed`

3. **Delivery:** Each party downloads `/api/app/agreements/{id}/pdf`
   - PDF generated on-demand from frozen contract + profiles, never stored
   - Download timestamp recorded (`downloaded_at`)

4. **Deletion:** Once all parties download or grace period expires
   - **Grace period:** `AGREEMENT_DELIVERY_GRACE_MINUTES` (default 15 min) after all download for retry tolerance
   - **Hard deadline:** `AGREEMENT_TTL_DAYS` (default 7 days) from creation
   - Hourly cron job (`/api/cron/purge`, schedule `0 * * * *` in `vercel.json`) deletes expired agreements

### Database

- Only 2 tables: `agreements`, `agreement_parties`
- No user data stored permanently; all rows deleted on expiration
- Atomic operations via `db.batch(..., "write")` to prevent race conditions during concurrent acceptance
- Unique index on `(agreement_id, handle)` prevents duplicate seats bound to same handle

### PDF Generation

- Generated on-demand in `/api/app/agreements/{id]/pdf/route.ts`
- Profiles and images frozen at acceptance time
- Images resolved from provider URLs or data: URIs (via `lib/pdf/images.ts`)
- Image size capped at `PROFILE_IMAGE_MAX_BYTES` (default 5 MB)
- Fetch requests include `AbortSignal.timeout(10_000)` to bound execution time

### Security & Validation

- **CSRF protection:** POST to `/app/enter` validates `Origin` header against `resolveBaseUrl()`
- **Safe return paths:** `/app/enter` validates `return_to` parameter to prevent open redirect
- **Agreement expiry checks:** `getAgreement()` deletes expired agreements on access (fail-fast)
- **Seat binding:** Handles can resolve to stable identifiers via `IDENTITY_RESOLVE_URL` (optional)

## Key Files & Their Responsibilities

| File | Purpose |
|------|---------|
| `lib/agreements.ts` | Core agreement logic: create, accept, seal, download marking, deletion |
| `lib/identity/` | Identity provider integration: JWT verification, profile fetching, handle resolution |
| `lib/session.ts` | Session token creation & validation (HS256 with `SESSION_SECRET`) |
| `lib/pdf/images.ts` | Image fetching & format detection; bounds memory via chunked reads |
| `app/app/page.tsx` | Home view; lists in-transit agreements for logged-in user |
| `app/app/a/[id]/` | Agreement detail & acceptance flow |
| `app/api/app/agreements/[id]/pdf/route.ts` | PDF download endpoint; marks download, triggers purge if done |
| `app/api/cron/purge/route.ts` | Hourly purge of expired agreements |
| `app/admin/` | Admin shell (infrastructure kept; functionality defined by author) |
| `docs/INTEGRATION.md` | Complete identity provider integration guide |
| `docs/HANDOFF.md` | Full refactoring plan with phases and end criteria (reference only) |
| `db/schema.sql` | Two-table schema with indexes; apply to Turso database |
| `scripts/check-invariants.mjs` | Enforces invariants (deleted files, forbidden dependencies, removed env vars, schema tables) |

## Environment Variables (Required & Optional)

**Required:**
- `TURSO_DATABASE_URL` — Turso database connection
- `SESSION_SECRET` — HS256 key for session tokens (≥32 bytes)
- `IDENTITY_JWT_SECRET` — HS256 key for entry JWT verification
- `IDENTITY_PROVIDER_NAME` — Display name for sign-in button
- `IDENTITY_LOGIN_URL` — URL to redirect unsigned-in users to provider
- `IDENTITY_PROFILE_URL` — Endpoint to fetch subject profiles (see `docs/INTEGRATION.md`)
- `IDENTITY_SHARED_SECRET` — Bearer token for profile & resolve requests

**Frequently configured:**
- `SITE_URL` — Base URL for redirects (default inferred from request headers)
- `CONTRACT_URL` or `CONTRACT_JSON` — Release agreement template (frozen per agreement)
- `SESSION_TTL_HOURS` — Session lifetime (default 24)
- `AGREEMENT_TTL_DAYS` — Agreement expiration (default 7)
- `AGREEMENT_DELIVERY_GRACE_MINUTES` — Grace period after full download (default 15)
- `PROFILE_IMAGE_MAX_BYTES` — Max image size (default 5 MB)

See `.env.example` for full list.

## Development Notes

- **TypeScript strict mode:** All code must pass `npx tsc --noEmit`
- **Invariant validation:** Runs on `npm run lint` before ESLint; blocks commit if failed
- **Database migrations:** None needed; schema applied once via `db/schema.sql` → Turso
- **Cron job:** Vercel calls `/api/cron/purge` hourly via `vercel.json`; protected by `CRON_SECRET`
- **Admin:** Currently a shell (`app/admin/page.tsx` with login/logout); feature TBD by author

## Common Tasks

**Add a new profile field to the PDF:**
- Update provider to include field in `Profile` JSON (no code change needed in Release)
- Fields render in order from provider via `lib/pdf/index.ts`

**Adjust TTL or grace period:**
- Modify env var; no code change needed (functions read from `process.env`)

**Fetch a new image type (e.g., WebP):**
- Extend `formatFromBytes()` and `formatFromMimeType()` in `lib/pdf/images.ts`

**Change session cookie name:**
- Update `SESSION_COOKIE` in `lib/session.ts` and middleware

## References

- `AGENTS.md` — NextJS agent rules and full invariants section
- `docs/INTEGRATION.md` — Identity provider API contract
- `docs/HANDOFF.md` — Complete refactoring plan (reference)
- `.env.example` — All configurable variables with descriptions
