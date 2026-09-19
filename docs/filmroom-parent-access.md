# Parent access release

## Behavior
Coaches use Profile > Parent access to invite a parent email, then choose film and/or stats for each game. New invitations share nothing. Copy invitation link shares the ordinary /filmroom/family URL; it is not a bearer credential and no invitation email is sent automatically. Parents register or sign in with the invited email, confirm that email, and explicitly accept the invitation. Signup, confirmation, and login preserve the family destination.

Pending invitations expire after 14 days. Accepted invitations persist until the coach revokes them. Delete/reinvite allows a fresh invitation. Parent viewing has no separate subscription. An account may also have its own coach library; this does not grant editing rights to another coach’s data. Demo games cannot be shared.

The family view provides shared game selection, native video controls/fullscreen, per-player event-derived stats, and stat playback moments when both film and stats are shared. Coach notes, clips, coaching tools, unshared games and roster data remain private. Stats are explicitly labeled as based on recorded events.

## Access design
Migration 017 introduces invitation and per-game sharing tables. Browser roles have no direct table grants. Security-definer RPCs return only safe metadata/events and verify auth.uid(), the confirmed auth.users email, accepted account, game owner, and team relationship. Existing owner RLS and write APIs remain unchanged. API writes verify coach ownership; clients cannot select owner IDs.

The video-token endpoint permits parents only after a film-specific access check, fails closed on DB errors, uses private/no-store responses, and issues 60-second URLs refreshed after 40 seconds. Owner URLs remain 15 minutes. Revocation stops new access, but already issued URLs may remain valid for one minute and buffered/downloaded bytes cannot be recalled. The family page rechecks sharing every 40 seconds.

## Verification
- TypeScript passed; production build passed.
- Full disposable PostgreSQL suite passed with zero failures, including 14 parent privacy/revocation checks.
- Parent token/redirect route tests passed; existing 31 billing route tests passed.
- Local Chrome: coach login, create invitation, stats-only sharing, parent login, accept, correct stats (3 points, 1 rebound, 1 assist).
- 390px phone layout inspected: no horizontal overflow.
- Real local cookie-auth HTTP checks: shared stats accessible; stats-only video, game edit, stat creation and sharing escalation rejected; coach revocation removes family listing and future stats/video access.
- Parent playback authorization/signing covered by route tests; a full parent video refresh/playback test against Cloudflare remains for staging.

## Deployment
Migrations 015, 016 and 017 were applied to dedicated Film Room project gurhiziqghzuqumpzkig on September 16, 2026. Verified two original games intact, billing enforcement false, no direct browser invitation-table grants, and parent RPC ready. Production deployment is in progress with FILMROOM_BILLING_ENABLED=false. No RestoReports resources are changed.

Nate’s release preference: publish completed changes after testing by default. Do not hold routine changes in development waiting for another deployment request. Live paid billing activation remains separately deferred.

## Follow-up roadmap
1. Combined subscription + parent access staging verification against Cloudflare.
2. Smaller playback renditions for high-bitrate source videos.
3. Demo footage and launch preparation.
4. Optional automated invitation emails and player-specific stat visibility. Current stats sharing is the whole selected game.

## Parent game workspace and shared clips (2026-09-18)

Migration `019_filmroom_parent_clips.sql` adds `clips.parent_shared` (false by default), a film-permission-checked clip RPC, and shot coordinates to the stats-permission-checked stats RPC. Applied to the dedicated Film Room Supabase project. Migration 020 then changes the default to shared, following the user’s preference.

Clips share by default. Coaches can enable **Private — only me** in the create/edit form to hide a clip. Parents must accept their invitation and have Film permission for that game. The RPC returns only clip ID, title, category, and time bounds; coaching notes, drawings, comments, tags, and private player associations are omitted. Unsharing removes the clip on the next refresh. Film permission still grants access to the full game video; this is not clip-only media access.

Parent game cards open a read-only video workspace with Clips, Stats, and Shots tabs. Stats-only sharing omits the video and Clips tab. Selecting a clip plays its saved range and pauses at its end; Continue full game clears the clip boundary. Stat/shot selection starts five seconds before the recorded moment. Desktop fullscreen includes the workspace and tabs; native video fullscreen is the fallback on browsers without element fullscreen support.

Validation: API authorization tests, parent video-token regressions, complete PGlite migration/privacy suite, and browser fixture checks using synthetic video (clip stop at 5.0 seconds, stat/shot navigation, stats-only restrictions, desktop and 1024px layout). The temporary fixture and video are removed before deployment. Live Safari invitation acceptance remains a user action; the user then explicitly requested sharing by default. A reviewed owner-scoped backfill enabled sharing for their 17 existing clips (16 Tryouts, 1 SBA 2033 vs Colorado). No invitations or game access permissions changed; other owners’ existing clips were untouched.
