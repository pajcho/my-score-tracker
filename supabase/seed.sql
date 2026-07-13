-- Local development seed data.
-- Runs automatically after `supabase db reset` (and `npm run supabase:reset`).
--
-- Three users are created with known credentials so you can sign in immediately:
--   nikola.pajic@gmail.com / password123  (you)
--   marko@example.com      / password123  (friend)
--   ana@example.com        / password123  (friend)
--
-- All UUIDs are fixed so re-seeding produces the same dataset.

-- ---------------------------------------------------------------------------
-- 1. Auth users
-- ---------------------------------------------------------------------------
-- Insert directly into auth.users + auth.identities so the email/password
-- login path works against the local stack. The on_auth_user_created trigger
-- (handle_new_user) will populate public.profiles automatically and pick up
-- the name from raw_user_meta_data.

-- GoTrue scans these *_token / email_change columns as plain strings, so
-- they must be empty strings rather than the column-default NULL — otherwise
-- sign-in fails with "Database error querying schema".
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
) VALUES
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'nikola.pajic@gmail.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Nikola"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'marko@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Marko"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'ana@example.com',
    crypt('password123', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"name":"Ana"}'::jsonb,
    now(),
    now(),
    '', '', '', ''
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO auth.identities (
  id,
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) VALUES
  (
    gen_random_uuid(),
    '11111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    jsonb_build_object('sub', '11111111-1111-1111-1111-111111111111', 'email', 'nikola.pajic@gmail.com', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '22222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    jsonb_build_object('sub', '22222222-2222-2222-2222-222222222222', 'email', 'marko@example.com', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  ),
  (
    gen_random_uuid(),
    '33333333-3333-3333-3333-333333333333',
    '33333333-3333-3333-3333-333333333333',
    jsonb_build_object('sub', '33333333-3333-3333-3333-333333333333', 'email', 'ana@example.com', 'email_verified', true),
    'email',
    now(),
    now(),
    now()
  )
ON CONFLICT (provider, provider_id) DO NOTHING;

-- The handle_new_user trigger should have created profile rows. Make sure the
-- names match what we expect in case the trigger ran with different data.
UPDATE public.profiles SET name = 'Nikola' WHERE user_id = '11111111-1111-1111-1111-111111111111';
UPDATE public.profiles SET name = 'Marko'  WHERE user_id = '22222222-2222-2222-2222-222222222222';
UPDATE public.profiles SET name = 'Ana'    WHERE user_id = '33333333-3333-3333-3333-333333333333';

-- ---------------------------------------------------------------------------
-- 2. Friendships
-- ---------------------------------------------------------------------------
INSERT INTO public.friendships (id, user1_id, user2_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222'),
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 3. Historical scores
-- ---------------------------------------------------------------------------
-- score format: "<user_id score>-<opponent score>". Mix of wins/losses/ties,
-- both pool variants and ping pong, with and without a registered opponent.
INSERT INTO public.scores (id, user_id, game, opponent_name, opponent_user_id, score, date) VALUES
  ('bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '22222222-2222-2222-2222-222222222222', '7-5',  CURRENT_DATE - 14),
  ('bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '22222222-2222-2222-2222-222222222222', '4-7',  CURRENT_DATE - 12),
  ('bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '33333333-3333-3333-3333-333333333333', '5-5',  CURRENT_DATE - 10),
  ('bbbbbbbb-0000-0000-0000-000000000004', '11111111-1111-1111-1111-111111111111', 'Ping Pong', NULL,     '22222222-2222-2222-2222-222222222222', '11-9', CURRENT_DATE - 8),
  ('bbbbbbbb-0000-0000-0000-000000000005', '11111111-1111-1111-1111-111111111111', 'Ping Pong', NULL,     '33333333-3333-3333-3333-333333333333', '8-11', CURRENT_DATE - 6),
  ('bbbbbbbb-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', 'Pool',      'Dragan', NULL,                                   '7-3',  CURRENT_DATE - 4),
  ('bbbbbbbb-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '22222222-2222-2222-2222-222222222222', '6-7',  CURRENT_DATE - 2),
  ('bbbbbbbb-0000-0000-0000-000000000008', '11111111-1111-1111-1111-111111111111', 'Ping Pong', NULL,     '33333333-3333-3333-3333-333333333333', '11-7', CURRENT_DATE - 1),
  -- A typical evening: multiple matches against multiple opponents, one date.
  ('bbbbbbbb-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '22222222-2222-2222-2222-222222222222', '7-5',  CURRENT_DATE - 3),
  ('bbbbbbbb-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '33333333-3333-3333-3333-333333333333', '7-4',  CURRENT_DATE - 3),
  ('bbbbbbbb-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '22222222-2222-2222-2222-222222222222', '5-7',  CURRENT_DATE - 3),
  ('bbbbbbbb-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '33333333-3333-3333-3333-333333333333', '3-7',  CURRENT_DATE - 3),
  ('bbbbbbbb-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', 'Pool',      NULL,     '22222222-2222-2222-2222-222222222222', '7-6',  CURRENT_DATE - 3)
ON CONFLICT (id) DO NOTHING;

-- Pool settings for the Pool scores above (pool variant per match).
INSERT INTO public.pool_game_settings (
  id, score_id, created_by_user_id, pool_type, break_rule, first_breaker_side, current_breaker_side, last_rack_winner_side
) VALUES
  ('cccccccc-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', '8-ball',  'alternate',    'player1', 'player1', 'player1'),
  ('cccccccc-0000-0000-0000-000000000002', 'bbbbbbbb-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', '9-ball',  'alternate',    'player1', 'player2', 'player2'),
  ('cccccccc-0000-0000-0000-000000000003', 'bbbbbbbb-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', '10-ball', 'winner_stays', 'player1', 'player1', 'player1'),
  ('cccccccc-0000-0000-0000-000000000004', 'bbbbbbbb-0000-0000-0000-000000000006', '11111111-1111-1111-1111-111111111111', '8-ball',  'alternate',    'player1', 'player1', 'player1'),
  ('cccccccc-0000-0000-0000-000000000005', 'bbbbbbbb-0000-0000-0000-000000000007', '11111111-1111-1111-1111-111111111111', '8-ball',  'winner_stays', 'player2', 'player2', 'player2'),
  ('cccccccc-0000-0000-0000-000000000006', 'bbbbbbbb-0000-0000-0000-000000000009', '11111111-1111-1111-1111-111111111111', '8-ball',  'alternate',    'player1', 'player1', 'player1'),
  ('cccccccc-0000-0000-0000-000000000007', 'bbbbbbbb-0000-0000-0000-000000000010', '11111111-1111-1111-1111-111111111111', '8-ball',  'alternate',    'player2', 'player1', 'player1'),
  ('cccccccc-0000-0000-0000-000000000008', 'bbbbbbbb-0000-0000-0000-000000000011', '11111111-1111-1111-1111-111111111111', '8-ball',  'alternate',    'player1', 'player2', 'player2'),
  ('cccccccc-0000-0000-0000-000000000009', 'bbbbbbbb-0000-0000-0000-000000000012', '11111111-1111-1111-1111-111111111111', '9-ball',  'alternate',    'player2', 'player2', 'player2'),
  ('cccccccc-0000-0000-0000-000000000010', 'bbbbbbbb-0000-0000-0000-000000000013', '11111111-1111-1111-1111-111111111111', '8-ball',  'winner_stays', 'player1', 'player1', 'player1')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. Active live games
-- ---------------------------------------------------------------------------
-- One where you are the creator, one where you are the opponent — useful for
-- exercising the new "opponent can also save/delete" flow.
INSERT INTO public.live_games (
  id, created_by_user_id, opponent_user_id, opponent_name, game, score1, score2, date, started_at
) VALUES
  (
    'dddddddd-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    NULL,
    'Pool',
    4, 3,
    CURRENT_DATE,
    now() - interval '20 minutes'
  ),
  (
    'dddddddd-0000-0000-0000-000000000002',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    NULL,
    'Ping Pong',
    6, 4,
    CURRENT_DATE,
    now() - interval '10 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- Pool settings for the active Pool live game.
INSERT INTO public.pool_game_settings (
  id, live_game_id, created_by_user_id, pool_type, break_rule, first_breaker_side, current_breaker_side, last_rack_winner_side
) VALUES
  (
    'cccccccc-0000-0000-0000-000000000010',
    'dddddddd-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111',
    '8-ball',
    'alternate',
    'player1',
    'player2',
    'player1'
  )
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Trainings
-- ---------------------------------------------------------------------------
INSERT INTO public.trainings (id, user_id, game, title, training_date, duration_minutes, notes) VALUES
  ('eeeeeeee-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Pool',      'Pattern drills',     CURRENT_DATE - 13, 60, 'Worked on 8-ball patterns and shape for the 8.'),
  ('eeeeeeee-0000-0000-0000-000000000002', '11111111-1111-1111-1111-111111111111', 'Pool',      'Break practice',     CURRENT_DATE - 7,  45, '9-ball break technique, focus on cue ball control.'),
  ('eeeeeeee-0000-0000-0000-000000000003', '11111111-1111-1111-1111-111111111111', 'Ping Pong', 'Backhand topspin',   CURRENT_DATE - 3,  30, NULL)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 6. Vault: Edge Functions base URL for the live-game notification trigger
-- ---------------------------------------------------------------------------
-- The notify_on_live_game_insert trigger now reads the functions base URL
-- from `vault.decrypted_secrets` (see migration 20260522091431). For local
-- dev that's the kong gateway inside the supabase docker network. Seeding
-- it here means `npm run supabase:reset` leaves a working push pipeline
-- without manual setup.
--
-- The `cron_secret` vault entry is intentionally NOT seeded — its value
-- must match the CRON_SECRET in supabase/functions/.env.local, which is
-- gitignored. See the push-notifications-local-setup memory for how to
-- create it. Without it, requests still go out but the Edge Function
-- rejects them with 401 (loud and easy to debug).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM vault.secrets WHERE name = 'functions_url') THEN
    PERFORM vault.create_secret(
      'http://kong:8000/functions/v1',
      'functions_url',
      'Edge Functions base URL for pg_net trigger callbacks (local dev)'
    );
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- 6. API role grants
-- ---------------------------------------------------------------------------
-- With the CLI version in use here, tables created through raw SQL
-- migrations end up without SELECT/INSERT/UPDATE/DELETE for the API roles
-- locally, so every REST call fails with 42501. RLS still applies; these
-- grants only restore the hosted-Supabase baseline.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
