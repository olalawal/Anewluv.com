# Anewluv.com Marketing Site

Replacement for the current hosted `anewluv.com` marketing/legal site.

## Goal

Retire the paid site-builder version and move `anewluv.com` to a GitHub-backed Netlify site so copy, legal pages, SEO metadata, and product updates can be reviewed and changed through normal pull requests.

## Recommended Stack

Use React + Vite for the first migration.

Why React over Vue here:

- The main Anewluv app is already React/Expo, so components, copy patterns, and future shared constants are easier to reuse.
- Netlify supports Vite React directly with a simple static build.
- The site is mostly static marketing/legal content, so Vue does not add meaningful value for this migration.
- Codex and the current repo workflow already have stronger React coverage in the Anewluv codebase.

Vue would also work technically, but React keeps the operating surface smaller.

## Netlify Shape

- Build command: `npm run build`
- Publish directory: `dist`
- SPA fallback: not needed for static page routes if generated as files, but Netlify redirect fallback can be enabled if a router is used.
- Domain target: `anewluv.com` and `www.anewluv.com`

Do not transfer DNS until a Netlify preview is crawled and approved.

## Core Pages

- `/`
- `/pricing`
- `/privacy-policy`
- `/terms-of-service`
- `/refunds`
- `/community-guidelines`
- `/contact-us`
- `/unsubscribe`

`/terms-of-service` is the canonical Terms URL. Keep `/terms-of-service-1` as a compatibility redirect to the canonical page only if old external links still exist.

## Local Review

Run locally:

```bash
npm install
npm run dev
```

The local dev command serves the built site plus the same server-side API
handlers Netlify runs after deploy.

For local embedded app review, set `ANEWLUV_APP_BASE_URL=http://127.0.0.1:8081`
in `.env.local` while the Expo web app is running on `8081`.

Server-side preview data is served from `/api/app-preview` and can use either
one generated account or a rotating pool. Use
`ANEWLUV_SITE_PREVIEW_ACCOUNT_EMAIL` plus
`ANEWLUV_SITE_PREVIEW_ACCOUNT_PASSWORD` for one account, or
`ANEWLUV_SITE_PREVIEW_ACCOUNT_EMAILS` with the shared password for a generated
account pool. For stronger location matching, `ANEWLUV_SITE_PREVIEW_ACCOUNTS_JSON`
can include generated accounts with optional `city`, `region`, `country`, and
`timezone` fields. The endpoint picks a stable account per browser session,
prefers accounts closest to request geo headers when Netlify provides them, and
uses that generated account's location for the preview search. Set
`ANEWLUV_SITE_PREVIEW_PROFILE_IDS` if the public preview must be constrained to
a known generated profile allowlist. The browser never receives the password or
Xano auth token.

The public site defaults to internal React preview iframes
(`VITE_ANEWLUV_APP_PREVIEW_MODE=internal-iframes`). Those frames render
`/preview/discover`, `/preview/edit-profile`, `/preview/rewards`, and the other
preview pages from the server-side preview payload. The center app homepage
phone uses the live `app.anewluv.com` marketing embed by default. Set
`VITE_ANEWLUV_LIVE_HOME_EMBED=false`
to force that center phone back to the internal preview. Set
`VITE_ANEWLUV_APP_PREVIEW_MODE=screenshots` if a capture worker publishes
screenshots to `ANEWLUV_SITE_APP_SCREENSHOT_BASE_URL`. Set
`VITE_ANEWLUV_LIVE_APP_EMBEDS=true` only after the app supports a readonly
marketing embed session for every preview frame.

Header and footer social links default to the public Anewluv X and TikTok pages.
Override them with `VITE_ANEWLUV_X_URL` and `VITE_ANEWLUV_TIKTOK_URL` if the
handles change.

Then open:

- `http://127.0.0.1:8082/`
- `http://127.0.0.1:8082/pricing`
- `http://127.0.0.1:8082/contact-us`

## Public Copy Rule

Public copy must present Anewluv as a dating and social networking app with subscriptions, premium memberships, optional in-app features, privacy information, support paths, and clear billing policies.
