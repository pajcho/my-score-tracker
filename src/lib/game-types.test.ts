import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_TYPE,
  DEFAULT_POOL_TYPE,
  getDisplayGameLabel,
  getGameTypeLabel,
  getPoolTypeLabel,
  isGameType,
  isPoolGameType,
} from "@/lib/game-types";

describe("game-types", () => {
  it("returns expected default values", () => {
    expect(DEFAULT_GAME_TYPE).toBe("Pool");
    expect(DEFAULT_POOL_TYPE).toBe("9-ball");
  });

  it("validates game types", () => {
    expect(isGameType("Pool")).toBe(true);
    expect(isGameType("Ping Pong")).toBe(true);
    expect(isGameType("Basketball")).toBe(false);
  });

  it("detects whether game type is pool", () => {
    expect(isPoolGameType("Pool")).toBe(true);
    expect(isPoolGameType("Ping Pong")).toBe(false);
  });

  it("resolves labels with fallback to source values", () => {
    expect(getGameTypeLabel("Pool")).toBe("Pool");
    expect(getGameTypeLabel("Unknown game")).toBe("Unknown game");
    expect(getPoolTypeLabel("10-ball")).toBe("10-Ball");
    expect(getPoolTypeLabel("mystery")).toBe("mystery");
  });

  it("builds display labels based on game and pool type", () => {
    expect(getDisplayGameLabel("Pool", "8-ball")).toBe("Pool (8-Ball)");
    expect(getDisplayGameLabel("Pool")).toBe("Pool");
    expect(getDisplayGameLabel("Ping Pong", "9-ball")).toBe("Ping Pong");
  });
});
