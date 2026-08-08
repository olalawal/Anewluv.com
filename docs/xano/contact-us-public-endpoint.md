# Xano contract: `POST /feedback/contact_us_public`

This is the backend deployment artifact for Anewluv.com issue #7. This project
uses the live v1 API rather than Xano branches. Build and test the complete
XanoScript artifact locally, back up and compare the current live endpoint,
then apply it to live v1 only after owner approval. The Netlify gateway remains
fail closed until live v1 and its secrets are ready.

## Inputs

| Field | Type | Rule |
| --- | --- | --- |
| `gateway_timestamp` | int | Required Unix seconds; reject when more than five minutes old or in the future |
| `gateway_signature` | text | Required 64-character lowercase hex HMAC-SHA256 |
| `email` | text | Required; normalized lowercase email, max 254 |
| `name` | text | Optional, max 100, single line |
| `description` | text | Required, 10-2000 |
| `subject` | text | `Website contact request` or `Unsubscribe request` only |
| `category` | text | `general` or `account_help` only |
| `source` | text | Must equal `anewluv_marketing_site_netlify` |
| `route` | text | `/contact-us` or `/unsubscribe`, matched to category |
| `platform` | text | Must equal `web` |
| `app_version` | text | Must equal `marketing-site` |
| `correlation_id` | text | Required, max 100, unique |
| `client_key` | text | Required 64-character lowercase hex HMAC; never a raw IP |
| `submission_key` | text | Required 64-character lowercase hex HMAC |
| `network_country` | text | Optional two-letter country code |
| `recipient_confirmation_allowed` | bool | Required and must be false |

Recompute `gateway_signature` with the live v1 `CONTACT_GATEWAY_KEY` over the
UTF-8 string `contact-gateway:v1:<timestamp>:<correlation_id>:<submission_key>`
and compare it in constant time. The shared secret is never an API input.

Reject every other input. Do not accept `user_id`, `email_verified`,
`moderation_state`, `user_agent`, `viewport`, or an anti-bot token from the
browser. Netlify has already redeemed the single-use token and the gateway key
authenticates that server-side decision.

## Required behavior

- Reject an expired timestamp or missing/wrong gateway signature before any
  database or email work.
- Re-run the email, length, subject/category/route, fixed-source, and fixed-
  platform checks at this boundary.
- Reject an existing `correlation_id`.
- Reject an existing `submission_key` created in the previous ten minutes.
- Limit each `client_key` to three accepted attempts per 180 seconds.
- Store one `contact_messages` row with `user_id=0`, `email_verified=false`,
  `status=new`, and server-owned moderation state.
- Store `correlation_id`, `client_key`, and `submission_key` in indexed columns.
  Back up the live schema, then add those columns additively before publishing
  the endpoint.
- Send exactly one `admin-contact-us` notification after the row is created.
- Never run `contact-us-confirm` or any other recipient email for this route.
- Return `{ ok: true, ticket_id, correlation_id, status: "new" }`.

## Live v1 verification matrix

| Case | Expected result |
| --- | --- |
| Missing/wrong/expired gateway assertion | 401; no row; no email |
| Malformed or oversized email/message | 400; no row; no email |
| Forged identity/moderation field | 400; no row; no email |
| Reused correlation ID | 409; one original row only |
| Reused submission key inside ten minutes | 409; one original row only |
| Fourth client-key request inside 180 seconds | 429; three rows maximum |
| Valid request | 200; one row; one admin email; zero recipient emails |

Capture the live v1 endpoint ID, pre-change backup, request-history IDs, created
ticket ID, admin email-log ID, and proof that no recipient email-log row
exists. Add that evidence to PR #7 before owner QA.
