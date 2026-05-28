# Ticket: Migrate Anewluv.com to Netlify and Retire Current Site Builder

## Priority

High / Stripe compliance blocker / monthly cost reduction

## Background

The current `anewluv.com` marketing site is hosted in a site-builder environment that costs about $40/month and is difficult for Codex to update through normal code review. It currently contains Stripe-risk public copy and pasted editor artifacts.

The replacement should be a GitHub-backed static site hosted on Netlify. The site should be easy to update via PR, crawlable by Stripe, and aligned with the app copy used on `app.anewluv.com`.

## Stack Decision

Use React + Vite.

Vue is viable for a static marketing site, but React is the recommended migration path because:

- Anewluv app engineers and existing UI code are already React/Expo oriented.
- Legal/pricing copy can be mirrored from the app repo with less translation.
- Netlify supports Vite React with a minimal build.
- Future Codex changes can use the same React review/testing habits used in AnewluvExpo.

## Scope

Build and deploy a replacement for:

- `/`
- `/pricing`
- `/privacy-policy`
- `/terms-of-service-1`
- `/terms-of-service` redirect
- `/refunds`
- `/community-guidelines`
- `/unsubscribe`

## Must Fix Existing Live Issues

- Homepage must remove `Earn Tokens`, `Luv tokens`, `profitable`, and beta points language.
- Privacy page must remove token, wallet identifier, revenue-sharing, and token-based experience language.
- Terms page must remove residual token wording in termination and liability sections.
- Pricing page must replace Paddle references with Stripe-safe digital app access wording and describe Hearts as in-app credit, not digital currency.
- Refunds page must replace Paddle copy and remove pasted editor/chat artifacts.

## Stripe-Safe Positioning

Use this business framing:

> Anewluv is a dating and social networking app that sells software subscriptions, premium memberships, and optional digital in-app features. Stripe is only used for digital app features and subscriptions. Stripe is not used for token sales, crypto transactions, revenue-sharing products, securities, investment products, stored value, gambling, adult content, money transmission, or financial services.

## Implementation Plan

1. Create GitHub repository `olalawal/Anewluv.com`.
2. Scaffold React + Vite app.
3. Build static page data for home, pricing, terms, privacy, refunds, community guidelines, and unsubscribe.
4. Add SEO metadata:
   - Title: `Anewluv - Dating and Social Networking App`
   - Description: `Anewluv is a dating and social networking app that helps people connect through profiles, discovery, media, and premium in-app features.`
   - OpenGraph/Twitter metadata using the same safe language.
5. Add `npm run audit:copy` to fail on risky public copy.
6. Add Netlify config.
7. Deploy to a Netlify preview site.
8. Crawl preview and compare against live-site audit.
9. Add custom domains `anewluv.com` and `www.anewluv.com` in Netlify.
10. Lower DNS TTL at the current DNS host.
11. Transfer DNS records after preview passes:
    - Preserve app subdomain `app.anewluv.com`.
    - Preserve email/MX/TXT/SPF/DKIM/DMARC records.
    - Point apex and `www` to Netlify.
12. Verify HTTPS, redirects, sitemap, robots, and Stripe-facing pages after cutover.
13. Cancel the old site-builder plan only after the new site is live and verified.

## Acceptance Criteria

- New site is deployed on Netlify preview.
- `npm run audit:copy` passes.
- Public preview has no token, ICO, crypto, holder, revenue sharing, profit, investment, payout, staking, yield, or Paddle language except in explicit Stripe exclusion disclaimers.
- Home page positions Anewluv as dating/social networking, not financial/reward upside.
- Terms, Privacy, Pricing, and Refunds use Stripe-safe copy.
- No editor notes, pasted chat transcripts, or site-builder artifacts are visible.
- DNS cutover plan preserves `app.anewluv.com` and email records.
- Old paid site-builder can be retired after verification.

## Out of Scope

- Moving `app.anewluv.com`.
- Changing Stripe products or checkout backend.
- Changing Xano APIs.
- DNS cutover before owner approval.
