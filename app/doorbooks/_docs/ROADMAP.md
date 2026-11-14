# Doorbooks — roadmap

Working name: **Doorbooks** ("books for every door"). Rename = one constant in `_components/AppShell.tsx` + `layout.tsx` metadata.
Dev home: https://www.njsbuilds.com/doorbooks (route `app/doorbooks`, no auth, data in localStorage `njs:doorbooks:v1`).

## Thesis
QuickBooks makes landlords fake a property dimension with "classes" and then fight the report builder.
Doorbooks makes **property** the first thing you tap on every entry, so P&L by property, rent collection and
Schedule E are not reports you build — they are the default views.

## Phase 1 — web MVP (shipped)
- Properties with units, tenant, monthly rent, lease end, purchase price (cap rate).
- Transactions: Money in / Money out, property + unit chips, Schedule E chart of accounts, payee memory
  (typing a known payee auto-fills category + last amount), "Save & add another", `N` hotkey, undo delete.
- Dashboard: Income / Expenses / NOI / Cash flow for a range, 12-month chart with NOI line, rent collected
  this month (units paid / expected), per-property cards with sparklines, expense breakdown.
- Reports: P&L by property (matrix, pick columns), Schedule E Part I (lines 3–21 per property), Monthly trend.
  CSV export + print stylesheet.
- Settings: business name, payment accounts, JSON backup/import, sample portfolio, erase.
- Pure domain logic in `_lib/` (no React) — reused as-is by the iPhone app.

## Phase 2 — accounts + sync (next)
- Supabase project (new, not Hoop Pilot's): `_docs/supabase-schema.sql` is the schema, RLS by `owner_id`.
- Auth: magic link + Apple sign-in (needed for the iOS app anyway).
- Storage adapter: `_lib/store.ts` keeps the same action API; swap the persistence from localStorage to
  Supabase with an offline queue (write locally first, sync in background). One-tap "move my local books to my account".
- Route guard like Film Room's middleware (scoped to `/doorbooks`), marketing page stays public.
- Attachments: receipt photos → Supabase Storage (or R2), linked to a transaction.

## Phase 3 — iPhone app
- Expo (same stack as Hoop Pilot / Chalk), bundle `com.natesteven.doorbooks`.
- Share `_lib/` as a package (`packages/doorbooks-core`) — types, categories, reports, dates, money.
- Screens: Today (rent due + quick add), Properties, Add transaction (camera → receipt), Reports (P&L by property).
- Local SQLite cache + Supabase sync; works offline at the property.
- Build method: local Xcode archive, never without an explicit "Build" from Nate.

## Phase 4 — the stuff that sells it
- Bank import (Plaid or CSV from the bank) with one-tap categorize-per-row and payee rules.
- Rent reminders + late-fee auto-calc from lease terms; tenant payment links (Stripe) later.
- Mileage log (Schedule E line 6) with a per-property trip button.
- Depreciation schedule from purchase price / improvements (27.5-yr straight line) → line 18 auto-filled.
- CPA share link (read-only Schedule E + P&L + export).
- Multi-entity: NJS Properties LLC vs S&H Ranch LLC as separate "books".

## Domain / naming
- doorbooks.com and doorbooks.app are taken. `landlordledger.com` and `keyledger.com` had no DNS on 2026-11-13 (likely available).
- Own domain later; njsbuilds.com/doorbooks stays the dev/preview home.
