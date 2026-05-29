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
handlers Netlify runs after deploy. Local-only service settings belong in
`.env.local`; keep real service values out of public docs and committed files.

Header and footer social links currently show TikTok only. Override the TikTok
destination with `VITE_ANEWLUV_TIKTOK_URL` if the handle changes.

Then open:

- `http://127.0.0.1:8082/`
- `http://127.0.0.1:8082/pricing`
- `http://127.0.0.1:8082/contact-us`

## Public Copy Rule

Public copy must present Anewluv as a dating and social networking app with subscriptions, premium memberships, optional in-app features, privacy information, support paths, and clear billing policies.
