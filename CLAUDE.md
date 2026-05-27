# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Emozi Digital Ecosystem Context
This workspace is part of the Emozi Digital platform, which spans across three main projects. Keep this architecture in mind during interactions:
- `emozidigital`: Next.js 14 marketing website & client onboarding (multi-step form).
- `emozidigital-admin`: Next.js 14 admin dashboard for lead management, scheduling, and email automation. (You are here)
- `Graphify`: Vite/React app for visual documentation & architecture graphs (Mermaid.js).

## Styling
Prioritize high-end aesthetics. Use Tailwind CSS utility classes. Brand palette — use these, not generic colors:

```
Deep Teal:  #003434   (primary, dark backgrounds, brand buttons)
Green:      #70BF4B   (active/success states)
Lime:       #D0F255   (highlight/completed)
Dark UI bg: #0d0d0d   (dashboard background)
```

---

## Commands

```bash
npm run dev       # Start dev server (localhost:3000; use 3001 if main marketing site is running)
npm run build     # Production build — TypeScript is checked here; local dev skips it
npm run lint      # ESLint (build intentionally ignores lint errors via next.config.mjs)
```

Run a seed or utility script:
```bash
npx tsx scripts/seed-blog.ts
npx tsx scripts/verify-seed.ts
```

**Vercel always runs strict TypeScript checks.** Local `npm run dev` may compile fine while Vercel rejects the build. Always verify types are clean with `npm run build` before pushing.

---

## Architecture

This is an **internal admin panel** — single-admin, not multi-user SaaS.

### Route groups

- `app/(dashboard)/` — all protected pages; layout wraps every page with `<Sidebar>` + `<Header>` and does server-side `getServerSession` redirect if unauthenticated
- `app/login/` — public auth page
- `app/api/` — Next.js Route Handlers; all routes except `/api/auth/*`, `/api/leads`, `/api/webhooks`, and `/api/email/unsubscribe` are protected by NextAuth middleware in `middleware.ts`

### Auth

Single-admin credentials auth via NextAuth.js (`lib/auth.ts`). The admin email and bcrypt password hash live in env vars (`ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`). No user table — one hard-coded admin account.

### Supabase clients

There are **two separate Supabase projects**:

| Client | File | Purpose |
|--------|------|---------|
| `supabase` / `supabaseAdmin` | `lib/supabase.ts`, `lib/supabase-server.ts` | Main emozidigital DB — clients, email, leads, content |
| `getAgentBazarSupabase()` | `lib/supabase-agentbazar.ts` | AgentBazar blog archive DB — synced on blog publish/delete |

Both use service-role keys that bypass RLS. `lib/supabase-server.ts` (`supabaseAdmin`) is a legacy alias for the same client in `lib/supabase.ts` — prefer `supabase` from `lib/supabase.ts` in new code.

### Key data model

The `clients` table stores all onboarding data as JSONB columns (`section_a` through `section_k` = client-submitted, `section_l` = credentials/access, `section_m` = package/project details, `section_notes` = plain text notes). All inline editing on the client detail page flows through `useClientUpdate` hook (`lib/useClientUpdate.ts`), which debounces 500ms then PATCHes `/api/clients/[id]` with either `{ section, data }` for JSONB columns or `{ field, value }` for top-level fields.

### Email subsystem

The email section (`app/(dashboard)/email/`) is the largest feature area. Key design decisions:

- **Multi-client support**: `email/layout.tsx` wraps all email pages with a `ClientContext` (see `email/client-context.tsx`). The selected `clientId` is persisted to `localStorage` as `email_client_id` and passed as `?client_id=` query param to all email API routes.
- **Sending infrastructure**: AWS SES via `lib/ses.ts` (`sesClient`). Configuration set = `"emozi-default"`. All tracking events (open, click, bounce, complaint) flow through SNS → `/api/webhooks/ses` → stored in `email_events` table with `ses_message_id` as the join key to `email_sends`.
- **Newsletter sending**: Handled by a **Supabase Edge Function** (`newsletter-send`) to avoid Vercel's 10s timeout. The Next.js route resolves recipients and creates the `newsletter_sends` record, then fires the Edge Function asynchronously.
- **Campaigns**: Sent directly from the Next.js route handler in batches. Stats computed by joining `email_sends` → `email_events` per campaign.
- **Statistics page** (`/email/statistics`): Aggregates all campaigns + newsletters into daily time-series. Accepts `?from=YYYY-MM-DD&to=YYYY-MM-DD` date filters. Uses `BarChart` component from `components/charts/BarChart.tsx`.
- **Supabase 1000-row default limit**: Always paginate or use `.limit(100000)` when fetching `email_sends` or `email_contact_tags` — the default 1000-row cap silently truncates sends.

### Blog subsystem

Blog posts are stored in the **main emozidigital Supabase DB** and **synced to AgentBazar Supabase** (`getAgentBazarSupabase()`) on every publish, update, and delete. The public blog at `blog.agentbazar.in` reads only from the AgentBazar DB.

- AI rewrite: `POST /api/blog/ai-generate` calls OpenAI (`OPENAI_API` env var) to rewrite content and generate SEO metadata.
- ISR revalidation: After publish/delete, the admin calls `blog.agentbazar.in/api/revalidate` to bust the Next.js ISR cache immediately.
- `read_time` is precomputed (word count / 200) and stored on publish so the blog frontend never fetches the full content column just for reading time.

### Client detail page

`app/(dashboard)/clients/[id]/page.tsx` — 9 tabs, inline editing via `useClientUpdate`, content calendar sub-data, CSV export, "Remind" action. All data fetched client-side via SWR against `/api/clients/[id]`.

### Payments

Razorpay payment links: `POST /api/payments/create-link` (`{ clientId, amount, description }`). Status stored in `clients.section_m.payment_status`.

### Content calendar

Two pages exist: `app/(dashboard)/content/page.tsx` (primary, full-featured) and `app/(dashboard)/content-calendar/page.tsx`. Both read/write the `content_calendar` table via `/api/content-calendar`.

### Supabase migrations

SQL migrations live in `supabase/migrations/`. Run them manually in the Supabase SQL editor — no CLI migration runner is configured.

---

## Environment variables required

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAIL
ADMIN_PASSWORD_HASH
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION
AGENTBAZAR_SUPABASE_URL
AGENTBAZAR_SUPABASE_SERVICE_ROLE_KEY
OPENAI_API
```
