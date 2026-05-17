# RestoReports v2 — Setup Guide

## Build Status ✅
Clean build. Zero TypeScript errors. 28 routes.

## Before You Can Run It

You need to fill in 3 services. All have free tiers to get started.

---

### 1. Supabase (database + auth)
1. Go to https://supabase.com → New project
2. **Settings → API** → copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`
3. **SQL Editor** → paste contents of `supabase/migrations/001_initial_schema.sql` → Run
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (dev) or `https://app.restoreports.com` (prod)
   - Redirect URLs: add `http://localhost:3000/**`

---

### 2. Stripe (billing)
1. Go to https://dashboard.stripe.com → create account
2. **API Keys** → copy publishable + secret key
3. **Products → Create product**: "RestoReports"
   - Add price: $25/month recurring → copy Price ID → `STRIPE_BASE_PRICE_ID`
   - Add price: $5/month recurring → copy Price ID → `STRIPE_PER_SEAT_PRICE_ID`
4. **Webhooks → Add endpoint**:
   - URL: `https://app.restoreports.com/api/webhooks/stripe`
   - Events: `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_succeeded`, `invoice.payment_failed`
   - Copy signing secret → `STRIPE_WEBHOOK_SECRET`
5. For local dev use Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

---

### 3. Fill in `.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASE_PRICE_ID=price_...
STRIPE_PER_SEAT_PRICE_ID=price_...

NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## Running Locally
```bash
cd restoreports-v2
npm run dev
# open http://localhost:3000
```

## Routes
| Route | Description |
|-------|-------------|
| `/` | Landing page |
| `/signup` | New account (30-day trial) |
| `/login` | Sign in |
| `/dashboard` | Main dashboard |
| `/jobs` | Jobs list |
| `/jobs/new` | Create job |
| `/jobs/[id]` | Job detail |
| `/jobs/[id]/rooms/new` | Add room |
| `/jobs/[id]/rooms/[roomId]` | Room detail + readings |
| `/jobs/[id]/report` | Generate PDF report |
| `/settings` | Company, profile, team, equipment |
| `/billing` | Subscription management |
| `/report/[id]` | Public shareable report |
| `/admin` | Admin panel |
