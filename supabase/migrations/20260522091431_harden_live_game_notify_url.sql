-- Hardening for notify_on_live_game_insert.
--
-- The original migration (20260521120000_push_notifications.sql) read the
-- Edge Functions base URL from `current_setting('supabase.functions_url')`
-- and silently fell back to `http://kong:8000/functions/v1` if the GUC was
-- unset. On hosted Supabase that GUC is NOT set automatically, and setting
-- it via ALTER DATABASE requires privileges the management API role does
-- not have — so production was silently posting every push to a hostname
-- that only resolves inside the local docker-compose network. Result:
-- every live-game-invite push since the feature shipped was a no-op and
-- `notification_log` stayed empty.
--
-- This migration replaces the URL source with `vault.decrypted_secrets`,
-- which mirrors how `cron_secret` is already stored. Both prod and local
-- can set their own value via `vault.create_secret(<url>, 'functions_url')`
-- — no special GUC permissions needed. If the vault entry is missing we
-- now RAISE WARNING and skip the http_post rather than failing silently;
-- the live_games INSERT still succeeds so a misconfigured environment
-- never breaks game creation, but the broken state surfaces in Postgres
-- logs instead of vanishing.
--
-- See also: seed.sql, which seeds the local `functions_url` to
-- http://kong:8000/functions/v1 so `supabase db reset` keeps the local
-- pipeline working without manual setup.

CREATE OR REPLACE FUNCTION notify_on_live_game_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  fn_url TEXT;
  secret TEXT;
BEGIN
  IF NEW.opponent_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO fn_url
  FROM vault.decrypted_secrets
  WHERE name = 'functions_url';

  IF fn_url IS NULL OR fn_url = '' THEN
    RAISE WARNING USING
      MESSAGE = 'notify_on_live_game_insert: vault secret "functions_url" is not set; skipping push notification.',
      HINT    = 'Run: SELECT vault.create_secret(''https://<project-ref>.supabase.co/functions/v1'', ''functions_url'');';
    RETURN NEW;
  END IF;

  SELECT decrypted_secret INTO secret
  FROM vault.decrypted_secrets
  WHERE name = 'cron_secret';

  PERFORM net.http_post(
    url := fn_url || '/notify-on-live-game-start',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'X-Cron-Secret', COALESCE(secret, '')
    ),
    body := jsonb_build_object(
      'liveGameId',     NEW.id,
      'creatorUserId',  NEW.created_by_user_id,
      'opponentUserId', NEW.opponent_user_id,
      'game',           NEW.game
    ),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;
