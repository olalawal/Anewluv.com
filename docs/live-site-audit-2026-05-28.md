# Live Anewluv.com Audit

Checked on 2026-05-28.

## Confirmed Compliance Blockers

- `https://anewluv.com/`
  - Browser title still says `Earn Tokens with AnewLuv: Your Online Dating Platform`.
  - Home page includes beta CTA copy `Register For Beta Earn Points`.
  - Feature copy says finding love should be `profitable` and references rewards for activity.
- `https://anewluv.com/privacy-policy`
  - Privacy page has `Tokens, Rewards, Referrals, and In-App Purchases`.
  - Body mentions `tokens`, wallet-related identifiers, revenue-sharing programs, and token-based experiences.
  - Sharing section mentions support for token or reward-related features.
- `https://anewluv.com/terms-of-service-1`
  - The Stripe disclaimer has been partly added.
  - Termination and liability sections still mention token/token systems.
- `https://anewluv.com/pricing`
  - Pricing says payments are processed by Paddle.
  - Hearts are called a consumable digital currency.
  - Refund copy is pasted into the pricing page after the pricing section.
- `https://anewluv.com/refunds`
  - Refunds says payments are processed by Paddle.
  - Page includes GoDaddy formatting notes and pasted chat/editor transcript text.

## Existing Site Features To Preserve

- Header navigation with Home and App links.
- Footer links for App, Privacy Policy, Pricing, Refunds, Terms of Service, Community Guidelines, and Unsubscribe.
- Home page hero and app CTA.
- About, mission, features, and success-story content, rewritten without financial-upside language.
- Photo/gallery-style visual section, replaced in the prototype with stronger app/product imagery.
- Contact form with name, email, and message.
- Contact/support block with hours.
- Pricing page with subscription tiers, Hearts in-app credit packs, a la carte perks, billing/cancellation notes, and legal links.
- Privacy Policy.
- Terms of Service.
- Refunds and Cancellation Policy.
- Community Guidelines.
- Unsubscribe/profile removal request form.
- Cookie notice.

## New Prototype Additions

- `/mockups` page with three design directions: Editorial Warmth, Studio Glass, and Social Postcard.
- `/contact-us` route for a dedicated contact surface.
- Static Netlify form declarations for contact and unsubscribe.
- Netlify redirects for `/terms-of-service`, `/unsubscribe-1`, and client-side routes.

## Replacement Strategy

Replace the current site-builder site with this GitHub-backed Netlify site. Before DNS cutover, the Netlify preview must pass:

- Manual crawl of all public pages.
- `npm run audit:copy`.
- Stripe-facing copy review against the policy language in `docs/migration-ticket.md`.
