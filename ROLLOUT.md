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

## External Setup Required

### 1. Supabase Auth settings (dashboard only — cannot be set via API)
- Authentication → Settings → **Email provider**: must be enabled
- **Site URL**: set to `https://www.njsbuilds.com`
- **Redirect URLs**: add `https://www.njsbuilds.com/filmroom/auth/callback`
- **SMTP**: Supabase free plan limits to 4 emails/hour. For password reset to work reliably in production, configure custom SMTP (Resend, SendGrid, etc.) under Authentication → Settings → SMTP.

### 2. No new Vercel env vars needed
All required variables are already present. Do not add the Cloudflare API token or R2 secret as plaintext in config — use the existing Vercel secret references.

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
