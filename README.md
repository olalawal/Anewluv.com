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
- `/terms-of-service-1`
- `/refunds`
- `/community-guidelines`
- `/contact-us`
- `/unsubscribe`
- `/mockups`

`/terms-of-service` should redirect to `/terms-of-service-1` or both should be served.

## Review Mockups

Run locally:

```bash
npm install
npm run dev -- --host 127.0.0.1 --port 5178
```

Then open:

- `http://127.0.0.1:5178/`
- `http://127.0.0.1:5178/mockups`
- `http://127.0.0.1:5178/pricing`
- `http://127.0.0.1:5178/contact-us`

## Public Copy Rule

Public copy must present Anewluv as a dating and social networking app with subscriptions, premium memberships, optional in-app features, privacy information, support paths, and clear billing policies.

See [docs/migration-ticket.md](docs/migration-ticket.md).
