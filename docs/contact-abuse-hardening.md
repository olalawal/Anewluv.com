# Contact form abuse hardening

Issue #7 moves the anonymous marketing forms behind a fail-closed Netlify and
Xano contract. The existing `/feedback/contact_us` endpoint is intentionally
not used because it sends a confirmation email to any supplied address.

## Request path

1. The browser sends only `kind`, `name`, `email`, `message`, optional
   `username`, the honeypot, and a Cloudflare Turnstile token.
2. Netlify applies a native three-requests-per-IP/180-second limit before the
   function runs. The function also applies a warm-instance limit and a
   ten-minute normalized duplicate check.
3. The function rejects oversized or unknown fields, validates every length
   and category, and verifies the single-use Turnstile token with Siteverify.
4. Netlify derives subject, category, route, source, platform, correlation ID,
   and an HMAC client key. Raw client IP and browser-provided identity or
   moderation fields are never sent to Xano.
5. The function calls only `/feedback/contact_us_public` with a short-lived
   HMAC assertion derived from `CONTACT_GATEWAY_KEY`; the secret itself is
   never sent or logged. That endpoint creates one admin-visible ticket and
   must not call `contact-us-confirm`.

## Required configuration

Create separate Turnstile widgets for deploy previews and production. Do not
reuse production secrets in local files or commit them.

Netlify variables with Functions scope:

- `ANEWLUV_XANO_CONTACT_API_BASE_URL`
- `CONTACT_GATEWAY_KEY`
- `TURNSTILE_SECRET_KEY`
- `TURNSTILE_ALLOWED_HOSTNAMES`, comma-separated

Netlify build variable:

- `VITE_TURNSTILE_SITE_KEY`, the public widget key

The preview hostname must be allowed by both the preview Turnstile widget and
`TURNSTILE_ALLOWED_HOSTNAMES`. A missing secret produces `503` and no Xano
request. An invalid or missing token produces `403` and no Xano request.

## Live v1 backend deployment

This project does not use Xano branches. Implement the contract in
[`docs/xano/contact-us-public-endpoint.md`](xano/contact-us-public-endpoint.md)
as a complete local XanoScript artifact first. Back up and compare the current
live v1 endpoint, apply the reviewed artifact to live v1 only after owner
approval, and immediately run the rejection and accepted-request matrix. Keep
the Netlify function fail closed until that endpoint and its secrets are ready.

## Verification

Run:

```bash
npm test
npm run build
```

On the Netlify deploy preview, replay the observed mixed-case filler payloads,
URL and markup injection, duplicate submissions, and a four-request burst.
Every rejected case must create zero `contact_messages` rows and zero emails.
Then verify one successful anonymous Contact submission and one Unsubscribe
submission. Confirm each creates one Admin Console row and one admin
notification, while `email_send_log` contains no `contact-us-confirm` row for
the submitted address.

Use the preview's function logs to search the returned `X-Correlation-Id`.
Logs contain the correlation ID and HMAC client key, never the raw email,
message, Turnstile token, gateway key, or client IP.
