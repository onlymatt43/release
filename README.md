# release

`release` circulates a release agreement between multiple parties, generates a PDF for each, then deletes everything. It holds no accounts, profiles, or documents.

## Identity and Profiles

Identity and profiles come from an external provider via `lib/identity/`. The app displays and prints what it receives and does not define what a profile contains. See `docs/INTEGRATION.md`.

## Getting Started

1. `npm ci` — install dependencies
2. Copy `.env.example` to `.env.local` and fill in your configuration
3. Apply `db/schema.sql` to your Turso database
4. `npm run dev` — start the development server

## Verification

```bash
npx tsc --noEmit    # Type checking
npm run lint        # Linting
npm run build       # Production build
```

## Deployment

On Vercel, the cron job in `vercel.json` calls `/api/cron/purge` with `CRON_SECRET`. This purges agreements that have expired or been fully delivered and are past the grace period.
