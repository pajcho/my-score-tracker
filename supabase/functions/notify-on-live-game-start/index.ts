// supabase/functions/notify-on-live-game-start/index.ts
//
// Triggered by AFTER INSERT on live_games via pg_net (see migration
// 20260521120000_push_notifications.sql). Fans out an instant push
// notification to the opponent on every device they've enabled
// notifications on.
//
// Auth: pg_net calls this without a user JWT, so verify_jwt is off
// (config.toml) and we authenticate via a shared X-Cron-Secret header.
//
// Idempotency: insert into `notification_log` keyed on
// (user_id, kind, ref_id) BEFORE sending. The UNIQUE constraint
// catches retries — if the row already exists, we skip the push.
// ref_id is the live_games uuid so the same trigger firing twice for
// the same game is deduped.
//
// Friend gate: we only push when the creator and the opponent are
// actually friends (via the `are_friends` RPC) — anyone could technically
// insert a live_game with any opponent_user_id, so this check keeps the
// notification respectful of the social graph the rest of the app
// already enforces.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = Deno.env.get("CRON_SECRET") ?? "";
const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

interface NotifyRequest {
  liveGameId: string;
  creatorUserId: string;
  opponentUserId: string;
  game: string;
}

interface PushSub {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

interface PreferenceRow {
  user_id: string;
  notify_on_live_game_invite: boolean;
}

Deno.serve(async (req) => {
  const cronHeader = req.headers.get("X-Cron-Secret");
  if (!CRON_SECRET || cronHeader !== CRON_SECRET) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: NotifyRequest;
  try {
    body = (await req.json()) as NotifyRequest;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  if (!body.liveGameId || !body.creatorUserId || !body.opponentUserId) {
    return Response.json({ error: "missing fields" }, { status: 400 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Only notify when the opponent has explicitly accepted the friendship.
  // The friends RPC is already used by the rest of the app and respects
  // the user's own opt-ins.
  const { data: areFriendsResult } = await supabase.rpc("are_friends", {
    user1_id: body.creatorUserId,
    user2_id: body.opponentUserId,
  });
  if (!areFriendsResult) {
    return Response.json({ ok: true, skipped: "not_friends" });
  }

  // Per-user opt-in. Missing row → use the column default (true).
  const { data: pref } = await supabase
    .from("notification_preferences")
    .select("user_id, notify_on_live_game_invite")
    .eq("user_id", body.opponentUserId)
    .maybeSingle();
  const optedIn = pref ? (pref as PreferenceRow).notify_on_live_game_invite : true;
  if (!optedIn) {
    return Response.json({ ok: true, skipped: "opted_out" });
  }

  // Resolve creator display name (for the push body). Profile is required
  // for friendship — but tolerate a missing row just in case.
  let creatorName = "A friend";
  const { data: creatorProfile } = await supabase
    .from("profiles")
    .select("name")
    .eq("user_id", body.creatorUserId)
    .maybeSingle();
  if (creatorProfile?.name) creatorName = creatorProfile.name;

  // Claim the (user, kind, entity) slot before sending so a retry of
  // the same trigger fire doesn't double-push.
  const kind = "live_game_invite";
  const { error: logError } = await supabase
    .from("notification_log")
    .insert({ user_id: body.opponentUserId, kind, ref_id: body.liveGameId });
  if (logError) {
    if (logError.code === "23505") {
      return Response.json({ ok: true, skipped: "already_sent" });
    }
    return Response.json({ error: logError.message }, { status: 500 });
  }

  const { data: subs } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", body.opponentUserId);
  const subList = (subs ?? []) as PushSub[];

  if (subList.length === 0) {
    return Response.json({ ok: true, sent: 0, reason: "no_subscriptions" });
  }

  const payload = JSON.stringify({
    title: "Live game invite",
    body: `${creatorName} has just started a live game with you.`,
    url: "/live",
    tag: `live-game-invite-${body.liveGameId}`,
  });

  let sent = 0;
  let dead = 0;
  for (const sub of subList) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      );
      sent++;
    } catch (e) {
      // deno-lint-ignore no-explicit-any
      const status = (e as any)?.statusCode as number | undefined;
      if (status === 404 || status === 410) {
        // Subscription is dead — drop the row to avoid the round-trip
        // on every future notification.
        await supabase.from("push_subscriptions").delete().eq("id", sub.id);
        dead++;
      }
    }
  }

  return Response.json({ ok: true, sent, dead, live_game_id: body.liveGameId });
});
