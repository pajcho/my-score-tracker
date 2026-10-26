import { describe, expect, it } from "vitest";
import { getStreakTier, getWinningStreak } from "@/components/scores/rackHistory";

describe("getWinningStreak", () => {
  it("counts only the trailing run of the latest winner", () => {
    expect(getWinningStreak([])).toBeNull();
    expect(getWinningStreak(["player2", "player2", "player1"])).toEqual({ side: "player1", length: 1 });
    expect(getWinningStreak(["player2", "player1", "player2", "player2", "player2"])).toEqual({
      side: "player2",
      length: 3,
    });
  });
});

describe("getStreakTier", () => {
  it("unlocks a nastier taunt with every extra win and the mix from five on", () => {
    expect(getStreakTier(1)).toBeNull();
    expect(getStreakTier(2)).toEqual({ label: "Double!", tauntEmojis: ["💩"], allowsMix: false });
    expect(getStreakTier(3)?.tauntEmojis).toEqual(["💩", "🖕"]);
    expect(getStreakTier(4)).toEqual({ label: "Quadra!", tauntEmojis: ["💩", "🖕", "🍆"], allowsMix: false });
    expect(getStreakTier(5)).toEqual({ label: "K.O.!", tauntEmojis: ["💩", "🖕", "🍆"], allowsMix: true });
    expect(getStreakTier(8)?.label).toBe("K.O.!");
  });
});
