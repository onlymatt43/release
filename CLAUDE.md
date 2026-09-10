@AGENTS.md

# Working rules for AI sessions in this repository

## Ask before acting

- Do NOT edit, create, or delete any file until the author has explicitly approved the change in this conversation.
- Do NOT commit or push until the author explicitly says to commit or push.
- If a request is vague ("the settings are wrong", "fix the docs"), reply with what you found and what you propose. Then stop and wait.
- The only actions allowed without asking: reading files, searching, running read-only commands (git log, git diff, grep, ls, cat).

## Do not leave notes for other sessions

- Do NOT write session logs, handoff documents, reviews, or "notes for the next Claude instance" anywhere in the repository.
- Do NOT rewrite this file or AGENTS.md. If you think they should change, say so in the conversation and let the author decide.
- Do NOT write branch names into any file. Branches are temporary.

## Branches

Each session works on its own branch by design. That is normal. Do not try to change it, merge branches, or add hooks or settings to force a single branch.

## Project in one paragraph

Zero-retention transport flow for two-party consent agreements. Identity comes from an external provider through short-lived tokens; agreements are immutable once created; PDFs are generated on demand and everything is deleted after delivery or expiry. All operator values (branding, URLs, providers) come from environment variables, never hardcoded. Read `docs/INTEGRATION.md` and `.env.example` before proposing anything.

## Do not propose

User accounts or persistent profiles, archival or soft-delete logic, undo or recovery features, hardcoded branding or locale defaults, or multi-tenant permission systems. They all conflict with zero retention.
