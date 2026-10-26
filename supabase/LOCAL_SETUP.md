# Supabase Local Setup

## Prerequisites
- Docker Desktop running
- Supabase CLI installed (`supabase --version`)

## First-time setup
1. Copy `.env.development.local.example` to `.env.development.local`.
2. Run `npm run supabase:start`.
3. Run `npm run supabase:status`.
4. Copy the local `anon key` value into `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.development.local`.
5. Keep `VITE_SUPABASE_URL=http://127.0.0.1:55321` in `.env.development.local`.

## Daily workflow
- Start local stack: `npm run supabase:start`
- Check status and keys: `npm run supabase:status`
- Run app against local Supabase: `npm run dev:local`
- Run app against production Supabase in dev server: `npm run dev:prod`
- Apply migrations from scratch: `npm run supabase:reset`
- Regenerate TypeScript DB types: `npm run supabase:types`
- Stop local stack: `npm run supabase:stop`

Local ports in this repo are custom to avoid clashes with other Supabase projects:
- API: `55321`
- DB: `55322`
- Studio: `55323`
- Inbucket: `55324`
- Analytics: `55327`

## Amp orbs
`.agents/setup` installs the Node version from `.nvmrc`, npm dependencies and the Supabase CLI. Run `amp orb services ensure` to start Docker, the local stack (migrations + `seed.sql`) and the dev server on a portal; the first start pulls the images (~1.5 min). `scripts/orb/supabase.sh` writes `.env.development.local` and `supabase/functions/.env`, and the dev server proxies `/supabase` to the stack because the browser can only reach the portal. Sign in as `nikola.pajic@gmail.com` / `password123`. Set `VAPID_*` as Amp project secrets to send pushes with the production key pair.

## Production build for GitHub Pages
- Create `.env.production` from `.env.production.example`.
- Set production project URL and anon key values.
- Run `npm run build` locally.
- Deploy the built output to `gh-pages` branch.

Note: Vite injects env variables at build time. GitHub Pages does not provide runtime env injection for this SPA.
Avoid placing Supabase config in `.env.local`, because that file applies to all modes and can override production builds.
