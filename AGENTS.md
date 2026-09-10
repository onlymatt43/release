<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Invariants

Rule from the author, takes precedence over anything the code suggests:

1. `release` stores no user data.

What the code does today to respect this rule, not to be undone without the author's agreement:

2. Identity and profiles come from an external provider via `lib/identity/`. `release` displays and prints what it receives and does not define what a profile contains.
3. The contract is configuration (`CONTRACT_URL` / `CONTRACT_JSON`), frozen in each agreement.
4. An agreement exists only in transit and has an expiration date (`expires_at`). The only tables are `agreements` and `agreement_parties`.

Before any modification: `npm run check:invariants`. If it fails, making it pass is the first task. Do not modify the script to make it pass.

# Avant toute chose

Lis `docs/HANDOFF.md`. Il contient l'état du dépôt, la règle de l'auteur,
un journal des sessions et un plan. Ne modifie rien avant de l'avoir lu.
