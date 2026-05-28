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

## Replacement Strategy

Replace the current site-builder site with this GitHub-backed Netlify site. Before DNS cutover, the Netlify preview must pass:

- Manual crawl of all public pages.
- `npm run audit:copy`.
- Stripe-facing copy review against the policy language in `docs/migration-ticket.md`.
