/**
 * Seeds self-contained DEMO users into local Supabase for README screenshots.
 * Fictional people, realistic data — safe to screenshot for a public README.
 *
 * Run:   node scripts/seed-demo.mjs
 *        (reads SUPABASE_URL / SERVICE_ROLE_KEY from env, falls back to local defaults)
 * Login: marko@demo.test / demo1234 (local Supabase only)
 *
 * Idempotent: deletes every @demo.test user (and their data) on each run,
 * leaving everything else in the database untouched. Refuses to run against
 * anything but a local Supabase. Dates are relative to today, so the screens
 * are never empty no matter when it runs.
 */

import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL || "http://127.0.0.1:55321";
const serviceRoleKey = process.env.SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceRoleKey) throw new Error("Missing SERVICE_ROLE_KEY (run: eval $(supabase status -o env | grep SERVICE_ROLE_KEY))");
if (!url.includes("127.0.0.1") && !url.includes("localhost")) {
  throw new Error(`Refusing to seed a non-local Supabase: ${url}`);
}

const db = createClient(url, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

const DEMO_DOMAIN = "@demo.test";
const USERS = [
  { key: "marko", email: `marko${DEMO_DOMAIN}`, name: "Marko Jovanović" },
  { key: "ana", email: `ana${DEMO_DOMAIN}`, name: "Ana Kovačević" },
  { key: "stefan", email: `stefan${DEMO_DOMAIN}`, name: "Stefan Ilić" },
  { key: "jovana", email: `jovana${DEMO_DOMAIN}`, name: "Jovana Popović" },
];
const PASSWORD = "demo1234";

// ---- date helpers (everything is relative to today so screens are never stale)
const TODAY = new Date();
TODAY.setHours(0, 0, 0, 0);
const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const day = (offset) => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + offset);
  return iso(d);
};
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

async function wipeExisting() {
  const { data, error } = await db.auth.admin.listUsers({ perPage: 1000 });
  if (error) throw error;
  const demoUsers = data.users.filter((u) => (u.email || "").endsWith(DEMO_DOMAIN));
  if (!demoUsers.length) return;
  const ids = demoUsers.map((u) => u.id);

  // pool_game_settings cascade from scores / live_games, but delete explicitly to be safe
  const { data: oldScores } = await db.from("scores").select("id").in("user_id", ids);
  const scoreIds = (oldScores || []).map((s) => s.id);
  if (scoreIds.length) await db.from("pool_game_settings").delete().in("score_id", scoreIds);
  const { data: oldLive } = await db.from("live_games").select("id").in("created_by_user_id", ids);
  const liveIds = (oldLive || []).map((g) => g.id);
  if (liveIds.length) await db.from("pool_game_settings").delete().in("live_game_id", liveIds);

  await db.from("scores").delete().in("user_id", ids);
  await db.from("scores").delete().in("opponent_user_id", ids);
  await db.from("trainings").delete().in("user_id", ids);
  await db.from("live_games").delete().in("created_by_user_id", ids);
  await db.from("live_games").delete().in("opponent_user_id", ids);
  await db.from("friendships").delete().in("user1_id", ids);
  await db.from("friendships").delete().in("user2_id", ids);
  await db.from("friend_invitations").delete().in("sender_id", ids);
  for (const u of demoUsers) {
    await db.auth.admin.deleteUser(u.id).catch(() => {});
  }
  console.log(`Removed ${demoUsers.length} old demo user(s)`);
}

async function createUsers() {
  const idByKey = {};
  for (const u of USERS) {
    const { data, error } = await db.auth.admin.createUser({
      email: u.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { name: u.name },
    });
    if (error) throw new Error(`createUser ${u.email}: ${error.message}`);
    idByKey[u.key] = data.user.id;
  }
  console.log("Created users:", Object.keys(idByKey).join(", "));
  return idByKey;
}

async function insert(table, rows) {
  const { data, error } = await db.from(table).insert(rows).select();
  if (error) throw new Error(`insert into ${table}: ${error.message}`);
  return data;
}

async function main() {
  await wipeExisting();
  const ids = await createUsers();

  // ---- friendships + a pending invitation (shows up on the Friends page)
  await insert("friendships", [
    { user1_id: ids.marko, user2_id: ids.ana },
    { user1_id: ids.marko, user2_id: ids.stefan },
  ]);
  await insert("friend_invitations", [
    {
      sender_id: ids.jovana,
      receiver_email: `marko${DEMO_DOMAIN}`,
      status: "pending",
      message: "Hey Marko! Add me so we can track our pool games 🎱",
    },
  ]);

  // ---- completed matches (score is "yours-theirs" from the creator's perspective)
  // vsUser → registered friend, vsName → guest opponent typed by name
  const matches = [
    // Pool — race-to-7 style results
    { d: 0,  game: "Pool", score: "7-5", vsUser: "ana", pool: "9-ball", break: "alternate" },
    { d: -1, game: "Pool", score: "7-3", vsUser: "stefan", pool: "9-ball", break: "alternate" },
    { d: -2, game: "Ping Pong", score: "11-8", vsUser: "ana" },
    { d: -3, game: "Pool", score: "4-7", vsUser: "ana", pool: "8-ball", break: "winner_stays" },
    { d: -5, game: "Ping Pong", score: "9-11", vsUser: "stefan" },
    { d: -6, game: "Pool", score: "7-6", vsName: "Luka", pool: "9-ball", break: "alternate" },
    { d: -8, game: "Pool", score: "7-2", vsUser: "ana", pool: "9-ball", break: "alternate" },
    { d: -9, game: "Ping Pong", score: "11-6", vsName: "Ivan" },
    { d: -11, game: "Pool", score: "5-7", vsUser: "stefan", pool: "10-ball", break: "alternate" },
    { d: -12, game: "Ping Pong", score: "11-9", vsUser: "ana" },
    { d: -14, game: "Pool", score: "7-4", vsUser: "ana", pool: "9-ball", break: "winner_stays" },
    { d: -16, game: "Pool", score: "3-7", vsName: "Luka", pool: "8-ball", break: "alternate" },
    { d: -17, game: "Ping Pong", score: "7-11", vsUser: "stefan" },
    { d: -19, game: "Pool", score: "7-5", vsUser: "stefan", pool: "9-ball", break: "alternate" },
    { d: -21, game: "Ping Pong", score: "11-7", vsUser: "ana" },
    { d: -23, game: "Pool", score: "7-6", vsUser: "ana", pool: "9-ball", break: "alternate" },
    { d: -25, game: "Pool", score: "6-7", vsUser: "stefan", pool: "9-ball", break: "winner_stays" },
    { d: -27, game: "Ping Pong", score: "11-4", vsName: "Ivan" },
    { d: -29, game: "Pool", score: "7-1", vsName: "Luka", pool: "8-ball", break: "alternate" },
    { d: -32, game: "Ping Pong", score: "8-11", vsUser: "ana" },
    { d: -35, game: "Pool", score: "7-5", vsUser: "ana", pool: "9-ball", break: "alternate" },
    { d: -38, game: "Pool", score: "2-7", vsUser: "stefan", pool: "9-ball", break: "alternate" },
    { d: -41, game: "Ping Pong", score: "11-9", vsUser: "stefan" },
    { d: -44, game: "Pool", score: "7-3", vsUser: "ana", pool: "10-ball", break: "alternate" },
    { d: -48, game: "Ping Pong", score: "11-5", vsUser: "ana" },
    { d: -52, game: "Pool", score: "4-7", vsName: "Luka", pool: "9-ball", break: "winner_stays" },
    { d: -56, game: "Pool", score: "7-6", vsUser: "stefan", pool: "8-ball", break: "alternate" },
    { d: -61, game: "Ping Pong", score: "11-8", vsName: "Ivan" },
    { d: -66, game: "Pool", score: "7-2", vsUser: "ana", pool: "9-ball", break: "alternate" },
    { d: -72, game: "Ping Pong", score: "6-11", vsUser: "stefan" },
    { d: -78, game: "Pool", score: "5-7", vsUser: "ana", pool: "9-ball", break: "alternate" },
    { d: -85, game: "Pool", score: "7-4", vsName: "Luka", pool: "8-ball", break: "winner_stays" },
  ];

  const scoreRows = matches.map((m) => ({
    user_id: ids.marko,
    game: m.game,
    score: m.score,
    date: day(m.d),
    opponent_user_id: m.vsUser ? ids[m.vsUser] : null,
    opponent_name: m.vsName || null,
  }));

  // a couple of matches recorded by friends where Marko is the opponent
  const friendRecorded = [
    { d: -4, by: "ana", game: "Pool", score: "7-4", pool: "9-ball", break: "alternate" },
    { d: -13, by: "stefan", game: "Ping Pong", score: "11-9" },
  ];
  for (const m of friendRecorded) {
    scoreRows.push({
      user_id: ids[m.by],
      game: m.game,
      score: m.score,
      date: day(m.d),
      opponent_user_id: ids.marko,
      opponent_name: null,
    });
  }

  const inserted = await insert("scores", scoreRows);
  console.log(`Inserted ${inserted.length} scores`);

  // pool settings for every pool match (drives the "Pool (9-Ball)" labels + break stats)
  const allMatches = [...matches, ...friendRecorded];
  const poolSettings = inserted
    .map((row, i) => ({ row, meta: allMatches[i] }))
    .filter(({ meta }) => meta.pool)
    .map(({ row, meta }) => ({
      score_id: row.id,
      created_by_user_id: row.user_id,
      pool_type: meta.pool,
      break_rule: meta.break,
      first_breaker_side: "player1",
      current_breaker_side: "player2",
      last_rack_winner_side: "player1",
    }));
  await insert("pool_game_settings", poolSettings);
  console.log(`Inserted ${poolSettings.length} pool settings`);

  // ---- trainings (two on the same day to show day-grouping in History)
  await insert("trainings", [
    { user_id: ids.marko, game: "Pool", title: "Break & run-out drill", training_date: day(-1), duration_minutes: 60, notes: "Worked on 9-ball break patterns, made 6/10 clean run-outs." },
    { user_id: ids.marko, game: "Pool", title: "Position play", training_date: day(-1), duration_minutes: 45, notes: "Three-rail position drills on the long side." },
    { user_id: ids.marko, game: "Ping Pong", title: "Serve practice", training_date: day(-3), duration_minutes: 40, notes: "Short backspin serves + fast serves to the corners." },
    { user_id: ids.marko, game: "Pool", title: "Straight stroke drill", training_date: day(-7), duration_minutes: 30, notes: null },
    { user_id: ids.marko, game: "Ping Pong", title: "Backhand loop session", training_date: day(-10), duration_minutes: 50, notes: "Multiball with Stefan, focus on consistency." },
    { user_id: ids.marko, game: "Pool", title: "Safety play", training_date: day(-15), duration_minutes: 75, notes: "Two-way shots and distance control." },
    { user_id: ids.marko, game: "Ping Pong", title: "Footwork drills", training_date: day(-20), duration_minutes: 35, notes: null },
    { user_id: ids.marko, game: "Pool", title: "Bank shots", training_date: day(-26), duration_minutes: 55, notes: "Cross-side and cross-corner banks." },
  ]);
  console.log("Inserted trainings");

  // ---- an in-progress live game (Marko vs Ana, 9-ball, mid-match)
  const liveGames = await insert("live_games", [
    {
      created_by_user_id: ids.marko,
      opponent_user_id: ids.ana,
      game: "Pool",
      score1: 4,
      score2: 3,
      date: day(0),
      started_at: minutesAgo(38),
    },
  ]);
  await insert("pool_game_settings", [
    {
      live_game_id: liveGames[0].id,
      created_by_user_id: ids.marko,
      pool_type: "9-ball",
      break_rule: "alternate",
      first_breaker_side: "player1",
      current_breaker_side: "player2",
      last_rack_winner_side: "player1",
    },
  ]);
  console.log("Inserted live game");

  console.log(`\nDone. Login: marko${DEMO_DOMAIN} / ${PASSWORD}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
