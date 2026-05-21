-- Push notification foundation: per-user preferences, push subscriptions,
-- and an idempotency log keyed on (user_id, kind, ref_id) so the same
-- entity event never produces two pushes for the same recipient.
--
-- Phase 1: live-game invites. When someone creates a live_game and the
-- opponent_user_id is set, the AFTER INSERT trigger calls the
-- `notify-on-live-game-start` Edge Function, which fans out a Web Push
-- to every device the opponent has enabled notifications on.
--
-- The trigger uses `pg_net.http_post` (async, returns a request id),
-- and authenticates against the function via a shared X-Cron-Secret
-- stored in the Supabase vault. Plaintext never appears here.

-- ---------------------------------------------------------------------------
-- notification_preferences
-- ---------------------------------------------------------------------------
-- One row per user, lazily upserted from the settings page. Defaults to
-- opted in — enabling notifications at all is a strong signal that the
-- user wants live-game invites.

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_on_live_game_invite BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- push_subscriptions
-- ---------------------------------------------------------------------------
-- One row per (user, installed device). `endpoint` is unique across all
-- push services (Apple, FCM, Mozilla autopush etc.) and works as the
-- natural key — used by the client to upsert when re-installing the PWA.
-- The send job is responsible for deleting rows that return 410 Gone.

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_id ON push_subscriptions(user_id);

-- ---------------------------------------------------------------------------
-- notification_log (idempotency)
-- ---------------------------------------------------------------------------
-- The Edge Function inserts a row here for every push it successfully
-- hands to the push service. The UNIQUE constraint prevents duplicate
-- sends even if the trigger fires twice (pg_net retry, manual replay).
--
--   kind   → 'live_game_invite' (extensible to digests, reminders, etc.)
--   ref_id → the entity uuid (live_games.id for live_game_invite)

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  ref_id TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, kind, ref_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_log_sent_at ON notification_log(sent_at);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
-- Everything user-scoped. `notification_log` is read-only for users —
-- only the Edge Function (service role) inserts.

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own notification prefs" ON notification_preferences
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notification prefs" ON notification_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notification prefs" ON notification_preferences
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own notification prefs" ON notification_preferences
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own push subscriptions" ON push_subscriptions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own push subscriptions" ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own push subscriptions" ON push_subscriptions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own push subscriptions" ON push_subscriptions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users read own notification log" ON notification_log
  FOR SELECT USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger for notification_preferences
-- ---------------------------------------------------------------------------
-- Reuse the project's existing update_updated_at_column() if present; if
-- not (fresh project), create it. Idempotent either way.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ---------------------------------------------------------------------------
-- live_games AFTER INSERT trigger → notify-on-live-game-start
-- ---------------------------------------------------------------------------
-- Fires for every new live_game. Sends the opponent's user id, the
-- creator's user id (so the Edge Function can resolve the display
-- name), and the live_game id (used both as the deep-link target and
-- as the idempotency ref_id).
--
-- `supabase.functions_url` is set on hosted Supabase to the project's
-- functions base URL. On local dev it's NULL — fall back to the
-- standard local endpoint so the trigger doesn't blow up.
--
-- pg_net + the vault-stored cron_secret are the same pattern used by
-- family-assistant-react. Both extensions are created here as part of
-- the migration (idempotent if they already exist).

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION notify_on_live_game_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, vault
AS $$
DECLARE
  fn_url TEXT := current_setting('supabase.functions_url', true);
  secret TEXT;
BEGIN
  -- Only notify when there's a real opponent user (anonymous opponents
  -- are typed in by the creator and have no account to push to).
  IF NEW.opponent_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF fn_url IS NULL OR fn_url = '' THEN
    fn_url := 'http://kong:8000/functions/v1';
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

DROP TRIGGER IF EXISTS notify_on_live_game_start ON live_games;
CREATE TRIGGER notify_on_live_game_start
  AFTER INSERT ON live_games
  FOR EACH ROW EXECUTE FUNCTION notify_on_live_game_insert();
