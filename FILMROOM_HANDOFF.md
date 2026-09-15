# Film Room — Private Library Handoff

## Worktree / Branch / Commit

- **Worktree:** `/Users/natesteven/.openclaw/filmroom-auth`
- **Branch:** `filmroom-auth`
- **Tip commit:** `3daaf01` — Remove JWT content-sniffing from signIn; verify auth via positive API call
- **Repo:** `github.com/natesteven-resto/njsbuilds`

## Staged Deployment

- **ID:** `dpl_Bx9iDW5Fw4V4XacEnFdbpq8biLSD`
- **URL:** `https://njsbuilds-8tywcf9cl-natesteven-restos-projects.vercel.app`
- **Status:** Ready (Production target, Custom Domains Skipped)
- **www.njsbuilds.com:** NOT assigned — Auto-assign disabled by root
- **Note:** Vercel Deployment Protection is active on `.vercel.app` URLs. Access requires an authenticated browser session. `GET /filmroom/login` with no session returns 302→Vercel login HTML, not app HTML. Test positive auth checks must assert `Content-Type: application/json` and no redirect before treating 200 as app auth.

## Dedicated Supabase Project

- **Project:** `gurhiziqghzuqumpzkig` (Film Room, Free org)
- **URL:** `https://gurhiziqghzuqumpzkig.supabase.co`
- **Site URL:** `https://www.njsbuilds.com/filmroom`
- **Redirect URLs:** production callback + `?type=recovery` saved
- **Email SMTP:** configured and verified (DNS done)
- **Status:** Migrations 007b/009/011/012 applied. Data imported (2 games, 5 players, 1 clip, 19 stat entries). Ownership assigned to `natesteven@gmail.com` (migration 010 ran). Library verified by root.

## R2 Storage

- **Bucket:** `filmroom-videos`
- **Public CDN:** disabled (root turned off)
- **Video delivery:** private signed URLs via `/api/filmroom/video-token` (15 min, R2 presigned GET)
- **Verified:** both game videos load + seek via signed URL (readyState 4, no errors)
- **Object count:** 10 objects / 28.17 GB — do not delete unknown objects

## What Was Built

### Auth & Security
- Dedicated Supabase project — completely separate from RestoReports
- `lib/filmroom-config.ts` hard-guards against RestoReports project URL
- Middleware: `/filmroom/*` and `/api/filmroom/*` protected; root password gate preserved; reset-password not redirected (recovery sessions need it)
- All API routes: `getVerifiedUser()` → explicit field allowlists → service client only for ownership-verified writes
- RLS: deny-by-default, real ownership policies, no open `using(true)`

### Migrations (apply in order to new project)
1. `007b_filmroom_schema_only.sql` — schema, RLS enabled, no seed data, no open grants
2. `009_filmroom_auth.sql` — auth columns, upload_sessions, real RLS policies
3. `011_filmroom_stat_types.sql` — stat_entries CHECK constraint fix
4. `012_provision_library.sql` — provision_default_library RPC + active_upload_session
5. *(export SQL)* — imported data, owner_id=NULL
6. `010_filmroom_data_migration.sql` — assigns data to verified owner (handles signup-before-010 safely)

### UI Fixes
- Login: no auto-resend on unconfirmed; explicit resend button with 60s cooldown; callback error guidance (expired/invalid/used link)
- Signup: resend confirmation, sender guidance (`noreply@mail.njsbuilds.com`), spam note
- Game page: Account controls inline in header (removed fixed overlay collision with Change Video)
- Library stats: Clips and Highlights loaded from API (not hardcoded 0)
- Box score: Team total excludes null/OPP player events (fixed 20pt→16pt bug)
- Clip card: all icon buttons have aria-labels (Jump, Comments, Delete)
- Roster: aria-labels on delete; jersey 0 valid; error states on mutation failure
- VideoPlayer: private signed URL via video-token route; persistent refresh loop; position restored via `loadedmetadata`
- Upload: `game_id` (not `gameId`) sent to server — was causing 400 "game_id required"
- VideoUrlModal bypass removed — video_url only settable via upload completion

### Tests
- `scripts/test-filmroom-auth.ts` — two-user API security (auth, cross-user denial, owner_id forge, upload isolation)
- `scripts/test-video-upload.ts` — full upload lifecycle (create→PUT→ETag→complete→attach→video-token→range GET→R2 cleanup)
- `scripts/test-export-roundtrip.ts` — true PGlite PostgreSQL round-trip (text[], jsonb, scalars, ON CONFLICT)
- PGlite harnesses: `check.mjs`, `migration-check.mjs`, `fresh-owner-check.mjs` — all 0 failures

## Remaining Before Promotion

1. **Root browser-tests staged URL** (in progress) — login, library, game, upload, video playback
2. **Two-user API test** against staged URL with injected Film Room keys (Vercel Deployment Protection means test scripts need authenticated session cookies, not raw API calls — use `BASE_URL=https://njsbuilds-8tywcf9cl-...vercel.app` with a browser-captured session or bypass)
3. **Upload test** against staged URL — `SignatureDoesNotMatch` on localhost was stale local R2 creds; staged deployment uses Vercel's correct R2 env vars
4. **R2 test object cleanup** — if staged upload test creates an object, delete via Cloudflare dashboard (root approved)
5. **Coordinate promotion** — root explicitly promotes via Vercel dashboard after browser verification passes

## Known Limitations / Not In This Release
- Cloudflare Stream: disabled, returns 501. Re-upload via R2 if a Stream video is attached.
- Billing / paywall: `coaches.plan` column exists as placeholder, no logic
- Player portal pages: auth-gated by middleware, but page content not updated in this release
- Two-user test positive-auth check: must assert `Content-Type: application/json` and no redirect to detect Vercel Deployment Protection false-200s

## Files Changed (branch vs main)
See `git diff main filmroom-auth --stat` for full list. Key paths:
- `supabase/migrations/007b–012`
- `lib/filmroom-config.ts`, `lib/filmroom-supabase-*.ts`, `lib/supabase-browser.ts` (removed)
- `middleware.ts`
- `app/filmroom/login`, `signup`, `reset-password`, `auth/callback`, `layout.tsx`, `page.tsx`
- `app/filmroom/components/AccountBar.tsx`, `LogoutButton.tsx`
- `app/filmroom/game/[id]/page.tsx`
- `app/filmroom/roster/page.tsx`
- `app/api/filmroom/**` (all routes rewritten)
- `scripts/test-*.ts`, `ROLLOUT.md`, `FILMROOM_HANDOFF.md`
