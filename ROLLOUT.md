# Film Room — Private Library Release Rollout

Branch: `filmroom-auth` | Worktree: `/Users/natesteven/.openclaw/filmroom-auth`

---

## External Setup (required before deploying)

### 1. Supabase Auth configuration
In Supabase dashboard → Authentication → Settings:
- **Email provider**: enable email/password sign-in
- **Site URL**: set to your production domain (e.g. `https://www.njsbuilds.com`)
- **Redirect URLs**: add `/filmroom/auth/callback` (full URL: `https://www.njsbuilds.com/filmroom/auth/callback`)
- **Email confirmation**: enabled (required — migration 010 checks `email_confirmed_at`)
- **SMTP**: Supabase free plan limits to 4 emails/hour. Configure custom SMTP (Resend, SendGrid, Postmark) for production volume.

### 2. Vercel environment variables
All must be present in Production environment:

| Variable | Status | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ already set | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ already set | |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ already set | |
| `CLOUDFLARE_R2_BUCKET` | ✅ already set | `filmroom-videos` |
| `CLOUDFLARE_R2_ENDPOINT` | ✅ already set | |
| `CLOUDFLARE_R2_ACCESS_KEY_ID` | ✅ already set (fixed tonight) | |
| `CLOUDFLARE_R2_SECRET_ACCESS_KEY` | ✅ already set (fixed tonight) | |
| `CLOUDFLARE_R2_CDN_URL` | ✅ added tonight | `https://pub-9fa275ba678642e488776c297174f037.r2.dev` |
| `CLOUDFLARE_STREAM_TOKEN` | ✅ set (Stream disabled in this release) | |
| `CLOUDFLARE_ACCOUNT_ID` | ✅ already set | |

---

## R2 Bucket Inventory

**Non-Film-Room uses of R2**: None found. Grep of `/app` confirms only `app/filmroom` and `app/api/filmroom` reference the bucket. Safe to restrict access at cutover.

**Existing 9GB video**: stored at `games/<game_id>/<timestamp>-<filename>` key in `filmroom-videos` bucket. Preserved by all migrations. Migration 010 sets `owner_id` without touching `video_url` or `video_id`.

---

## Migration Sequence (staged)

### Step 1 — Apply migration 009 (safe, additive)
```sql
\i supabase/migrations/009_filmroom_auth.sql
```
- Adds `owner_id`, `auth_user_id`, `plan`, `upload_sessions` table
- Drops open `using(true)` policies, installs deny-by-default RLS
- Legacy rows (owner_id=null) become inaccessible — expected, temporary
- **Rollback**: drop new columns + restore open policies from 007

### Step 2 — Apply migration 011 (safe, constraint fix)
```sql
\i supabase/migrations/011_filmroom_stat_types.sql
```
- Replaces broken stat_entries CHECK with correct full type set
- No data loss

### Step 3 — Apply migration 012 (RPC + active_upload_session)
```sql
\i supabase/migrations/012_provision_library.sql
```
- Adds `provision_default_library` RPC with advisory lock
- Adds `active_upload_session` to games table
- Safe to apply before any users sign up

### Step 4 — Deploy code
```
git push  # Vercel auto-deploys from main after PR merge
```
- Auth enforced on all Film Room routes
- Legacy rows inaccessible until migration 010
- New users can sign up at `/filmroom/signup`
- **Verify**: GET /api/filmroom/games returns 401 for unauthenticated request

### Step 5 — Nate signs up
1. Go to `https://www.njsbuilds.com/filmroom/signup`
2. Sign up with `natesteven@gmail.com`
3. Check email, click confirmation link
4. Verify redirect to `/filmroom` succeeds (may show empty library — normal before 010)

### Step 6 — Verify account in Supabase
In Supabase dashboard → Authentication → Users:
- Confirm `natesteven@gmail.com` exists
- Confirm `email_confirmed_at` is not null
- Note the user ID

### Step 7 — Apply migration 010 (data assignment — point of no return)
```sql
\i supabase/migrations/010_filmroom_data_migration.sql
```
- Aborts safely if: account not found, not confirmed, team already owned by another user
- Assigns all legacy games/players/clips/stats/comments to natesteven@gmail.com
- **Verify after**: Nate logs in, sees all games and 9GB video

### Step 8 — Verify library intact
- [ ] All games visible in /filmroom
- [ ] 9GB video loads (via CDN URL)
- [ ] Players and clips present
- [ ] Stat entries visible in box score
- [ ] Second user cannot see Nate's library

### Step 9 (CUTOVER — separate decision) — Disable R2 public CDN
```bash
curl -s -X PUT "https://api.cloudflare.com/client/v4/accounts/108ae2b237d537d16e57f93a1a13444f/r2/buckets/filmroom-videos/domains/managed" \
  -H "Authorization: Bearer ${CLOUDFLARE_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```
- **Before cutover**: verify /api/filmroom/video-token returns signed URL and video plays
- **After cutover**: direct CDN URL (pub-9fa275*.r2.dev) should return 403/404
- Verify video still plays via signed URL from video-token route

### Step 10 (Optional) — Remove legacy RLS window
Uncomment the commented block at the bottom of migration 011 and run it:
```sql
-- Removes anon SELECT fallback on all tables
-- Only run after verifying all rows have owner_id set (migration 010 complete)
```

---

## Rollback Procedures

| Step | Rollback |
|---|---|
| 009 | `DROP` new columns, restore open policies from 007; no data lost |
| 010 | Run commented rollback block in 010 to null out all owner_id assignments |
| 011 | Drop new CHECK constraint, restore original (no data lost) |
| 012 | Drop `provision_default_library` function and `active_upload_session` column |
| Code deploy | Revert to previous Vercel deployment in dashboard |
| CDN cutover (step 9) | Re-run curl with `"enabled": true` to restore public access |

**Rollback of 010 does NOT remove user accounts or delete data.**
**Rollback of 009 restores open access — only do this if immediately redeploying to fix an issue.**

---

## Deployment Blockers (exact)

1. **Supabase email provider must be configured** before signup works. Free plan rate limit (4/hr) blocks production use.
2. **natesteven@gmail.com signup and email confirmation must complete** before migration 010. If the account already exists from a previous signup attempt, confirm it is verified (`email_confirmed_at` not null).
3. **R2 CDN must NOT be disabled** until video-token route is verified in production. The route generates presigned GET URLs; if CDN is off but route is broken, all video playback fails.
4. **Supabase redirect URL** for `/filmroom/auth/callback` must be added in dashboard before password reset emails work.
5. **Migration 010 will abort** if any of these are true:
   - `natesteven@gmail.com` not in `auth.users`
   - `email_confirmed_at` is null
   - Legacy team `00000000-0000-0000-0000-000000000010` already has a different `owner_id`
   - Legacy coach `00000000-0000-0000-0000-000000000001` already linked to different `auth_user_id`

---

## Files Changed (this branch)

- `supabase/migrations/009_filmroom_auth.sql` — auth columns, RLS, upload_sessions
- `supabase/migrations/010_filmroom_data_migration.sql` — data assignment (manual)
- `supabase/migrations/011_filmroom_stat_types.sql` — stat type constraint fix
- `supabase/migrations/012_provision_library.sql` — RPC + active_upload_session
- `lib/supabase-server.ts` — SSR auth helpers
- `middleware.ts` — Film Room route protection
- `app/filmroom/login/page.tsx` — auth UI
- `app/filmroom/signup/page.tsx` — auth UI
- `app/filmroom/reset-password/page.tsx` — auth UI
- `app/filmroom/auth/callback/route.ts` — PKCE exchange
- `app/filmroom/layout.tsx` — user identity + logout
- `app/filmroom/components/LogoutButton.tsx` — logout
- `app/filmroom/page.tsx` — library by owner, error states, default team provisioning
- `app/api/filmroom/teams/route.ts` — NEW: list/provision teams
- `app/api/filmroom/games/route.ts` — ownership-scoped
- `app/api/filmroom/games/[gameId]/route.ts` — ownership-scoped
- `app/api/filmroom/clips/route.ts` — ownership-scoped, explicit fields
- `app/api/filmroom/clips/[clipId]/route.ts` — ownership-scoped
- `app/api/filmroom/players/route.ts` — ownership-scoped, jersey-0 fix
- `app/api/filmroom/players/[playerId]/route.ts` — ownership-scoped
- `app/api/filmroom/stat-entries/route.ts` — ownership-scoped, stat type validation
- `app/api/filmroom/stats/route.ts` — ownership-scoped
- `app/api/filmroom/comments/route.ts` — ownership-scoped, author fields server-set
- `app/api/filmroom/video-token/route.ts` — NEW: private signed playback
- `app/api/filmroom/video/[gameId]/route.ts` — ownership-scoped, single range request
- `app/api/filmroom/upload/route.ts` — auth + game ownership check
- `app/api/filmroom/upload/multipart/route.ts` — session-bound, file fingerprint, HeadObject recovery
- `app/api/filmroom/signed-url/route.ts` — ownership-scoped, key verified against game
- `scripts/test-filmroom-auth.ts` — API security tests (staging only, prod guard)
