# Film Room — Private Library Release Rollout

Branch: `filmroom-auth` | Worktree: `/Users/natesteven/.openclaw/filmroom-auth`

---

## Verified State (as of 2026-09-14)

**natesteven@gmail.com**: confirmed in Supabase Auth (`email_confirmed_at` not null, id prefix `660e5fee`). Account already exists — do NOT re-sign-up. Migration 010 will link this account to the legacy data.

**R2 bucket `filmroom-videos`** (live inventory):
- CDN public access: **enabled** (`pub-9fa275ba678642e488776c297174f037.r2.dev`)
- Custom domains: none
- Objects (5 found, all under `games/`):
  - `games/e2f0285d-.../browser-test.mp4` — 5 MB (test artifact)
  - `games/e2f0285d-.../bigtest.mp4` — 100 MB (test artifact)
  - `games/e2f0285d-.../2026-07-31_19_54_53.MP4` — **8.7 GB** (9,363,935,281 bytes) ← 9GB video
  - `games/f18b6f3a-.../2026-09-13_14_38_16.MP4` — **8.7 GB** (uploaded tonight)
  - `games/f8e36052-.../2026-09-13_14_38_16.MP4` — **8.7 GB** (duplicate from earlier attempt)
- Non-Film-Room uses: none found in application code
- All objects are `games/` prefixed — safe to restrict at cutover

**Vercel env vars** — all present and verified working tonight:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
`CLOUDFLARE_R2_BUCKET`, `CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`,
`CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_CDN_URL`, `CLOUDFLARE_STREAM_TOKEN`,
`CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN`

---

## Verified Supabase Project State (read from dashboard 2026-09-14)

**Project:** `suhfyckmuenjskitrzlq` ("Rebuild")  
**SHARED with RestoReports** — 91 existing auth users from a different application.  
**Site URL:** `https://app.restoreports.com` (RestoReports — do NOT change)  
**Redirect allowlist:** only `https://restoreports-v2.vercel.app/**` and `https://app.restoreports.com/**`  
**Email:** built-in sender only, no custom SMTP, **2 emails/hour** rate limit (not 4)  
**Email provider:** enabled (`external.email = true`)  
**Signup:** enabled (`disable_signup = false`)  
**Email confirmation:** required (`mailer_autoconfirm = false`)  

## ⚠️ Blocking Decision Required Before Any Deployment

The Supabase project is shared between Film Room and RestoReports. This creates two options — **Nate must choose before proceeding**:

**Option A: Separate Film Room onto its own Supabase project (recommended)**
- Create a new free Supabase project for Film Room
- Film Room gets its own Site URL, redirect allowlist, SMTP, user pool
- RestoReports is untouched
- Cost: free tier, no new paid resources
- Requires: update `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` in Vercel for Film Room routes only
- Migration 009–012 run on the new project
- natesteven@gmail.com signs up fresh on the new project (already confirmed on old project, not portable)

**Option B: Stay on shared project**
- Film Room users join the same auth pool as RestoReports
- Site URL cannot change (would break RestoReports email links)
- Redirect allowlist needs `/filmroom/auth/callback` added (safe — additive, doesn’t affect RestoReports)
- Email confirmation links use `app.restoreports.com` as sender domain
- 2/hr email rate limit shared across both apps
- natesteven@gmail.com already exists and confirmed — migration 010 can run immediately once code is deployed
- Password reset emails will show RestoReports branding unless SMTP is configured

**Neither option requires changing global Supabase settings that would break RestoReports.**  
**Do not deploy code or run migrations until this decision is made.**

## External Setup (Option B — shared project, minimal changes)

### 1. Add redirect URL (additive, does not affect RestoReports)
In Supabase → Authentication → URL Configuration, add to redirect allowlist:
```
https://www.njsbuilds.com/filmroom/auth/callback
```

### 2. SMTP (optional but strongly recommended)
Built-in email: 2/hr limit, team address sender. Without custom SMTP, password reset and email confirmation will fail silently under any real load. Configure via Authentication → SMTP Settings using Resend, SendGrid, or Postmark.

### 3. No new Vercel env vars needed (for Option B)
All required variables are already present and working.

---

## Migration Sequence

> **Critical ordering**: migration 010 MUST run before Nate logs in and triggers `provision_default_library`. If 010 runs after first login, the RPC creates a new coach row and the legacy coach (TEST_COACH_ID) remains unlinked — 010 will still succeed because it only checks auth.users, not the coach table. But running 010 first is cleaner and avoids the legacy coach existing alongside a new one.

### Step 1 — Apply migration 009 (additive, safe, no data change)
```
-- In Supabase SQL Editor:
\i 009_filmroom_auth.sql
```
Effect: adds owner_id columns, upload_sessions table, deny-by-default RLS. Legacy rows (owner_id=null) become inaccessible — expected.
**No rollback needed**: only adds columns/tables/policies. If deploy fails, revert code without touching DB.

### Step 2 — Apply migration 011 (stat_entries CHECK constraint fix)
```
\i 011_filmroom_stat_types.sql
```
Safe — replaces broken constraint with correct type set. No data loss.

### Step 3 — Apply migration 012 (provision_default_library RPC)
```
\i 012_provision_library.sql
```
Adds `active_upload_session` column to games and the idempotent provisioning RPC.

### Step 4 — Apply migration 010 (data assignment — run BEFORE first login)
```
\i 010_filmroom_data_migration.sql
```
Will abort with EXCEPTION (no partial write) if any of these are false:
- natesteven@gmail.com exists and is confirmed ✅ (already verified)
- Legacy team `00000000-0000-0000-0000-000000000010` exists ✅
- Legacy team has no existing owner_id (null) ✅
- Legacy coach `00000000-0000-0000-0000-000000000001` has no existing auth_user_id ✅

After success: all games/players/clips/stats/comments owned by natesteven@gmail.com.

**Rollback of 010** (if needed before Step 5): run the commented rollback block inside `010_filmroom_data_migration.sql`. This nulls out ownership assignments without deleting any data or restoring open access.

### Step 5 — Deploy code
```
git checkout main && git merge filmroom-auth && git push
```
Vercel auto-deploys. Auth enforced immediately on all Film Room routes.

### Step 6 — Verify Nate's library
1. Go to `https://www.njsbuilds.com/filmroom` — should redirect to `/filmroom/login`
2. Sign in with `natesteven@gmail.com` and existing password
3. Library should show all games (legacy data now owned)
4. 9GB video should play via signed URL (CDN still public at this point — both paths work)
5. Check players, clips visible

### Step 7 (separate decision) — Disable R2 public CDN
Only after verifying `/api/filmroom/video-token` works correctly in production:

```bash
# Verify token route first:
curl -s "https://www.njsbuilds.com/api/filmroom/video-token?gameId=<gameId>" \
  -H "Cookie: <session-cookie>" | jq .

# If src and expiresInSeconds are present, proceed:
curl -s -X PUT \
  "https://api.cloudflare.com/client/v4/accounts/$CLOUDFLARE_ACCOUNT_ID/r2/buckets/filmroom-videos/domains/managed" \
  -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

After disabling: `pub-9fa275ba678642e488776c297174f037.r2.dev` URLs return 403. Videos play only via signed URLs from the token route.

**Rollback of CDN disable**: re-run with `"enabled": true`.

---

## Remaining Staging/Production Blockers

1. **Supabase Auth SMTP**: password reset emails will fail silently on free plan (>4/hr limit). Must configure custom SMTP before this route is usable in production.

2. **Supabase redirect URL**: `/filmroom/auth/callback` must be added to the allowlist in Supabase dashboard before PKCE-based email confirmation and password reset work.

3. **`provision_default_library` RPC requires SECURITY DEFINER**: the migration creates the function with `security definer`. If the Supabase project has restricted `security definer` functions (some Enterprise plans do), the RPC will fail with a permission error on first login. Verify in Supabase SQL Editor: `SELECT prosecdef FROM pg_proc WHERE proname = 'provision_default_library'` should return `t`.

4. **Video-token route not tested in production**: the signed URL route (`/api/filmroom/video-token`) has been built and type-checked but not exercised against the live R2 bucket from a production session. Must verify manually before disabling public CDN (Step 7).

5. **3 duplicate 9GB video objects in R2**: `games/e2f0285d-...`, `games/f18b6f3a-...`, `games/f8e36052-...` all contain the same video (identical ETag on the 8.7GB ones). Only one is referenced by the game record. The others can be deleted manually via Cloudflare dashboard after launch to reclaim storage.

6. **`coaches` table**: after migration 010, the legacy `TEST_COACH_ID` row will have `auth_user_id = natesteven@gmail.com's uid`. The `provision_default_library` RPC checks for an existing coach by `auth_user_id` first — it will find and reuse this row rather than creating a duplicate. This is the correct behavior.

---

## Verified Facts (updated 2026-09-14 from dashboard)

- Supabase project `suhfyckmuenjskitrzlq` is **shared with RestoReports** (91 existing users)
- Site URL: `https://app.restoreports.com` — **do not change**, would break RestoReports
- Redirect allowlist: `https://restoreports-v2.vercel.app/**` and `https://app.restoreports.com/**` only — `/filmroom/auth/callback` is **missing**, must be added before PKCE works
- Email: **built-in sender only**, **2/hour** hard limit (official Supabase docs, not 4), team address only — no custom SMTP configured
- No Film Room staging Supabase project exists — second project (`uepvtwsfcvvsviyckbje`) is Hoop Pilot, unrelated
- `natesteven@gmail.com` already confirmed in this project — do **not** sign up again, sign in directly after migration 010
- Corrected SMTP limit from ROLLOUT item 1: **2/hr**, not 4/hr

---

## Decision: Option A — Dedicated Film Room Supabase Project

Nate chose a dedicated Supabase project for Film Room, completely separate from RestoReports.

### Cost
- **Supabase Free tier**: $0/month — includes 500 MB DB, 1 GB file storage, 50k MAU, unlimited API requests
- Film Room needs: 1 project, ~10 users to start, no storage (videos in R2) → **free tier sufficient**
- No paid resources needed to set up

### Step 0 — Create the new Supabase project (one-time, before anything else)
1. Go to supabase.com → New project
2. Name: `Film Room` (or similar — does not affect existing projects)
3. Region: **East US (Ohio)** — matches R2 bucket region
4. Database password: generate strong, save it securely
5. Wait for project to provision (~2 min)
6. Note the project URL (`https://<ref>.supabase.co`) and anon key (Settings → API)
7. Note the service role key (Settings → API → service_role — keep secret)

### New environment variables required
Add to `.env.local` (local dev) and Vercel (production):

```
NEXT_PUBLIC_FILMROOM_SUPABASE_URL=https://<new-ref>.supabase.co
NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY=<anon key>
FILMROOM_SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

See `.env.filmroom.example` in the worktree for the template.

**The guard in `lib/filmroom-config.ts` will hard-error if you accidentally set these to the RestoReports project URL (`suhfyckmuenjskitrzlq`).** RestoReports is untouched.

### Supabase Auth settings on new project (no global settings affected)
On the NEW project only:
- Authentication → Settings → Site URL: `https://www.njsbuilds.com`
- Redirect URLs: add `https://www.njsbuilds.com/filmroom/auth/callback`
- Email provider: enabled by default ✓
- SMTP: configure custom (Resend/SendGrid/Postmark) — 2/hr built-in limit applies here too

### Updated migration sequence for Option A
Step 1: Create new Supabase project (above)
Step 2: Run migrations 009 → 011 → 012 on the new project SQL editor (010 is manual, later)
Step 3: Add the three new env vars to Vercel — do NOT remove or change RestoReports vars
Step 4: Deploy filmroom-auth branch — Film Room auth now uses new project, RestoReports unchanged
Step 5: Nate signs up at `/filmroom/signup` with natesteven@gmail.com on the NEW project
Step 6: Confirm email on new project
Step 7: Run migration 010 — assigns existing Film Room data (games, clips, 9GB video) to Nate's new account
         (Migration 010 checks auth.users on the NEW project — Nate must be confirmed there first)
Step 8: Verify library: all games/players/clips/9GB video visible and playable
Step 9: Two-user integration test (see scripts/test-filmroom-auth.ts — requires FILMROOM_TEST_PROJECT_HOST set to the new project's host)
Step 10: CDN cutover and private delivery verification (separate decision)

### What is NOT migrated to the new project
- RestoReports users (91 existing) — stay on original project, completely untouched
- RestoReports database — untouched
- Film Room DB data (games, clips, players) — already in the shared Postgres DB (`suhfyckmuenjskitrzlq`). The Film Room tables live there and will continue to. Only AUTH moves to the new project. The `SUPABASE_SERVICE_ROLE_KEY` for DB access remains the RestoReports project key — we're only changing the auth project. ⚠️ See note below.

### ⚠️ Important: Auth vs Database separation
The Film Room database tables (games, clips, players etc.) are in `suhfyckmuenjskitrzlq` (shared Postgres). The new project only handles **authentication**. This means:
- `NEXT_PUBLIC_FILMROOM_SUPABASE_URL` / `NEXT_PUBLIC_FILMROOM_SUPABASE_ANON_KEY` → new project (auth)
- `SUPABASE_SERVICE_ROLE_KEY` for DB queries → still the original project (data)

The filmroom-supabase-server.ts `createServiceClient()` uses `FILMROOM_SUPABASE_SERVICE_ROLE_KEY` for the service role client. This needs to point to the **original** project for DB access. The `getVerifiedUser()` auth client uses the new project for session verification.

**This creates a split-project architecture**: auth verification on new project, DB reads/writes on original. RLS policies on the DB tables use `auth.uid()` — but `auth.uid()` is from the JWT issued by the auth project. The two projects' JWTs are not compatible.

**Full separation options**:
- **Option A1 (recommended)**: Migrate Film Room DB tables to the new project too. Requires exporting data from original project and importing to new. Migration 010 then runs on the new project entirely.
- **Option A2**: Use the new project for auth JWT only, pass user ID explicitly to all service role queries (no RLS reliance, ownership enforced in code only — less safe but no data migration needed).

**Hold deployment until this is clarified.** Option A1 gives full isolation and clean RLS. Option A2 is faster but weaker.
