# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Emozi Digital Ecosystem Context
This workspace is part of the Emozi Digital platform, which spans across three main projects. Keep this architecture in mind during interactions:
- `emozidigital`: Next.js 14 marketing website & client onboarding (multi-step form).
- `emozidigital-admin`: Next.js 14 admin dashboard for lead management, scheduling, and email automation. (You are here)
- `Graphify`: Vite/React app for visual documentation & architecture graphs (Mermaid.js).

## General AI Instructions & Coding Standards
- **Tooling**: Always use built-in specific tools (e.g., `view_file`, `grep_search`, `write_to_file`) over generic bash equivalents.
- **Context Awareness**: Before introducing new components or dependencies, check if a suitable pattern or UI primitive already exists in the project.
- **Documentation**: Preserve all existing comments and docstrings unless instructed otherwise. Limit code changes strictly to the user's request.
- **Styling**: Prioritize high-end aesthetics (deep teal, lime green), use Tailwind CSS utility classes.

---

## Commands

```bash
npm run dev       # Start dev server (localhost:3000; use 3001 if main site is running)
npm run build     # Production build
npm run lint      # ESLint (build intentionally ignores lint errors via next.config.mjs)
```

Run a seed or utility script:
```bash
npx tsx scripts/seed-blog.ts
npx tsx scripts/verify-seed.ts
```

## Architecture

This is the **admin panel** for Emozi Digital — a single-admin internal tool, not a multi-user SaaS.

### Route groups

- `app/(dashboard)/` — all protected pages; layout wraps every page with `<Sidebar>` + `<Header>` and does a server-side `getServerSession` redirect if not authenticated
- `app/login/` — public auth page
- `app/api/` — Next.js Route Handlers; all except `/api/auth/*` and `/api/leads` are protected by the NextAuth middleware in `middleware.ts`

### Auth

Single-admin credentials auth via NextAuth.js (`lib/auth.ts`). The admin email and bcrypt password hash live in env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`). There is no user table — only one hard-coded admin account.

### Supabase client

`lib/supabase.ts` exports a **service-role** client (`SUPABASE_SERVICE_ROLE_KEY`) that bypasses RLS — use this everywhere in the admin. `lib/supabase-server.ts` exports the same under the name `supabaseAdmin` (legacy alias, prefer `supabase` from `lib/supabase.ts`).

### Key data model

The `clients` table stores all onboarding data as JSONB columns (`section_a` through `section_k` = client-submitted, `section_l` = credentials/access, `section_m` = package/project details, `section_notes` = plain text notes). All inline editing on the client detail page flows through `useClientUpdate` hook (`lib/useClientUpdate.ts`), which debounces 500ms then PATCHes `/api/clients/[id]` with either `{ section, data }` for JSONB columns or `{ field, value }` for top-level fields.

### Client detail page

`app/(dashboard)/clients/[id]/page.tsx` is the most complex page — 9 tabs rendering all sections, inline editing via `useClientUpdate`, content calendar sub-data fetched alongside the client, CSV export, and a "Remind" action. All data fetched client-side via SWR against `/api/clients/[id]`.

### Payments

Razorpay payment links generated via `/api/payments/create-link` (POST: `{ clientId, amount, description }`). Payment status stored in `clients.section_m.payment_status`. Webhook verification at `/api/webhooks/razorpay` (main site, not admin).

### Content calendar

Two admin pages exist for this feature: `app/(dashboard)/content/page.tsx` (primary, full-featured) and `app/(dashboard)/content-calendar/page.tsx`. Both read/write the `content_calendar` table via `/api/content-calendar`.

### Dashboard data

Stats, kanban pipeline, and activity feed are all fetched from dedicated API routes (`/api/dashboard/stats`, `/api/dashboard/onboarding`, `/api/dashboard/activity`) that query Supabase server-side with `force-dynamic`.

### Brand palette (use these, not generic colors)

```
Deep Teal:  #003434   (primary, dark backgrounds)
Green:      #70BF4B   (active/success states)
Lime:       #D0F255   (highlight/completed)
Dark UI bg: #0d0d0d   (dashboard background)
```

### Supabase migrations

SQL migrations live in `supabase/migrations/`. Run them manually in the Supabase SQL editor — there is no CLI migration runner configured.

## Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
```
