# My Score Tracker

A real-time game score and training tracker built with React. Supports Pool and Ping Pong games, live scoring with real-time updates, friend management, and statistics.

## Tech Stack

- **Framework**: React 18 + TypeScript
- **Build**: Vite 5 (SWC)
- **Styling**: Tailwind CSS 3 + shadcn/ui (Radix UI)
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State**: TanStack React Query 5
- **Forms**: React Hook Form + Zod
- **Routing**: React Router 6
- **Testing**: Vitest + Testing Library
- **Deployment**: Vercel (production), GitHub Pages (legacy)

## Commands

```bash
npm run dev              # Dev server on port 8080
npm run build            # Production build → dist/
npm run lint             # ESLint
npm test                 # Run tests (Vitest)
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
npm run supabase:reset   # Reset local database
npm run supabase:types   # Regenerate types from schema
```

## Project Structure

```
src/
├── components/
│   ├── auth/            # Auth provider, login, register, route guard
│   ├── pages/           # Page components (Home, History, Statistics, etc.)
│   ├── scores/          # Score forms, live tracker, wizard setup
│   │   └── wizard/      # Multi-step game setup wizard
│   ├── trainings/       # Training form and display
│   └── ui/              # shadcn/ui components + custom UI
├── hooks/               # Custom hooks (useTrackerData, useMobile)
├── lib/                 # Service layer and utilities
│   ├── supabaseDatabase.ts   # Database CRUD (singleton service)
│   ├── supabaseAuth.ts       # Auth service (singleton, observable state)
│   ├── supabaseFriends.ts    # Friends management service
│   ├── gameTypes.ts          # Game type constants and type guards
│   ├── queryCache.ts         # TanStack Query key management
│   └── utils.ts              # cn() utility
├── integrations/
│   └── supabase/
│       ├── client.ts    # Supabase client init
│       └── types.ts     # Auto-generated DB types (do not edit manually)
├── routes/index.tsx     # Router configuration
├── App.tsx              # Root with providers
└── main.tsx             # Entry point
```

## Patterns & Conventions

### Naming
- Components: `PascalCase.tsx` (e.g., `ScoreForm.tsx`)
- Hooks: `camelCase.ts` (e.g., `useTrackerData.ts`)
- Services/utils: `camelCase.ts` (e.g., `supabaseDatabase.ts`)
- shadcn/ui components: `camelCase.tsx` (e.g., `button.tsx`)
- Tests: colocated as `*.test.tsx` / `*.test.ts`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

### Architecture
- **Service singletons** in `lib/` for Supabase operations (database, auth, friends)
- **TanStack Query hooks** in `hooks/useTrackerData.ts` wrap service calls
- **Query cache invalidation** via `invalidateTrackerQueries()` from `queryCache.ts`
- **Auth state** managed as observable singleton, synced to React via `AuthProvider`
- **Imports** use `@/` alias mapped to `src/`

### Components
- Functional components with hooks only
- Props typed as interfaces
- Forms use controlled state with `useState` (some use React Hook Form)
- Errors shown via toast notifications (Sonner)
- Modals use shadcn/ui `Dialog` or `responsiveFormModal`

### Testing
- Mock Supabase via `src/test/supabaseMock.ts`
- Use `vi.hoisted()` for mock variables that need hoisting
- Test user interactions with `@testing-library/user-event`
- Assert with `@testing-library/jest-dom` matchers

## Environment Variables

```
VITE_SUPABASE_URL          # Supabase project URL
VITE_SUPABASE_PUBLISHABLE_KEY  # Supabase anon/public key
```

Accessed via `import.meta.env.VITE_*`. Defined in `.env.production` (committed, public keys only). Local overrides in `.env.development.local` (gitignored).

## Key Files

- `src/components/scores/LiveScoreTracker.tsx` — Core live game tracking logic
- `src/components/pages/StatisticsPage.tsx` — Statistics and charts
- `src/lib/supabaseDatabase.ts` — All database operations
- `src/lib/supabaseAuth.ts` — Auth with observable state pattern
- `src/integrations/supabase/types.ts` — Auto-generated, regenerate with `npm run supabase:types`
