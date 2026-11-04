# Field & Feather — Pheasant Hunt Prep

Route: /PheasantHuntPrep (case-sensitive). Isolated route, stylesheet, and static photo; no other NJS Builds app or backend changes.

## Product
- Cinematic, responsive landing page with CSS entrance animations, floating dust, parallax, and an explicit motion toggle; respects reduced-motion preferences.
- Basecamp dashboard and 108 seeded checks across seven categories.
- Three individually editable hunters (dad, sons 14/12), three editable dogs.
- Per-member and category filtering, search, essential/unfinished filters, custom items and removal.
- Trip dates, destination, lodging, emergency contact, veterinary contact, field notes.
- Meal calculator; dates set initial duration, manual calculator adjustments are session-only.
- Full print field guide, JSON backup/restore with validation and replacement confirmation.

## Data and privacy
No account/backend. Names, notes, contacts, checklist progress and custom items stay in localStorage under njs-pheasant-prep-v1; same-browser tabs synchronize through storage events. Other devices need exported JSON restore. Export contains private entered trip/contact details, never automatically uploads them. Metadata is noindex/nofollow.

## Verification
- npx tsc --noEmit
- npx eslint app/PheasantHuntPrep --quiet
- node --test scripts/pheasant-prep-data.test.ts
- Browser walkthrough: desktop and mobile, keyboard checkbox retention, planner forms, persistence across reload, search/filter, custom items, backup restoration, print CSS, motion toggle.
- Vercel production build before promotion. Other apps' routes should retain their existing responses.

The local checkout may use shared node_modules via symlink. Next/Turbopack rejects node_modules outside its project root; use npm run dev -- --webpack --port 3091 for this worktree. Vercel installs ordinary dependencies and does not need the workaround.

Content is jurisdiction-neutral. Destination/date are intentionally unset; official sources linked in Hunt plan. No season, youth eligibility or one-adult/two-youth supervision rule is assumed.

Photo: Tom Koerner / USFWS, public domain. See public/pheasant-prep/PHOTO-CREDIT.md.
