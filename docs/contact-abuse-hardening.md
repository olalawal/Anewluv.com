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

## Backend branch dependency

Create a dedicated Xano branch for issue #7. Implement the contract in
[`docs/xano/contact-us-public-endpoint.md`](xano/contact-us-public-endpoint.md),
then verify it on that branch before changing the Netlify preview base URL to
the branch endpoint. Do not modify the existing production endpoint in place.

## Verification

Run:

```bash
npm test
npm run build
```

On the Netlify deploy preview, verify one successful Contact submission and one
Unsubscribe submission. Confirm each creates one `contact_messages` row and
one admin notification, while `email_send_log` contains no
`contact-us-confirm` row for the submitted address.

Use the preview's function logs to search the returned `X-Correlation-Id`.
Logs contain the correlation ID and HMAC client key, never the raw email,
message, Turnstile token, gateway key, or client IP.
