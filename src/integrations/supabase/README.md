# src/integrations/supabase

Purpose: Supabase client setup and Supabase-specific types.

Notes:
- Keep Supabase-specific configuration and typing here.
- Access helpers should live in `src/lib/` if shared by features.
- Supabase URL and anon key must come from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.

Agent commands:
- `npm run dev`
- `npm run dev:local`
- `npm run dev:prod`
- `npm run lint`
- `npm run build` (copies `dist/index.html` to `dist/404.html`)
- `npm run preview`
- `npm run supabase:start`
- `npm run supabase:status`
- `npm run supabase:reset`
- `npm run supabase:types`
- `npm run supabase:stop`

Local setup:
- Copy `.env.development.local.example` to `.env.development.local`.
- Run `npm run supabase:start`.
- Run `npm run supabase:status` and copy the local anon key into `.env.development.local`.
- Use `npm run dev:local` for local Supabase and `npm run dev:prod` for production Supabase.
