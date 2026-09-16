# Film Room subscription release — NOT enabled

Approved price: $25 USD monthly. Proposed capacity implemented: 50 non-demo games and 500 decimal GB (500,000,000,000 bytes). One private editable demo game per account; its shared source video does not consume quota. Existing videos remain readable after subscription expiration. Storage retention after cancellation still needs an operating policy.

## Implemented
- Dedicated Film Room Stripe credentials, monthly price validation, signed webhooks, customer portal.
- Per-owner customer mapping; checkout lease and persistent Stripe idempotency key protect retries.
- Active and unexpired subscription or operator-assigned complimentary access required for new games/uploads.
- Database game cap, transactional storage reservation and exact-size final attachment.
- Presigned upload parts bind their content length to the reserved 100 MiB chunk or final remainder.
- Detached video cleanup runs on billing visits and new uploads; quota is released only after R2 deletion succeeds. A scheduled cleanup worker and abandoned-upload lifecycle policy are recommended before broad launch.
- Demo source is operator-configured. No private customer film has been copied into a public demo.
- Owner-only billing page and usage display; existing library and tool behavior preserved with billing disabled.

## Checks
Run `node scripts/filmroom-billing-db-test.mjs` and `node scripts/filmroom-billing-route-test.cjs`. Both use disposable data/mocks and no live customer credentials. Also run TypeScript and the production build.

## Required before live activation
1. Obtain a Stripe account selected by Nate. Use Stripe test mode first. Configure a dedicated Film Room product, $25 monthly USD price, subscription portal configuration (cancellation/payment updates; no arbitrary product switching), and webhook endpoint `/api/filmroom/billing/webhook`. Test successful checkout, declined card, retry, renewal, cancellation at period end, resubscribe, and webhook replay/out-of-order delivery.
2. Configure protected environment variables: `FILMROOM_STRIPE_SECRET_KEY`, `FILMROOM_STRIPE_PRICE_ID`, `FILMROOM_STRIPE_WEBHOOK_SECRET`, `FILMROOM_STRIPE_PORTAL_CONFIG_ID`, `FILMROOM_SITE_URL=https://www.njsbuilds.com`. Never use RestoReports credentials. `FILMROOM_BILLING_ENABLED` remains false until ready.
3. Apply migration 015 with enforcement OFF to dedicated Film Room Supabase only. Verify authenticated ownership grants in the deployed database.
4. Select approved distributable demo footage (or a clearly labeled synthetic practice film), place it in Film Room storage, and set `filmroom_billing_settings.demo_video_url` to its private R2 source URL. Test playback, clips, stats and drawings in two separate demo accounts.
5. Backfill `games.video_bytes` and `filmroom_video_assets` for every existing R2 video using R2 HEAD ContentLength, not guessed sizes. Resolve existing multipart sessions before activation. Do not remove legacy assets during backfill. Grant complimentary owner access to the verified `natesteven@gmail.com` auth UUID after checking identity in the dedicated project.
6. Test real multipart uploads against R2, including signed Content-Length compatibility in Chrome, resume, completion response loss, replacement, abort, cleanup, and exact/over quota boundaries. Local R2 credentials have previously been stale; use the verified Film Room credentials only.
7. Hosting: Vercel team is currently Hobby. Resolve commercial hosting requirements before accepting paid subscribers; upgrading incurs a new recurring charge and has not been authorized.
8. Complete browser review on a staging deployment using the same isolated Film Room services. No paid checkout or limits should be enabled on live until the above passes. Then coordinate database `enabled=true` and `FILMROOM_BILLING_ENABLED=true` deployment during a short controlled activation; verify owner access first.

## Known operational follow-ups
- No Stripe account/test credentials or approved demo source was supplied in this work session.
- No live migration, owner entitlement, storage backfill, payment transaction, or billing deployment was performed.
- Cleanup retries are demand-driven. Monitor failed deletions/abandoned uploads and set an R2 lifecycle rule for incomplete multipart uploads after an agreed retention period.
- Free practice accounts can create coaching annotations; add abuse/rate limits before opening broad public signups.
- Define canceled-account video retention and customer notices before deleting any former subscriber's film.
