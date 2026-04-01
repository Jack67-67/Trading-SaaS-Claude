# Quanterra — Trading Backtest SaaS

Institutional-grade backtesting infrastructure for systematic traders. Built with Next.js 14, Supabase, and a FastAPI backtest engine.

## Stack

| Layer          | Technology                          |
| -------------- | ----------------------------------- |
| Framework      | Next.js 14 (App Router)             |
| Language       | TypeScript (strict)                 |
| Styling        | Tailwind CSS                        |
| Auth + DB      | Supabase (Auth, Postgres, RLS)      |
| Backtest API   | External FastAPI at BACKTEST_API_URL |
| State          | Zustand (client), RSC (server)      |
| Deployment     | Vercel (recommended)                |

## Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root HTML shell
│   ├── page.tsx                # Redirect → /dashboard
│   ├── not-found.tsx           # Global 404
│   ├── globals.css             # Tailwind + custom styles
│   ├── actions/
│   │   └── auth.ts             # Server actions (sign-out)
│   ├── auth/
│   │   ├── layout.tsx          # Split-screen auth layout
│   │   ├── login/page.tsx      # Email + OAuth login
│   │   ├── register/page.tsx   # Registration + email confirm
│   │   └── callback/route.ts   # OAuth/email code exchange
│   └── dashboard/
│       ├── layout.tsx          # Sidebar + topbar shell
│       ├── page.tsx            # Overview with KPIs
│       ├── loading.tsx         # Skeleton loader
│       ├── error.tsx           # Error boundary
│       ├── strategies/page.tsx
│       ├── backtests/page.tsx
│       ├── results/page.tsx
│       └── settings/page.tsx
├── components/
│   ├── ui/                     # Primitives (Button, Input, Card, etc.)
│   ├── layout/                 # Sidebar, TopBar
│   └── dashboard/              # Dashboard-specific widgets
├── hooks/
│   └── use-auth.ts             # Client-side auth state
├── lib/
│   ├── supabase/
│   │   ├── client.ts           # Browser Supabase client
│   │   ├── server.ts           # Server Supabase client
│   │   └── middleware.ts       # Session refresh middleware
│   ├── api/
│   │   └── backtest.ts         # Typed FastAPI HTTP client
│   ├── constants.ts
│   └── utils.ts
├── types/
│   ├── index.ts                # App types (Strategy, Backtest, etc.)
│   └── supabase.ts             # Database type definitions
└── middleware.ts                # Next.js middleware entry
```

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A running FastAPI backtest engine (or mock one)

### 1. Clone and install

```bash
git clone <your-repo>
cd trading-backtest-saas
npm install
```

### 2. Configure environment

```bash
cp .env.local.example .env.local
```

Fill in your Supabase URL, anon key, and backtest API URL.

### 3. Run database migration

Go to your Supabase dashboard → SQL Editor → paste the contents of
`supabase/migrations/00001_initial_schema.sql` and run it.

Or if using the Supabase CLI:

```bash
npx supabase db push
```

### 4. Enable auth providers (optional)

In your Supabase dashboard → Authentication → Providers, enable:
- Email (enabled by default)
- GitHub (add OAuth app credentials)
- Google (add OAuth client credentials)

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture Decisions

**Why Supabase for auth instead of custom JWT?**
Supabase gives us battle-tested auth with OAuth, email confirmation, and
session management via cookies — all with zero custom token logic. The JWT
it issues is passed directly to the FastAPI backend for verification.

**Why a separate FastAPI backend?**
Backtest execution is CPU-intensive Python work (pandas, numpy, vectorbt).
It belongs in a dedicated service, not in a Node.js serverless function.
The Next.js app only handles UI and user data.

**Why RLS on every table?**
Row Level Security ensures that even if there's a bug in app code, users
can never access each other's data. Every query is automatically scoped
to `auth.uid()`.

## Next Steps

After this foundation, the next features to build are:

1. **Strategy editor** — Monaco editor with Python syntax highlighting
2. **Backtest submission form** — symbol/timeframe/date picker → POST to FastAPI
3. **Real-time status polling** — poll backtest status until completed
4. **Results dashboard** — equity curve chart, metrics grid, trade log table
5. **Webhook integration** — FastAPI calls a Supabase edge function on completion

## License

Private — all rights reserved.
