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
- The shared Stripe account is selected. The production price, restricted key, and dedicated portal are saved in Vercel. Sandbox checkout, renewal, payment recovery, and portal tests have passed using temporary test credentials; an approved demo source remains deferred. Production credentials were not loaded into local tests.
- No live migration, owner entitlement, storage backfill, payment transaction, or billing deployment was performed.
- Cleanup retries are demand-driven. Monitor failed deletions/abandoned uploads and set an R2 lifecycle rule for incomplete multipart uploads after an agreed retention period.
- Free practice accounts can create coaching annotations; add abuse/rate limits before opening broad public signups.
- Define canceled-account video retention and customer notices before deleting any former subscriber's film.


## Development pass: payment lifecycle and upload recovery
- Payment refresh now reconciles the authenticated account with Stripe through an origin-checked POST. A checkout return requests one refresh. GET remains read-only.
- Subscription selection requires the exact Film Room app, owner metadata, and configured price. An expired active record cannot hide a newer payment failure.
- Expired incomplete payments can restart checkout; completed pending checkout sessions remain protected from duplicate billing.
- Payment failure and cancellation labels distinguish those states from free demo access.
- A lost multipart-completion response recovers only if R2 confirms the object exists; actual-size and ownership checks still precede attachment.
- 29 mocked unit/route checks pass, plus the disposable PostgreSQL migration/privacy/quota suite. TypeScript and production build pass.
- These are development tests, not real Stripe sandbox checkout or real R2 upload verification. No live charges, database migrations, deployments, or billing enablement occurred.
- Per Nate, demo footage and hosting changes are deferred. They do not block continued code development.

## Stripe sandbox lifecycle verification (September 16, 2026)
- Hosted Checkout: official declined card showed a payment error; retry with the success card produced a paid, active $25 monthly subscription.
- End-of-period cancellation: active until the paid boundary, then canceled after advancing the isolated Stripe test clock.
- A second isolated test clock verified successful monthly renewal, a declined renewal yielding `past_due`, and successful invoice repayment restoring `active`.
- Loaded the repository's actual subscription selector and upload-permission functions against these real sandbox responses. Initial payment, renewal, failed renewal, and recovery all yielded the expected permission; a different owner was excluded each time.
- Dedicated sandbox customer portal displayed only the fixture's Film Room subscription and three paid monthly invoices. Customer cancellation scheduled service end at the paid boundary.
- Billing UI corrected: unpaid periods no longer say “paid”; unfinished/expired checkout and stale active state receive specific labels. TypeScript passed after this change.
- Limits: database/auth request plumbing used the earlier disposable PostgreSQL and mocked route tests, not an externally hosted full-app test. Actual webhook delivery, staged authenticated browser flow, and R2 upload checks remain outstanding. No live migration, deployment, or paid billing activation.
