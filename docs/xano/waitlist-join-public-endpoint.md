# Xano contract: `POST /waitlist/join_public`

Backend contract for olalawal/AnewluvExpo#520. The site gateway
(`netlify/functions/waitlist.js`, also served by `worker/index.js` at
`/api/waitlist`) calls this endpoint in the **same Xano API group the contact
form uses** (`ANEWLUV_XANO_CONTACT_API_BASE_URL`). This project uses live v1
only, with no Xano branches. Back up what changes, apply with a dry run first,
and keep a repair script. The gateway fails closed (503) until live v1 and its
secrets exist.

## Inputs

| Field | Type | Rule |
| --- | --- | --- |
| `gateway_timestamp` | int | Required Unix seconds; reject when more than five minutes old or in the future |
| `gateway_signature` | text | Required 64-character lowercase hex HMAC-SHA256 |
| `correlation_id` | text | Required uuid or request id, max 100 |
| `client_key` | text | Required 64 lowercase hex HMAC; never a raw IP |
| `submission_key` | text | Required 64 lowercase hex HMAC |
| `email` | text | Required; lowercase, trimmed, max 254 |
| `city_slug` | text | Required; one of the slugs in `src/data/waitlist-cities.json` |
| `age_band` | text | `18-20`, `21-29`, `30-44` or `45+` |
| `gender` | text | `woman`, `man` or `nonbinary` |
| `seeking` | text | `women`, `men` or `everyone` |
| `source_tag` | text | May be `""`; `[a-z0-9-]` only, max 40 |
| `adult_confirmed` | bool | Required and must be true |
| `consent` | bool | Required and must be true |

Reject every other input. The browser's Turnstile token never reaches Xano:
the site gateway has already redeemed it (action `waitlist_form`) and the
gateway key authenticates that decision.

## Formulas (UTF-8, HMAC-SHA256, lowercase hex, key = `WAITLIST_GATEWAY_KEY`)

- `submission_key` over `waitlist-submission:v1:` + `JSON.stringify([email,
  city_slug, age_band, gender, seeking, source_tag])` (JavaScript
  `JSON.stringify` of that exact array order; `source_tag` is `""` when empty).
- `gateway_signature` over
  `waitlist-gateway:v1:<gateway_timestamp>:<correlation_id>:<submission_key>:<client_key>`.
- `client_key` is the gateway's `HMAC(key, "waitlist-client:v1:" + client IP)`.
  Xano stores and rate-limits on it, never on an IP.

Compare signatures in constant time. Recompute `submission_key` from the
inputs and reject a mismatch.

## Gateway environment variable names (values never in the repo)

`ANEWLUV_XANO_CONTACT_API_BASE_URL` (shared with contact),
`TURNSTILE_SECRET_KEY` (shared), `TURNSTILE_ALLOWED_HOSTNAMES` (shared),
`WAITLIST_GATEWAY_KEY` (new; also keys the hashed client identity, as
`CONTACT_GATEWAY_KEY` does for contact). Optional Worker binding:
`WAITLIST_RATE_LIMITER`. Build-time: `VITE_TURNSTILE_SITE_KEY` (shared).

## Required behavior

- Reject a bad or expired signature before any database work.
- Re-check email, slug, age band, gender, seeking, tag, and both booleans here.
- One row per distinct `(email, city_slug)`; a repeat sign-up returns 200
  `{status:"received"}` and changes nothing (no enumeration of the list).
- Rate limit anonymous callers on `client_key` (suggested 3 per hour).
- Store `consent_at`, `adult_confirmed`, the tag, and a `is_test` flag for rows
  from non-production runs. Do not store the gateway signature or raw client
  key beyond the rate-limit window.
- Send no email on sign-up. The one "your city is open" email is a later job.
- Return `{status:"received"}` with 200; otherwise 400, 401, 409 or 429.
- Counts (city x gender x age band x source tag) are read from stored rows;
  never expose emails in any counts view.

The gateway returns the browser only `{ok:true}` or `{code:"..."}`. A 409 is
shown as success; 429 as `rate_limited`; 400 as `invalid_request`; 401 and
other statuses as `submit_failed`.

## Verification matrix

| Case | Expected result |
| --- | --- |
| Missing, wrong or expired gateway assertion | 401; no row |
| Malformed email, unknown slug/band/gender/seeking, bad tag | 400; no row |
| `adult_confirmed` or `consent` not true | 400; no row |
| Extra or forged field | 400; no row |
| `submission_key` that does not match the inputs | 401 or 400; no row |
| Same email and city again | 200 `received`; still one row |
| Fourth request from one `client_key` inside the window | 429 |
| Valid first request | 200 `received`; one row; no email sent |

Local tooling: `scripts/mock-xano-waitlist.mjs` implements this contract with a
local test key, keeps rows in memory marked `is_test`, and serves counts only.
