# emozidigital-admin

Admin panel for NortheastForU — manage onboarding submissions, users, and site content.

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Linting**: ESLint

## Project Structure

```
emozidigital-admin/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx          # Root layout (sidebar + topbar)
│   ├── page.tsx            # Redirect to /dashboard
│   ├── dashboard/          # Overview and stats
│   ├── users/              # User management
│   ├── submissions/        # Onboarding form submissions
│   └── settings/           # Site and admin settings
├── components/
│   ├── ui/                 # Reusable UI primitives (buttons, inputs, badges)
│   ├── layout/             # Sidebar, Topbar, PageHeader
│   ├── tables/             # Data tables for users and submissions
│   └── charts/             # Analytics and dashboard charts
├── lib/                    # Utilities, helpers, API clients
├── types/                  # Shared TypeScript types
└── public/
    └── images/             # Static images and assets
```

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

> Note: runs on port 3001 in development to avoid conflicts with the main site.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint |
