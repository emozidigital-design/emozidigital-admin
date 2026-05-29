# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Emozi Digital Ecosystem Context

This workspace is part of a three-project platform:
- `emozidigital`: Next.js 14 marketing website & client onboarding
- `emozidigital-admin`: Next.js 14 admin dashboard — leads, email automation, blog, clients **(you are here)**
- `Graphify`: Vite/React app for visual documentation (Mermaid.js)

---

## Commands

```bash
npm run dev       # Dev server on localhost:3000 (use 3001 if main site is running)
npm run build     # Production build — TypeScript is checked here, not in dev
npm run lint      # ESLint (build ignores lint errors via next.config.mjs)
npx tsx scripts/seed-blog.ts       # Run seed scripts
```

**Vercel enforces strict TypeScript.** Always run `npm run build` before pushing — `npm run dev` will compile while Vercel rejects.

---

## Styling

Tailwind CSS throughout. Brand palette:

```
Deep Teal:  #003434   (primary, brand buttons, dark backgrounds)
Green:      #70BF4B   (active/success states)
Lime:       #D0F255   (highlight/completed)
Dark UI bg: #0d0d0d   (dashboard background)
AgentBazar Orange: #F47920
AgentBazar Navy:   #001D4A
```

---

## Architecture

Single-admin internal panel (not SaaS). Next.js 14 App Router.

### Route groups

- `app/(dashboard)/` — all protected pages; server-side `getServerSession` redirect on layout
- `app/login/` — public auth page
- `app/api/` — Route Handlers; `middleware.ts` protects everything except `/api/auth/*`, `/api/leads`, `/api/webhooks/*`, `/api/email/unsubscribe`

### Auth

NextAuth.js credentials provider (`lib/auth.ts`). Single admin account from `ADMIN_EMAIL` + `ADMIN_PASSWORD_HASH` (bcrypt). No user table. All API routes call `await requireAuth()` as the first line and return the 401 it provides if the session is missing.

### Two Supabase projects

| Alias | File | Project |
|-------|------|---------|
| `supabase` / `supabaseAdmin` | `lib/supabase.ts` + `lib/supabase-server.ts` | Main emozidigital DB |
| `getAgentBazarSupabase()` | `lib/supabase-agentbazar.ts` | AgentBazar blog archive DB |

Both use service-role keys (RLS bypassed). `supabase-server.ts` (`supabaseAdmin`) is a legacy alias for `lib/supabase.ts` — prefer `supabase` in new code.

### Clients data model

`clients` table: onboarding data in JSONB columns (`section_a`–`section_k` = client-submitted, `section_l` = credentials, `section_m` = package details, `section_notes` = plain text). The client detail page (`app/(dashboard)/clients/[id]/page.tsx`) has 9 tabs with inline editing via `useClientUpdate` hook — debounces 500ms then PATCHes `/api/clients/[id]` with `{ section, data }` (JSONB) or `{ field, value }` (top-level).

---

## Email Subsystem

The largest feature area. Everything in `app/(dashboard)/email/` and `app/api/email/`.

### Multi-client context

`email/layout.tsx` wraps all email pages with `ClientContext` (from `email/client-context.tsx`). The selected `clientId` is persisted to `localStorage` as `email_client_id` and passed as `?client_id=` to all email API routes. **AgentBazar** is identified by the hardcoded constant `AGENTBAZAR_CLIENT_ID = "d5104fcd-defe-4e3d-a4cf-1893dba7b931"` — this string appears in multiple route files and `lib/newsletter-html.ts`.

### Sending infrastructure

- **SES**: `lib/ses.ts` exports `sesClient` and `SES_CONFIGURATION_SET = "emozi-default"`
- **Batch size**: 10 emails per `Promise.allSettled` batch, sequential batches
- **maxDuration = 300** on all send routes — set explicitly on every route handler that sends email
- **Checkpointing**: After every 5 batches (50 emails), `sent_count` is written to the DB so a Vercel timeout leaves a partial count rather than zero
- **Status flow**: `draft` → `sending` (set before loop starts) → `sent` (set after loop ends with final counts)
- **email_sends**: One row per recipient per send; `campaign_id` or `newsletter_send_id` set (never both); `contact_id` nullable (newsletter sends to leads may not be in `email_contacts`)

### Campaigns vs. Newsletters

| | Campaigns | Newsletters |
|--|-----------|-------------|
| Record table | `email_campaigns` | `newsletter_sends` |
| Recipients | Via `tag_ids` → `email_contact_tags` | Via `tag_ids`, `list_id`, or `recipient_type="leads"` |
| Send route | `/api/email/campaigns/[id]/send` | `/api/email/newsletter/send` |
| HTML | Inline template substitution (`{{name}}`, `{{email}}`, `{{unsubscribe}}`) | `buildNewsletterHtml()` from `lib/newsletter-html.ts` |
| Stats | On-demand JOIN: `email_sends` → `email_events` | Denormalized `opens_count`/`clicks_count` on record, incremented by RPC |
| Resend unopened | Uses `get_campaign_eligible_unopened()` RPC (single-query: joins sends + events + contacts) | Uses `get_newsletter_contacts_with_opens()` RPC |

### Newsletter HTML builder (`lib/newsletter-html.ts`)

`buildNewsletterHtml(params)` is the single entry point used by all newsletter send routes. It branches:

1. **Custom template** (`newsletterTemplateHtml` is set): calls `substituteTemplateVars()` which replaces `{{first_name}}`, `{{name}}`, `{{email}}`, `{{hero_title}}`, `{{hero_excerpt}}`, `{{hero_url}}`, `{{hero_image_url}}`, `{{trending_1_title}}`, `{{trending_1_url}}`, `{{trending_2_title}}`, `{{trending_2_url}}`, `{{unsubscribe_url}}`, `{{unsubscribe}}`
2. **AgentBazar default** (`isAgentBazar = true`): full branded layout — logo header, hero, trending-post cards, WhatsApp+Telegram community card, social footer
3. **Generic default**: clean teal-header layout for other clients

**Preview endpoint**: `POST /api/email/newsletter/preview` accepts the same params as the send route and returns the rendered HTML directly (used by the wizard Step 3 iframe).

### SES tracking flow

SNS → `POST /api/webhooks/ses` → writes to `email_events` (keyed by `ses_message_id`) → RPCs increment denormalized counts on campaign/newsletter records.

For campaigns: `increment_campaign_opens(p_id)`, `increment_campaign_clicks(p_id)`  
For newsletters: `increment_newsletter_opens(p_id)`, `increment_newsletter_clicks(p_id)`

Bounce/complaint events additionally set `email_contacts.bounced = true` / `complained = true` for suppression.

### PostgREST row-cap hazard

Supabase PostgREST caps query results at **1000 rows** by default. Any query against `email_sends`, `email_contact_tags`, or `email_events` must either paginate using `.range(page * PAGE, (page + 1) * PAGE - 1)` or explicitly set a higher `.limit()`. Silent truncation causes incorrect counts and missing recipients.

### Statistics

`/email/statistics` aggregates all campaigns + newsletters into daily time-series. Filtering: `?from=YYYY-MM-DD&to=YYYY-MM-DD`. Uses `BarChart` from `components/charts/BarChart.tsx`. A **"Sync stats"** button on the page triggers `POST /api/cron/reconcile-email-stats` which calls `reconcile_email_stats()` SQL RPC to recompute denormalized counts from raw event data.

### Cron job

`vercel.json` schedules `GET /api/cron/reconcile-email-stats` at `30 18 * * *` (18:30 UTC = midnight IST). Vercel passes `Authorization: Bearer $CRON_SECRET`. `POST` on the same route is for manual triggers (protected by `requireAuth()`).

---

## Blog Subsystem

Posts stored in main Supabase, synced to AgentBazar Supabase on every publish/update/delete.

- **Sync**: `POST /api/blog/agentbazar` upserts to AgentBazar DB by slug, then calls `blog.agentbazar.in/api/revalidate?secret=...&slug=...` to bust ISR cache
- **AI rewrite**: `POST /api/blog/ai-generate` → OpenAI (`OPENAI_API` env var), rewrites content + generates SEO metadata. System prompt is tuned for B2B travel industry.
- **`read_time`**: Precomputed (word count / 200) on publish; stored so the blog frontend never fetches the full `content` column just for reading time
- **AgentBazar blog**: Public site at `blog.agentbazar.in` reads only from AgentBazar DB. Admin never writes to it directly — always sync via the admin panel

---

## Supabase Migrations

SQL migrations in `supabase/migrations/`. **No CLI runner** — apply manually in the Supabase SQL editor. RPCs used by the email system are in `scratch/sql_all_functions.sql` and individual migration files; re-run with `CREATE OR REPLACE` if needed.

Key RPCs: `get_campaign_eligible_unopened`, `get_campaign_contacts_with_opens`, `get_newsletter_contacts_with_opens`, `get_campaign_event_counts`, `reconcile_email_stats`, `increment_campaign_sent_count`, `increment_campaign_opens`, `increment_campaign_clicks`, `increment_newsletter_opens`, `increment_newsletter_clicks`.

---

## Environment Variables

```
# Supabase (main)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Supabase (AgentBazar)
AGENTBAZAR_SUPABASE_URL
AGENTBAZAR_SUPABASE_SERVICE_ROLE_KEY
AGENTBAZAR_REVALIDATE_SECRET

# Auth
NEXTAUTH_SECRET
NEXTAUTH_URL
ADMIN_EMAIL
ADMIN_PASSWORD_HASH

# AWS SES/SNS
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
AWS_REGION

# AI / Blog
OPENAI_API

# Notion
NOTION_API_KEY
NOTION_CLIENTS_DB
NOTION_SOCIAL_ACCOUNTS_DB
NOTION_BRAND_ASSETS_DB
NOTION_ONBOARDING_DB
NOTION_CONTENT_CALENDAR_DB

# Misc
BREVO_API_KEY
GITHUB_TOKEN
CLIENT_JWT_SECRET
NEXT_PUBLIC_CLIENT_PORTAL_URL
OWNER_WHATSAPP
INTERNAL_SECRET
CRON_SECRET
N8N_ONBOARDING_WEBHOOK_URL
BLOG_BASE_URL
```
