# Ticket: Migrate Anewluv.com From GoDaddy to Netlify

## Priority

High / monthly cost reduction / easier site updates

## Background

The current `anewluv.com` marketing site is hosted in a GoDaddy site-builder environment that costs about $40/month and is difficult to update through normal code review.

The replacement should be a GitHub-backed React/Vite site hosted on Netlify. The site should be easy to update through pull requests, work well on mobile and desktop, and stay aligned with the app experience on `app.anewluv.com`.

## Stack Decision

Use React + Vite.

Vue is viable for a static marketing site, but React is the recommended migration path because:

- Anewluv app engineers and existing UI code are already React/Expo oriented.
- Legal, pricing, and product copy can be mirrored from the app repo with less translation.
- Netlify supports Vite React with a minimal build.
- Future Codex changes can use the same React review and testing habits used in AnewluvExpo.

## Scope

Build and deploy a replacement for:

- `/`
- `/pricing`
- `/privacy-policy`
- `/terms-of-service`
- `/terms-of-service-1` redirect
- `/refunds`
- `/community-guidelines`
- `/contact-us`
- `/unsubscribe`

## Site Goals

- Use the real Anewluv logo and app-forward visual direction.
- Make the homepage feel modern, colorful, and mobile-friendly.
- Show app previews for discovery, matching, profile detail, profile editing, rewards, billing, and safety flows.
- Preserve contact, unsubscribe, privacy, terms, refunds, pricing, and community guideline pages.
- Keep public pages easy to crawl, maintain, and deploy from GitHub.
- Support Netlify preview deploys for owner review before DNS cutover.

## Implementation Plan

1. Create GitHub repository `olalawal/Anewluv.com`.
2. Scaffold React + Vite app.
3. Build page data for home, pricing, terms, privacy, refunds, community guidelines, contact, and unsubscribe.
4. Add SEO metadata:
   - Title: `Anewluv - Dating and Social Networking App`
   - Description: `Anewluv is a dating and social networking app that helps people connect through profiles, discovery, media, and premium in-app features.`
5. Add Netlify config.
6. Deploy to a Netlify preview site.
7. Add custom domains `anewluv.com` and `www.anewluv.com` in Netlify.
8. Lower DNS TTL at the current DNS host.
9. Transfer DNS records after preview approval:
   - Preserve app subdomain `app.anewluv.com`.
   - Preserve email/MX/TXT/SPF/DKIM/DMARC records.
   - Point apex and `www` to Netlify.
10. Verify HTTPS, redirects, sitemap, robots, forms, and all core pages after cutover.
11. Cancel the old GoDaddy site-builder plan only after the new site is live and verified.

## Acceptance Criteria

- New site is deployed on a Netlify preview.
- Home page presents Anewluv clearly as a dating and social networking app.
- Pricing, Privacy, Terms, Refunds, Guidelines, Contact, and Unsubscribe pages are present.
- Contact and unsubscribe forms submit through the app backend or an approved support path.
- Mobile and desktop layouts are reviewed before DNS cutover.
- DNS cutover plan preserves `app.anewluv.com` and email records.
- Old GoDaddy site-builder plan can be retired after verification.

## Out of Scope

- Moving `app.anewluv.com`.
- Changing checkout backend behavior.
- Changing Xano APIs.
- DNS cutover before owner approval.
