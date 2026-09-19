# Original and Auto playback

Original is the default and uses the untouched R2 upload. Auto is an optional,
private Cloudflare Stream rendition (adaptive H.264, up to 1080p). It is not a
lossless or 4K replacement. Preparing a copy never rewrites games.video_url.

Coaches choose Prepare Auto once per source, then select Auto when ready. Parents
can select a ready copy only when the coach shares film; they cannot start jobs.
Clip presentations continue to use Original. New uploads remain immediately
watchable in Original and are not automatically sent for paid processing.

## Deployment

Apply migration 018 to the dedicated Film Room database. Set
FILMROOM_STREAM_ENABLED=true. Use the approved protected CLOUDFLARE_API_TOKEN
(FilmRoom account token, Stream Write), with CLOUDFLARE_STREAM_TOKEN as legacy fallback.
The existing account and customer host have defaults; overrides are
CLOUDFLARE_ACCOUNT_ID and FILMROOM_STREAM_HOST. R2 credentials must support
HeadObject/GetObject in Film Room's bucket. Keep FILMROOM_BILLING_ENABLED=false.

Processing is asynchronous at Cloudflare. Status requests reconcile every 15s.
A database claim prevents duplicate copies. An uncertain upstream submission is
looked up by its unique creator/job ID, never blindly resubmitted. A definitive
rejection or encoder failure allows explicit reset/retry. A stalled unknown job
requires an operator to reconcile it; there is no automatic duplicate spending.

Both source and rendition authorization use the existing owner/parent checks.
Stream copies require signed URLs. Tokens expire in 15 minutes for owners and
60 seconds for parents; refresh happens at 12 minutes / 40 seconds respectively.
Privacy and job identity are checked again before signing. Already buffered video
cannot be recalled when access is revoked.

## Cleanup

Database triggers detach copies on replacement/deletion, including cascades.
After library visits, game deletion, and processing requests, cleanup removes only
Stream videos with the exact Film Room job metadata. Failures retain the ledger
and retry on another visit (no cron required). Unknown submissions retain their
ledger until reconciled. An inactive site may retain detached copies until its
next visit. No original R2 files or other applications' Stream videos are touched.

Existing Stream allowance: 1,000 stored minutes. No new plan purchased. Stream
pricing at implementation: $5 / 1,000 stored minutes; $1 / 1,000 delivered minutes.
The provider rejects requests beyond available capacity; this feature does not
purchase more capacity. Original R2 storage remains a separate existing cost.

## Checks

- TypeScript and production build.
- Billing and parent route regression tests.
- Real SQL migrations, claim uniqueness, client denial, replacement races and
  deletion ledger retention using PGlite.
- Provider token tests for private-only playback, metadata identity, TTL and
  sanitized errors.
- Hosted generated video: encoding, Original/Auto switching, position/speed,
  seek, fullscreen toolbar, parent denial/revocation and disposable cleanup.

## Safari parent playback (2026-09-18)

Parent playback now uses controls below the video instead of native inline controls, avoiding Safari's hover dimming layer. The same video element handles play/pause, timeline seeking, +/-5 seconds, mute, speed, and fullscreen.

Real Safari testing found that leaving an expired signed URL attached stalls playback, even when authorization renews. A stable application URL with a 307 redirect also stalled because Safari retained the redirected storage URL. The player therefore retains periodic source renewal as a temporary fallback; this may visibly refresh but avoids relying on an expired URL.

An optional private streaming gateway is prepared under `cloudflare/filmroom-playback`. It streams original R2 bytes directly, supports Range and HEAD requests, and uses a Durable Object to retain an immutable viewer/game identity and a renewable 60-second grant. The server renews only after the existing owner/parent authorization checks pass. Configure `FILMROOM_PLAYBACK_GATEWAY_URL` and `FILMROOM_PLAYBACK_GATEWAY_SECRET` only after deploying the worker with its `FILMROOM_VIDEOS` R2 binding, `PLAYBACK_SESSIONS` Durable Object binding, and matching `ADMIN_SECRET`. Without both server settings, the existing signed-URL fallback remains active. Gateway authorization errors fail closed.

Validation: production build, parent authorization regression, gateway authentication/expiry/ranges/HEAD/cache tests, and simulated stable-session renewals/recovery/revocation pass. The gateway has not yet been provisioned or verified in real Safari. Do not describe the blinking/stalling issue as resolved until that validation completes. Safari hover dimming and parent thumbnails were verified visually.

The parent library now reuses the coach library's authorized VideoThumbnail component, featured latest-game card, game cards, and date/heading style. Thumbnails are generated only for games with Film permission; stats-only games show a neutral placeholder. The upgrade link is a compact footer.
