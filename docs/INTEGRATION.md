# Transport flow integration (`/app`)

`release` holds no accounts, no profiles, and no documents. It receives a
verified identity and an already-filled profile from an external **identity
provider**, moves an agreement between the parties, generates the final PDF
for each of them, then deletes everything.

Everything below is driven by environment variables. No value is written in
code.

## 1. A visitor enters

The provider sends the visitor to `/app/enter`, preferably by **POST** (an
auto-submitted form or JSON) so the token stays out of URLs, browser history
and request logs:

```
POST {SITE_URL}/app/enter
Content-Type: application/x-www-form-urlencoded

token=<JWT>&return_to=/app
```

`GET …/app/enter?token=<JWT>&return_to=/app` is accepted for a provider that
can only redirect. In both cases, give the token a very short lifetime (one
or two minutes): it is replayable until it expires.

- `token`: a JWT signed **HS256** with `IDENTITY_JWT_SECRET`. Expected claims:

  | claim    | required     | content                                  |
  | -------- | ------------ | ---------------------------------------- |
  | `sub`    | yes          | stable subject id (e.g. an X user id)    |
  | `handle` | yes          | public handle, with or without `@`       |
  | `name`   | no           | display name                             |
  | `avatar` | no           | avatar URL                               |
  | `exp`    | yes          | short expiry (a few minutes)             |
  | `iss`    | if configured | must equal `IDENTITY_JWT_ISSUER`        |
  | `aud`    | if configured | must equal `IDENTITY_JWT_AUDIENCE`      |

- `return_to`: a relative path on `release` to continue to (default `/app`).

`release` opens a session (a signed cookie, lifetime `SESSION_TTL_HOURS`,
24h by default) and redirects. Nothing is written to the database.

A visitor without a session sees a "Continue with {IDENTITY_PROVIDER_NAME}"
button pointing at `IDENTITY_LOGIN_URL?return_to=<absolute URL>`. The provider
authenticates, then returns to `/app/enter` as above.

## 2. A subject's profile

When a subject creates or accepts an agreement, `release` calls:

```
GET {IDENTITY_PROFILE_URL}        with {id} and {handle} substituted
Authorization: Bearer {IDENTITY_SHARED_SECRET}
Accept: application/json
```

Expected response (`200`):

```json
{
  "subject": { "id": "123", "handle": "jane", "name": "Jane", "avatar": "https://…" },
  "sections": [
    {
      "title": "Identity",
      "fields": [
        { "label": "Legal name", "value": "Jane Doe" },
        { "label": "Date of birth", "value": "1990-01-01" }
      ]
    },
    {
      "title": "ID document",
      "images": [
        { "label": "Front",  "src": "https://…/front.jpg" },
        { "label": "Back",   "src": "https://…/back.jpg" },
        { "label": "Selfie", "src": "data:image/jpeg;base64,…" }
      ]
    }
  ],
  "signature": { "src": "data:image/png;base64,…" }
}
```

- `release` shows and prints **exactly** these sections, in this order. It
  knows no field name. Adding, removing or renaming a field on the provider
  side needs no change here.
- `src`: a `data:` URI or an absolute URL. Only URLs on the origin of
  `IDENTITY_PROFILE_URL` (fetched with the same bearer) or on an origin listed
  in `IDENTITY_IMAGE_ORIGINS` are fetched; any other URL is ignored and the
  document shows "Image unavailable". Maximum size per image:
  `PROFILE_IMAGE_MAX_BYTES` (5 MB by default). `data:` URIs are the safest
  choice: nothing expires, nothing is refused.
- `404` means "no profile". A profile is **mandatory** to use `/app`: every
  page then redirects immediately to
  `IDENTITY_PROFILE_SETUP_URL?return_to=<absolute URL>`. Once the profile is
  filled in, the provider returns the person to `return_to` (the `release`
  session is still valid, no need to go back through `/app/enter`). Without
  `IDENTITY_PROFILE_SETUP_URL`, the person sees a blocking screen.

## 2b. Handle resolution (recommended)

If `IDENTITY_RESOLVE_URL` is configured, `release` calls it at request time
for each invited handle:

```
GET {IDENTITY_RESOLVE_URL}        with {handle} substituted
Authorization: Bearer {IDENTITY_SHARED_SECRET}
```

`200`: `{ "id": "456", "handle": "bob", "name": "…", "avatar": "…" }`.
`404`: no account, the request is refused.

The invitation is then bound to the account **id**: the person can change
their handle and still join, and whoever later picks up the old handle cannot.
Without this URL, the invitation is bound to the handle alone.

## 3. Contract

The contract text comes from `CONTRACT_URL` (JSON) or `CONTRACT_JSON`
(inline). See `config/contract.example.json`. It is **frozen into the
agreement at request time**: what the parties accept is what the PDF shows.

The checkboxes are generated from `consents`; `required` defaults to `true`.

## 4. Agreement lifecycle

Each seat either **signs** or **only receives**. The requester chooses at
request time ("I sign" / "They sign", both on by default). Turning one off
makes a one-sided agreement, for someone who already holds their own consent
letter or is being granted one. At least one seat must sign.

1. The requester, signed in, enters the other party's handle (or several). If
   the requester signs, their profile is fetched and frozen. The agreement is
   `pending`, or `sealed` at once if nobody else signs.
2. The other party opens `/app/a/{id}` (or sees it under "In transit" on
   sign-in). If they sign: they tick the consents and accept; their profile is
   fetched and frozen. Once every signing seat has accepted: `sealed`. If they
   only receive, they have nothing to do but download.
3. Each party downloads `/api/app/agreements/{id}/pdf`.
4. Once every party has downloaded, the agreement is **deleted**, immediately
   or at the end of the `AGREEMENT_DELIVERY_GRACE_MINUTES` window if one is
   configured (to allow retrying a broken download). Otherwise any agreement
   past `expires_at` (`AGREEMENT_TTL_DAYS`, 7 by default) is deleted on first
   access, and at the latest by the daily cron `/api/cron/purge`
   (`vercel.json`).

One account may hold at most `AGREEMENT_MAX_IN_TRANSIT` in-transit requests at
a time (10 by default).

`release` sends no notification of its own.

## 4b. Reminders

Reminders to a seat that has not signed are **optional** and exist only if
`REMINDER_URL` or `REMINDER_JSON` is configured (shape in
`config/reminders.example.json`). The n-th reminder uses the n-th message;
after the last one, nothing more. Placeholders: `{handle}` (the signer),
`{from}` (the requester), `{title}`, `{link}` (the agreement page).

Two channels, both outside `release`:

- **Manual.** On the agreement page, the requester clicks "Remind @b".
  `release` counts the reminder and opens `IDENTITY_COMPOSE_URL` with the
  pre-filled text (e.g. X's DM composer, with `{id}` = the recipient's id).
  Without `IDENTITY_COMPOSE_URL`, the text is copied to the clipboard.
- **Automatic.** If `IDENTITY_NOTIFY_URL` is configured, the request offers
  "Send them reminders automatically". The daily cron `/api/cron/remind` then
  sends each due reminder (`intervalDays` since the request or the previous
  reminder) by calling:

  ```
  POST {IDENTITY_NOTIFY_URL}
  Authorization: Bearer {IDENTITY_SHARED_SECRET}
  Content-Type: application/json

  { "to": { "id": "456", "handle": "bob" }, "text": "…", "agreementId": "…" }
  ```

  Any non-2xx response counts as a failure; the reminder is retried on the
  next run.

## 5. Language

The `/app` pages render in the visitor's browser language (Accept-Language, or
an explicit `?lang=` override), among the locales in `lib/locale.ts`. The
downloaded PDF's own labels follow the same rule, using the downloader's
browser language. Operator content — the contract text and the reminder
messages — stays in whatever language the operator wrote it in.

## 6. Environment variables

See `.env.example`, the "Transport flow" section.
