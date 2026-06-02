# DomainDrop

**Track premium domain drops and get an email the moment one becomes available.**

DomainDrop is a small SaaS app: users add domains to a watchlist, a daily cron
job checks each one via the [RDAP](https://about.rdap.org/) protocol, and the
instant a domain stops being registered, the watcher gets an email with
one-click links to register it. Free plan watches up to 10 domains; Pro
(`$5/mo` via Stripe) is unlimited.

- **Live concept:** `domaindrop.watch`
- **Stack:** Next.js 16 (App Router) · React 19 · Supabase (Postgres + Auth) · Stripe · Resend · Tailwind CSS v4 · TypeScript

---

## Table of contents

- [How it works](#how-it-works)
- [Architecture](#architecture)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Data model](#data-model)
- [Prerequisites](#prerequisites)
- [Setup](#setup)
  - [1. Clone & install](#1-clone--install)
  - [2. Supabase](#2-supabase)
  - [3. Stripe](#3-stripe)
  - [4. Resend](#4-resend)
  - [5. Environment variables](#5-environment-variables)
- [Local development](#local-development)
- [Deployment (Vercel)](#deployment-vercel)
- [The cron job](#the-cron-job)
- [Security notes](#security-notes)
- [Scripts](#scripts)
- [Limitations & roadmap](#limitations--roadmap)

---

## How it works

```
1. User signs up (Supabase email auth) and lands on the dashboard.
2. User adds domains to a watchlist (validated client-side, stored in Postgres).
3. Once a day, Vercel Cron hits /api/cron with a bearer secret.
4. The cron route loads every domain not checked in the last 20 hours and
   queries RDAP for each.
5. If RDAP returns 404 (no registration found), the domain has "dropped":
   - its row is marked status=dropped
   - the watcher gets a one-time email via Resend with register links
6. The dashboard shows live status dots and a "Register now" button for drops.
```

**Why RDAP and not WHOIS?** RDAP is the IETF's modern, JSON-based replacement
for WHOIS. It's public, structured, and free of the aggressive rate limits and
inconsistent text formats that make WHOIS scraping painful. A `404` from
`rdap.org` is a strong signal the domain is unregistered (i.e. available).

---

## Architecture

```
┌──────────────┐     ┌─────────────────────────────────────────────┐
│   Browser    │     │              Next.js (Vercel)               │
│              │     │                                             │
│  Landing /   │────▶│  Server Components (auth-gated pages)        │
│  Dashboard   │     │  middleware.ts  → refreshes Supabase session │
│  (React 19)  │◀────│  /api/create-checkout  → Stripe Checkout     │
└──────┬───────┘     │  /api/stripe-webhook   → plan sync           │
       │             │  /api/cron             → daily drop check    │
       │ supabase-js │  /auth/callback        → OAuth code exchange │
       ▼             └───────┬─────────────────┬───────────────────┘
┌──────────────┐            │                 │
│   Supabase   │◀───────────┘                 │
│  Postgres    │   RLS-protected reads/writes  │
│  + Auth      │   service_role for cron/webhook
└──────────────┘                              │
                                ┌─────────────┼──────────────┐
                                ▼             ▼              ▼
                          ┌─────────┐   ┌─────────┐    ┌─────────┐
                          │  RDAP   │   │ Stripe  │    │ Resend  │
                          │rdap.org │   │ billing │    │  email  │
                          └─────────┘   └─────────┘    └─────────┘
```

Key boundaries:

- **Browser → Postgres** goes through Supabase's anon key and is governed by
  **Row Level Security**: users can only read/write their own rows.
- **Cron and Stripe webhook** use the **service_role key** to bypass RLS (they
  act on behalf of all users), so those routes are never exposed to the client.
- **`middleware.ts`** runs on every page request to rotate the auth cookies; if
  you remove it, access tokens can silently expire and server components will
  see a logged-out user.

---

## Tech stack

| Concern        | Choice                          | Notes |
| -------------- | ------------------------------- | ----- |
| Framework      | Next.js 16 (App Router, Turbopack) | Server Components by default |
| UI             | React 19 + Tailwind CSS v4      | Light-only design, Geist font |
| Auth + DB      | Supabase (Postgres, Auth, RLS)  | `@supabase/ssr` for cookie-based sessions |
| Billing        | Stripe Checkout + Webhooks      | `$5/mo` subscription |
| Email          | Resend                          | Transactional drop alerts |
| Domain lookups | RDAP via `rdap.org`             | No API key required |
| Validation     | Zod                             | Domain normalization + format check |
| Scheduling     | Vercel Cron                     | Daily at 08:00 UTC |
| Language       | TypeScript (strict)             | |

---

## Project structure

```
src/
├── middleware.ts                 # Refreshes Supabase session cookies on every request
├── app/
│   ├── layout.tsx                # Root layout, Geist font, metadata
│   ├── globals.css               # Tailwind import + base styles (light-only)
│   ├── page.tsx                  # Public landing page (redirects to /dashboard if logged in)
│   ├── auth/
│   │   ├── login/page.tsx        # Email/password sign-in (client component)
│   │   ├── signup/page.tsx       # Sign-up + "check your email" state
│   │   └── callback/route.ts     # Exchanges the email-confirm code for a session
│   ├── dashboard/
│   │   ├── page.tsx              # Server component: loads user's domains + profile
│   │   └── DashboardClient.tsx   # Watchlist UI: add/remove, upgrade, status dots
│   └── api/
│       ├── cron/route.ts         # Daily RDAP check + drop detection + email
│       ├── create-checkout/route.ts  # Creates a Stripe Checkout session
│       └── stripe-webhook/route.ts   # Syncs subscription status → profile.plan
├── lib/
│   ├── rdap.ts                   # checkDomainStatus() + affiliate register links
│   ├── email.ts                  # sendDomainDropAlert() via Resend
│   ├── validation.ts             # Zod domain schema + parseDomain() helper
│   └── supabase/
│       ├── client.ts             # Browser Supabase client (anon key)
│       └── server.ts             # Server Supabase client (cookie-aware)
├── types/index.ts                # Domain + Profile TypeScript interfaces
└── supabase/
    └── migrations/001_initial.sql # Tables, RLS policies, signup trigger
```

---

## Data model

Two tables, both with Row Level Security enabled. See
[`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql).

### `profiles`
Extends `auth.users`. A trigger auto-creates a row on signup.

| Column                  | Type        | Notes |
| ----------------------- | ----------- | ----- |
| `id`                    | uuid (PK)   | FK → `auth.users` |
| `email`                 | text        | |
| `plan`                  | text        | `free` \| `pro` |
| `stripe_customer_id`    | text        | set on first checkout |
| `stripe_subscription_id`| text        | set by webhook |
| `created_at`            | timestamptz | |

### `domains`
The watchlist. Unique per `(user_id, domain)`.

| Column            | Type        | Notes |
| ----------------- | ----------- | ----- |
| `id`              | uuid (PK)   | |
| `user_id`         | uuid        | FK → `profiles.id` |
| `domain`          | text        | normalized hostname |
| `status`          | text        | `active` \| `dropped` \| `checking` |
| `last_checked_at` | timestamptz | drives the 20h re-check window |
| `dropped_at`      | timestamptz | set when RDAP returns 404 |
| `notified_at`     | timestamptz | guarantees a one-time alert |
| `created_at`      | timestamptz | |

**RLS summary:** users can do anything to their own `domains` and read/update
their own `profile`; the `service_role` key (cron + webhook) can read and update
all rows.

---

## Prerequisites

- **Node.js** 20+
- **pnpm** (this repo pins pnpm via `pnpm-lock.yaml` / `pnpm-workspace.yaml`)
- Accounts: **Supabase**, **Stripe**, **Resend**, and **Vercel** (for cron in prod)

---

## Setup

### 1. Clone & install

```bash
git clone https://github.com/kanshao23/domain-drop-tracker.git
cd domain-drop-tracker
pnpm install
```

### 2. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Run the migration. Either paste
   [`supabase/migrations/001_initial.sql`](supabase/migrations/001_initial.sql)
   into the Supabase **SQL Editor**, or use the CLI:
   ```bash
   supabase db push
   ```
3. Under **Settings → API**, grab:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` / public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` secret → `SUPABASE_SERVICE_ROLE_KEY` (server only — never expose)
4. Under **Authentication → URL Configuration**, add your site URL and the
   redirect `…/auth/callback` so email confirmation links work.

### 3. Stripe

1. Create a product (e.g. "DomainDrop Pro") with a recurring price.
2. Copy the **price ID** (`price_…`) → `STRIPE_PRO_PRICE_ID`.
3. Copy your **secret** and **publishable** keys.
4. Add a webhook endpoint pointing at `https://YOUR-DOMAIN/api/stripe-webhook`
   subscribed to:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
5. Copy the webhook **signing secret** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

> Locally you can forward webhooks with
> `stripe listen --forward-to localhost:3000/api/stripe-webhook`.

### 4. Resend

1. Create an account at [resend.com](https://resend.com).
2. Verify your sending domain (or use `onboarding@resend.dev` for testing).
3. Create a **Full access** API key → `RESEND_API_KEY`.
4. Update the `from` address in [`src/lib/email.ts`](src/lib/email.ts) to match
   your verified domain.

### 5. Environment variables

Copy the template and fill in your own values:

```bash
cp .env.local.example .env.local
```

| Variable | Where used | Secret? |
| -------- | ---------- | ------- |
| `NEXT_PUBLIC_SUPABASE_URL` | client + server | no |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | client + server | no (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | cron + webhook | **yes** |
| `STRIPE_SECRET_KEY` | checkout + webhook | **yes** |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | client | no |
| `STRIPE_PRO_PRICE_ID` | checkout | no |
| `STRIPE_WEBHOOK_SECRET` | webhook | **yes** |
| `RESEND_API_KEY` | email | **yes** |
| `NEXT_PUBLIC_APP_URL` | checkout redirects | no |
| `CRON_SECRET` | `/api/cron` auth | **yes** |

Generate `CRON_SECRET` with:

```bash
openssl rand -hex 32
```

---

## Local development

```bash
pnpm dev          # start the dev server at http://localhost:3000
```

Trigger the cron route manually (it requires the bearer secret):

```bash
curl http://localhost:3000/api/cron \
  -H "Authorization: Bearer $CRON_SECRET"
# → {"checked":N,"dropped":M}
```

---

## Deployment (Vercel)

1. Import the repo into Vercel.
2. Add **all** environment variables from the table above in
   **Project → Settings → Environment Variables**.
3. Deploy. [`vercel.json`](vercel.json) registers the cron schedule:
   ```json
   { "crons": [{ "path": "/api/cron", "schedule": "0 8 * * *" }] }
   ```
   Vercel automatically sends the `Authorization: Bearer <CRON_SECRET>` header
   to scheduled cron invocations, which the route verifies.
4. Point your domain at the deployment and set `NEXT_PUBLIC_APP_URL`
   accordingly. Update the Stripe webhook URL and Supabase redirect URL to the
   production host.

> Note: Vercel's Hobby plan limits cron to **once per day**, which matches the
> `0 8 * * *` schedule here.

---

## The cron job

[`src/app/api/cron/route.ts`](src/app/api/cron/route.ts) is the heart of the
product:

1. Rejects any request without `Authorization: Bearer <CRON_SECRET>`.
2. Selects domains where `last_checked_at` is null or older than 20 hours,
   skipping any already marked `dropped`.
3. For each domain, calls `checkDomainStatus()`:
   - `404` from RDAP → unregistered → **dropped**.
   - otherwise → still registered → updates `last_checked_at`.
4. On a drop, sends a **one-time** email (guarded by `notified_at`) and stamps
   `dropped_at`.
5. Sleeps 200ms between lookups to stay polite to RDAP servers.
6. Returns `{ checked, dropped }`.

---

## Security notes

- **`.env.local.example` ships placeholders only.** Never commit real secrets;
  `.gitignore` excludes `.env.local` and `.env*.local`.
- The **service_role key** bypasses RLS — it lives only in the cron and Stripe
  webhook routes, which never run in the browser.
- The Stripe webhook verifies the signature with `STRIPE_WEBHOOK_SECRET` before
  trusting any event.
- The cron route is gated by a bearer secret; rotate `CRON_SECRET` if leaked.
- Domain input is normalized and format-validated with Zod
  ([`src/lib/validation.ts`](src/lib/validation.ts)) before hitting the DB or
  RDAP.

---

## Scripts

```bash
pnpm dev     # dev server (Turbopack)
pnpm build   # production build
pnpm start   # serve the production build
pnpm lint    # ESLint (next core-web-vitals + typescript)
pnpm test    # Vitest unit tests
```

---

## Limitations & roadmap

- **Daily granularity.** Checks run once a day; a domain that drops and gets
  re-registered within 24h can be missed. Faster polling needs a paid Vercel
  cron tier or an external scheduler.
- **RDAP coverage.** Some TLDs have spotty or missing RDAP endpoints; `rdap.org`
  is a bootstrap/redirect service and not every registry is covered.
- **404 ≈ available, not a guarantee.** A 404 is a strong signal but registry
  quirks (grace/redemption periods) mean "available to register" can lag the
  status flip.
- **No unsubscribe / watchlist-management page yet.** The alert email links to
  `/unsubscribe`, which isn't implemented.
- **Single email per drop.** Once `notified_at` is set, no further alerts fire
  for that domain.

Ideas: hourly checks for Pro, Slack/webhook notifications, bulk import, drop
history, and a real unsubscribe flow.
