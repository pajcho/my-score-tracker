import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMockHarness, type SupabaseMockHarness } from "@/test/supabaseMock";

let harness: SupabaseMockHarness;
let supabaseDb: typeof import("@/lib/supabaseDatabase").supabaseDb;

describe("supabaseDb", () => {
  beforeEach(async () => {
    vi.resetModules();
    harness = createSupabaseMockHarness();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: harness.supabase,
    }));
    ({ supabaseDb } = await import("@/lib/supabaseDatabase"));
  });

  it("creates a score for authenticated users", async () => {
    const scoresBuilder = harness.getBuilder("scores");
    scoresBuilder.single.mockResolvedValue({
      data: { id: "score-1", user_id: "user-1", score: "7-5", game: "Pool" },
      error: null,
    });

    const createdScore = await supabaseDb.createScore("Pool", "Nikola", "7-5", "2026-02-14");

    expect(createdScore.id).toBe("score-1");
    expect(scoresBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: "user-1",
        game: "Pool",
        opponent_name: "Nikola",
        opponent_user_id: null,
        score: "7-5",
      })
    );
  });

  it("throws when trying to create score without authenticated user", async () => {
    harness.supabase.auth.getUser.mockResolvedValue({ data: { user: null } });
    await expect(supabaseDb.createScore("Pool", null, "7-5", "2026-02-14")).rejects.toThrow("User not authenticated");
  });

  it("enriches scores with friend names and pool settings", async () => {
    const scoresBuilder = harness.getBuilder("scores");
    const profilesBuilder = harness.getBuilder("profiles");
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");

    scoresBuilder.order.mockReturnValue(scoresBuilder);
    scoresBuilder.order.mockReturnValueOnce(scoresBuilder).mockReturnValueOnce(
      Promise.resolve({
        data: [
          {
            id: "score-1",
            user_id: "user-1",
            opponent_user_id: "friend-1",
            opponent_name: null,
            game: "Pool",
            score: "5-3",
          },
        ],
        error: null,
      })
    );

    profilesBuilder.in.mockResolvedValue({
      data: [{ user_id: "friend-1", name: "Friend Name" }],
      error: null,
    });

    poolSettingsBuilder.in.mockReturnValue({
      ...poolSettingsBuilder,
      select: vi.fn().mockReturnValue({
        ...poolSettingsBuilder,
        in: vi.fn().mockResolvedValue({
          data: [{ score_id: "score-1", pool_type: "9-ball" }],
          error: null,
        }),
      }),
    } as never);

    poolSettingsBuilder.select.mockReturnValue({
      ...poolSettingsBuilder,
      in: vi.fn().mockResolvedValue({
        data: [{ score_id: "score-1", pool_type: "9-ball" }],
        error: null,
      }),
    } as never);

    const scores = await supabaseDb.getScoresByUserId();

    expect(scores).toHaveLength(1);
    expect(scores[0].friend_name).toBe("Friend Name");
    expect(scores[0].pool_settings?.pool_type).toBe("9-ball");
  });

  it("enriches score friend name when current user is opponent", async () => {
    const scoresBuilder = harness.getBuilder("scores");
    const profilesBuilder = harness.getBuilder("profiles");

    scoresBuilder.order.mockReturnValue(scoresBuilder);
    scoresBuilder.order.mockReturnValueOnce(scoresBuilder).mockReturnValueOnce(
      Promise.resolve({
        data: [
          {
            id: "score-2",
            user_id: "friend-2",
            opponent_user_id: "user-1",
            opponent_name: null,
            game: "Pool",
            score: "3-5",
          },
        ],
        error: null,
      })
    );
    profilesBuilder.in.mockResolvedValue({
      data: [{ user_id: "friend-2", name: "Creator Name" }],
      error: null,
    });

    const scores = await supabaseDb.getScoresByUserId();
    expect(scores[0].friend_name).toBe("Creator Name");
  });

  it("updates score using only allowed fields", async () => {
    const scoresBuilder = harness.getBuilder("scores");

    await supabaseDb.updateScore("score-1", {
      id: "blocked",
      user_id: "blocked",
      score: "11-8",
      game: "Pool",
    } as never);

    expect(scoresBuilder.update).toHaveBeenCalledWith({
      score: "11-8",
      game: "Pool",
    });
  });

  it("updates score pool settings when settings already exist", async () => {
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    poolSettingsBuilder.maybeSingle.mockResolvedValue({
      data: { id: "existing-1" },
      error: null,
    });

    await supabaseDb.setScorePoolType("score-1", "8-ball");

    expect(poolSettingsBuilder.update).toHaveBeenCalledWith({ pool_type: "8-ball" });
  });

  it("inserts score pool settings when settings do not exist", async () => {
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    poolSettingsBuilder.maybeSingle.mockResolvedValue({
      data: null,
      error: null,
    });

    await supabaseDb.setScorePoolType("score-1", "10-ball");

    expect(poolSettingsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        score_id: "score-1",
        pool_type: "10-ball",
        created_by_user_id: "user-1",
      })
    );
  });

  it("collects and sorts unique opponents from names and friend profiles", async () => {
    const scoresBuilder = harness.getBuilder("scores");
    const profilesBuilder = harness.getBuilder("profiles");

    scoresBuilder.eq.mockResolvedValue({
      data: [
        { opponent_name: "Branko", opponent_user_id: null },
        { opponent_name: null, opponent_user_id: "friend-1" },
      ],
      error: null,
    });

    profilesBuilder.in.mockResolvedValue({
      data: [{ name: "Ana" }],
      error: null,
    });

    const opponents = await supabaseDb.getUniqueOpponents();
    expect(opponents).toEqual(["Ana", "Branko"]);
  });

  it("trims training notes before create", async () => {
    const trainingsBuilder = harness.getBuilder("trainings");
    trainingsBuilder.single.mockResolvedValue({
      data: { id: "training-1", title: "Session", notes: "notes" },
      error: null,
    });

    await supabaseDb.createTraining("Pool", "Session", "2026-02-14", 60, " notes ");
    expect(trainingsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        notes: "notes",
      })
    );
  });

  it("creates pool live game and pool settings", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    liveGamesBuilder.single.mockResolvedValue({
      data: { id: "live-1", game: "Pool" },
      error: null,
    });

    await supabaseDb.createLiveGame("Pool", null, "2026-02-14", undefined, {
      pool_type: "9-ball",
      break_rule: "alternate",
      first_breaker_side: "player1",
      current_breaker_side: "player1",
      last_rack_winner_side: null,
    });

    expect(poolSettingsBuilder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        live_game_id: "live-1",
        pool_type: "9-ball",
      })
    );
  });

  it("updates live game score and pool settings patch", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");

    await supabaseDb.updateLiveGameScore("live-1", 6, 4, {
      current_breaker_side: "player2",
    });

    expect(liveGamesBuilder.update).toHaveBeenCalledWith({ score1: 6, score2: 4 });
    expect(poolSettingsBuilder.update).toHaveBeenCalledWith({ current_breaker_side: "player2" });
  });

  it("updates live game score with full pool patch payload", async () => {
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    await supabaseDb.updateLiveGameScore("live-1", 8, 6, {
      pool_type: "9-ball",
      break_rule: "winner_stays",
      first_breaker_side: "player1",
      current_breaker_side: "player2",
      last_rack_winner_side: "player2",
    });
    expect(poolSettingsBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({
        pool_type: "9-ball",
        break_rule: "winner_stays",
        first_breaker_side: "player1",
        current_breaker_side: "player2",
        last_rack_winner_side: "player2",
      })
    );
  });

  it("completes live game by creating score, transferring pool settings and deleting live game", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    const createScoreSpy = vi.spyOn(supabaseDb, "createScore").mockResolvedValue({
      id: "score-1",
    } as never);
    const deleteLiveGameSpy = vi.spyOn(supabaseDb, "deleteLiveGame").mockResolvedValue();

    liveGamesBuilder.single.mockResolvedValue({
      data: {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Pool",
        opponent_name: "Opponent",
        opponent_user_id: null,
        score1: 7,
        score2: 3,
        date: "2026-02-14",
      },
      error: null,
    });

    await supabaseDb.completeLiveGame("live-1");

    expect(createScoreSpy).toHaveBeenCalledWith("Pool", "Opponent", "7-3", "2026-02-14", undefined);
    expect(poolSettingsBuilder.update).toHaveBeenCalledWith({ score_id: "score-1", live_game_id: null });
    expect(deleteLiveGameSpy).toHaveBeenCalledWith("live-1");
  });

  it("passes opponent user id through when completing live game", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    const createScoreSpy = vi.spyOn(supabaseDb, "createScore").mockResolvedValue({
      id: "score-opponent",
    } as never);
    const deleteLiveGameSpy = vi.spyOn(supabaseDb, "deleteLiveGame").mockResolvedValue();

    liveGamesBuilder.single.mockResolvedValueOnce({
      data: {
        id: "live-opponent",
        created_by_user_id: "user-1",
        game: "Ping Pong",
        opponent_name: null,
        opponent_user_id: "friend-7",
        score1: 11,
        score2: 9,
        date: "2026-02-14",
      },
      error: null,
    });

    await supabaseDb.completeLiveGame("live-opponent");
    expect(createScoreSpy).toHaveBeenCalledWith("Ping Pong", null, "11-9", "2026-02-14", "friend-7");
    expect(deleteLiveGameSpy).toHaveBeenCalledWith("live-opponent");
  });

  it("subscribes to live game channel and unsubscribes with removeChannel", () => {
    const onChangeSpy = vi.fn();
    const unsubscribe = supabaseDb.subscribeToLiveGames(onChangeSpy);
    const channel = harness.supabase.channel.mock.results[0].value as {
      on: ReturnType<typeof vi.fn>;
    };
    const callback = channel.on.mock.calls[0][2] as () => void;
    callback();
    expect(onChangeSpy).toHaveBeenCalledTimes(1);

    expect(harness.supabase.channel).toHaveBeenCalled();
    unsubscribe();
    expect(harness.supabase.removeChannel).toHaveBeenCalled();
  });

  it("deletes account through rpc", async () => {
    harness.supabase.rpc.mockResolvedValue({ data: true, error: null });
    await supabaseDb.deleteAccount();
    expect(harness.supabase.rpc).toHaveBeenCalledWith("delete_user_account");
  });

  it("throws when deleting score without authenticated user", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.deleteScore("score-1")).rejects.toThrow("User not authenticated");
  });

  it("deletes score for authenticated user", async () => {
    const scoresBuilder = harness.getBuilder("scores");
    await supabaseDb.deleteScore("score-1");
    expect(scoresBuilder.delete).toHaveBeenCalled();
    expect(scoresBuilder.eq).toHaveBeenCalledWith("id", "score-1");
  });

  it("deletes score pool settings", async () => {
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    await supabaseDb.deleteScorePoolSettings("score-1");
    expect(poolSettingsBuilder.delete).toHaveBeenCalled();
  });

  it("gets, updates and deletes trainings", async () => {
    const trainingsBuilder = harness.getBuilder("trainings");
    trainingsBuilder.order.mockReturnValueOnce(trainingsBuilder).mockReturnValueOnce(
      Promise.resolve({ data: [{ id: "training-1" }], error: null })
    );

    const trainings = await supabaseDb.getTrainingsByUserId();
    expect(trainings).toHaveLength(1);

    await supabaseDb.updateTraining("training-1", {
      id: "blocked",
      title: "Updated",
      duration_minutes: 70,
    } as never);
    expect(trainingsBuilder.update).toHaveBeenCalledWith({
      title: "Updated",
      duration_minutes: 70,
    });

    await supabaseDb.deleteTraining("training-1");
    expect(trainingsBuilder.delete).toHaveBeenCalled();
  });

  it("updates profile and maps rpc friends", async () => {
    const profilesBuilder = harness.getBuilder("profiles");
    harness.supabase.rpc.mockResolvedValueOnce({
      data: [{ friend_id: "friend-1", friend_name: "Ana", friend_email: "ana@example.com" }],
      error: null,
    });

    await supabaseDb.updateProfile("Nikola", "nikola@example.com");
    expect(profilesBuilder.update).toHaveBeenCalledWith({ name: "Nikola", email: "nikola@example.com" });

    const friends = await supabaseDb.getFriends();
    expect(friends).toEqual([{ id: "friend-1", name: "Ana", email: "ana@example.com" }]);
  });

  it("creates non-pool live game without inserting pool settings", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    liveGamesBuilder.single.mockResolvedValue({
      data: { id: "live-2", game: "Ping Pong" },
      error: null,
    });

    await supabaseDb.createLiveGame("Ping Pong", "Opponent", "2026-02-14");
    expect(poolSettingsBuilder.insert).not.toHaveBeenCalled();
  });

  it("updates live game score without pool patch", async () => {
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    await supabaseDb.updateLiveGameScore("live-1", 1, 2);
    expect(poolSettingsBuilder.update).not.toHaveBeenCalled();
  });

  it("throws when deleting live game returns error", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    liveGamesBuilder.eq.mockResolvedValueOnce({
      error: new Error("delete failed"),
    });
    await expect(supabaseDb.deleteLiveGame("live-1")).rejects.toThrow("delete failed");
  });

  it("maps live games with profile names and pool settings", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    const profilesBuilder = harness.getBuilder("profiles");
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");

    liveGamesBuilder.order.mockResolvedValue({
      data: [
        {
          id: "live-1",
          created_by_user_id: "user-1",
          opponent_user_id: "friend-1",
          game: "Pool",
        },
      ],
      error: null,
    });
    profilesBuilder.in.mockResolvedValue({
      data: [
        { user_id: "user-1", name: "Owner" },
        { user_id: "friend-1", name: "Friend" },
      ],
      error: null,
    });
    poolSettingsBuilder.in.mockResolvedValue({
      data: [{ live_game_id: "live-1", pool_type: "8-ball" }],
      error: null,
    });

    const liveGames = await supabaseDb.getLiveGames();
    expect(liveGames[0].creator_name).toBe("Owner");
    expect(liveGames[0].opponent_user_name).toBe("Friend");
    expect(liveGames[0].pool_settings?.pool_type).toBe("8-ball");
  });

  it("rejects completion when non-creator tries to save live game", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    liveGamesBuilder.single.mockResolvedValue({
      data: {
        id: "live-1",
        created_by_user_id: "user-2",
        game: "Pool",
      },
      error: null,
    });
    await expect(supabaseDb.completeLiveGame("live-1")).rejects.toThrow(
      "Only the game creator can save the final score"
    );
  });

  it("rejects completion for unsupported live game type", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    liveGamesBuilder.single.mockResolvedValue({
      data: {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Chess",
      },
      error: null,
    });
    await expect(supabaseDb.completeLiveGame("live-1")).rejects.toThrow("Unsupported live game type: Chess");
  });

  it("throws when live game is not found during completion", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    liveGamesBuilder.single.mockResolvedValue({
      data: null,
      error: null,
    });
    await expect(supabaseDb.completeLiveGame("live-1")).rejects.toThrow("Live game not found");
  });

  it("throws when completing live game returns query error", async () => {
    const liveGamesBuilder = harness.getBuilder("live_games");
    liveGamesBuilder.single.mockResolvedValue({
      data: null,
      error: new Error("query failed"),
    });
    await expect(supabaseDb.completeLiveGame("live-1")).rejects.toThrow("query failed");
  });

  it("throws when delete account is called unauthenticated", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.deleteAccount()).rejects.toThrow("User not authenticated");
  });

  it("throws when create score insert fails", async () => {
    const scoresBuilder = harness.getBuilder("scores");
    scoresBuilder.single.mockResolvedValueOnce({
      data: null,
      error: new Error("create score failed"),
    });
    await expect(supabaseDb.createScore("Pool", "Opponent", "7-5", "2026-02-14")).rejects.toThrow("create score failed");
  });

  it("covers unauthenticated and error branches for score/training/profile methods", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.getScoresByUserId()).rejects.toThrow("User not authenticated");

    const scoresBuilder = harness.getBuilder("scores");
    scoresBuilder.order.mockReturnValue(scoresBuilder);
    scoresBuilder.order.mockReturnValueOnce(scoresBuilder).mockReturnValueOnce(
      Promise.resolve({ data: null, error: new Error("scores failed") })
    );
    await expect(supabaseDb.getScoresByUserId()).rejects.toThrow("scores failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.updateScore("score-1", { score: "1-0" } as never)).rejects.toThrow("User not authenticated");
    scoresBuilder.update.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("update score failed") }),
      }),
    } as never);
    await expect(supabaseDb.updateScore("score-1", { score: "1-0" } as never)).rejects.toThrow("update score failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.updateProfile("Name", "email@example.com")).rejects.toThrow("User not authenticated");
    const profilesBuilder = harness.getBuilder("profiles");
    profilesBuilder.eq.mockResolvedValueOnce({ error: new Error("update profile failed") });
    await expect(supabaseDb.updateProfile("Name", "email@example.com")).rejects.toThrow("update profile failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.getTrainingsByUserId()).rejects.toThrow("User not authenticated");
    const trainingsBuilder = harness.getBuilder("trainings");
    trainingsBuilder.order.mockReturnValueOnce(trainingsBuilder).mockReturnValueOnce(
      Promise.resolve({ data: null, error: new Error("trainings failed") })
    );
    await expect(supabaseDb.getTrainingsByUserId()).rejects.toThrow("trainings failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.updateTraining("t1", { title: "t" } as never)).rejects.toThrow("User not authenticated");
    trainingsBuilder.update.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("update training failed") }),
      }),
    } as never);
    await expect(supabaseDb.updateTraining("t1", { title: "t" } as never)).rejects.toThrow("update training failed");
  });

  it("covers set/delete pool settings error branches", async () => {
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.setScorePoolType("score-1", "8-ball")).rejects.toThrow("User not authenticated");

    poolSettingsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: new Error("existing settings failed"),
    });
    await expect(supabaseDb.setScorePoolType("score-1", "8-ball")).rejects.toThrow("existing settings failed");

    poolSettingsBuilder.maybeSingle.mockResolvedValueOnce({
      data: { id: "existing" },
      error: null,
    });
    poolSettingsBuilder.update.mockReturnValueOnce({
      eq: vi.fn().mockResolvedValue({ error: new Error("update settings failed") }),
    } as never);
    await expect(supabaseDb.setScorePoolType("score-1", "8-ball")).rejects.toThrow("update settings failed");

    poolSettingsBuilder.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    poolSettingsBuilder.insert.mockResolvedValueOnce({ error: new Error("insert settings failed") });
    await expect(supabaseDb.setScorePoolType("score-1", "8-ball")).rejects.toThrow("insert settings failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.deleteScorePoolSettings("score-1")).rejects.toThrow("User not authenticated");
    poolSettingsBuilder.delete.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("delete settings failed") }),
      }),
    } as never);
    await expect(supabaseDb.deleteScorePoolSettings("score-1")).rejects.toThrow("delete settings failed");
  });

  it("covers get unique opponents/create training/delete training/get friends auth and error branches", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.getUniqueOpponents()).rejects.toThrow("User not authenticated");

    const scoresBuilder = harness.getBuilder("scores");
    scoresBuilder.eq.mockResolvedValueOnce({ data: null, error: new Error("opponents failed") });
    await expect(supabaseDb.getUniqueOpponents()).rejects.toThrow("opponents failed");

    const profilesBuilder = harness.getBuilder("profiles");
    scoresBuilder.eq.mockResolvedValueOnce({
      data: [{ opponent_name: null, opponent_user_id: "friend-1" }],
      error: null,
    });
    profilesBuilder.in.mockResolvedValueOnce({ data: [], error: null });
    await expect(supabaseDb.getUniqueOpponents()).resolves.toEqual([]);

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.createTraining("Pool", "Session", "2026-02-14", 60, " ")).rejects.toThrow("User not authenticated");
    const trainingsBuilder = harness.getBuilder("trainings");
    trainingsBuilder.single.mockResolvedValueOnce({ data: null, error: new Error("create training failed") });
    await expect(supabaseDb.createTraining("Pool", "Session", "2026-02-14", 60, "")).rejects.toThrow("create training failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.deleteTraining("t1")).rejects.toThrow("User not authenticated");
    trainingsBuilder.delete.mockReturnValueOnce({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: new Error("delete training failed") }),
      }),
    } as never);
    await expect(supabaseDb.deleteTraining("t1")).rejects.toThrow("delete training failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.getFriends()).rejects.toThrow("User not authenticated");
    harness.supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("friends rpc failed") });
    await expect(supabaseDb.getFriends()).rejects.toThrow("friends rpc failed");
  });

  it("covers live game create/get/update/complete/delete and delete account error branches", async () => {
    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.createLiveGame("Pool", "Opponent", "2026-02-14")).rejects.toThrow("User not authenticated");

    const liveGamesBuilder = harness.getBuilder("live_games");
    liveGamesBuilder.single.mockResolvedValueOnce({ data: null, error: new Error("create live failed") });
    await expect(supabaseDb.createLiveGame("Pool", "Opponent", "2026-02-14")).rejects.toThrow("create live failed");

    liveGamesBuilder.single.mockResolvedValueOnce({ data: { id: "live-3", game: "Pool" }, error: null });
    const poolSettingsBuilder = harness.getBuilder("pool_game_settings");
    poolSettingsBuilder.insert.mockResolvedValueOnce({ error: new Error("pool settings create failed") });
    await expect(
      supabaseDb.createLiveGame("Pool", "Opponent", "2026-02-14", undefined, {
        pool_type: "8-ball",
        break_rule: "alternate",
        first_breaker_side: "player1",
        current_breaker_side: "player1",
        last_rack_winner_side: null,
      })
    ).rejects.toThrow("pool settings create failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.getLiveGames()).rejects.toThrow("User not authenticated");
    liveGamesBuilder.order.mockResolvedValueOnce({ data: null, error: new Error("get live failed") });
    await expect(supabaseDb.getLiveGames()).rejects.toThrow("get live failed");

    liveGamesBuilder.order.mockResolvedValueOnce({
      data: [{ id: "live-1", created_by_user_id: "user-1", opponent_user_id: null }],
      error: null,
    });
    const profilesBuilder = harness.getBuilder("profiles");
    profilesBuilder.in.mockResolvedValueOnce({ data: null, error: new Error("profiles failed") });
    await expect(supabaseDb.getLiveGames()).rejects.toThrow("profiles failed");

    liveGamesBuilder.order.mockResolvedValueOnce({
      data: [{ id: "live-1", created_by_user_id: "user-1", opponent_user_id: null }],
      error: null,
    });
    profilesBuilder.in.mockResolvedValueOnce({ data: [{ user_id: "user-1", name: "Owner" }], error: null });
    poolSettingsBuilder.in.mockResolvedValueOnce({ data: null, error: new Error("pool settings failed") });
    await expect(supabaseDb.getLiveGames()).rejects.toThrow("pool settings failed");

    liveGamesBuilder.eq.mockResolvedValueOnce({ error: new Error("update live failed") });
    await expect(supabaseDb.updateLiveGameScore("live-1", 1, 2)).rejects.toThrow("update live failed");
    poolSettingsBuilder.eq.mockResolvedValueOnce({ error: new Error("update live settings failed") });
    await expect(
      supabaseDb.updateLiveGameScore("live-1", 1, 2, { current_breaker_side: "player2" })
    ).rejects.toThrow("update live settings failed");

    harness.supabase.auth.getUser.mockResolvedValueOnce({ data: { user: null } });
    await expect(supabaseDb.completeLiveGame("live-1")).rejects.toThrow("User not authenticated");
    liveGamesBuilder.single.mockResolvedValueOnce({
      data: {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Ping Pong",
        opponent_name: "Opponent",
        opponent_user_id: null,
        score1: 3,
        score2: 1,
        date: "2026-02-14",
      },
      error: null,
    });
    const deleteLiveGameSpy = vi.spyOn(supabaseDb, "deleteLiveGame").mockResolvedValue();
    await expect(supabaseDb.completeLiveGame("live-1")).resolves.toBeUndefined();
    expect(deleteLiveGameSpy).toHaveBeenCalledWith("live-1");

    liveGamesBuilder.single.mockResolvedValueOnce({
      data: {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Pool",
        opponent_name: "Opponent",
        opponent_user_id: null,
        score1: 7,
        score2: 5,
        date: "2026-02-14",
      },
      error: null,
    });
    vi.spyOn(supabaseDb, "createScore").mockResolvedValueOnce({ id: "score-transfer" } as never);
    poolSettingsBuilder.eq.mockResolvedValueOnce({ error: new Error("transfer failed") });
    await expect(supabaseDb.completeLiveGame("live-1")).rejects.toThrow("transfer failed");

    harness.supabase.rpc.mockResolvedValueOnce({ data: null, error: new Error("delete account failed") });
    await expect(supabaseDb.deleteAccount()).rejects.toThrow("delete account failed");
  });
});
