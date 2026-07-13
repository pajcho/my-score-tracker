import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ScoreboardMode } from "@/components/scores/ScoreboardMode";
import type { LiveGameView } from "@/lib/supabaseDatabase";

const baseGame = {
  id: "live-1",
  created_by_user_id: "user-1",
  game: "Pool",
  opponent_name: null,
  opponent_user_id: "friend-1",
  score1: 2,
  score2: 1,
  date: "2026-07-13",
  started_at: "2026-07-13T18:00:00.000Z",
  created_at: "2026-07-13T18:00:00.000Z",
  updated_at: "2026-07-13T18:00:00.000Z",
  creator_name: "Current User",
  opponent_user_name: "Mladen",
  pool_settings: {
    id: "settings-1",
    live_game_id: "live-1",
    score_id: null,
    created_by_user_id: "user-1",
    pool_type: "9-ball",
    break_rule: "alternate",
    first_breaker_side: "player1",
    current_breaker_side: "player2",
    last_rack_winner_side: null,
    created_at: "2026-07-13T18:00:00.000Z",
    updated_at: "2026-07-13T18:00:00.000Z",
  },
} as unknown as LiveGameView;

function renderBoard(overrides: Partial<React.ComponentProps<typeof ScoreboardMode>> = {}) {
  const onScore = vi.fn();
  const onClose = vi.fn();
  render(
    <ScoreboardMode
      game={baseGame}
      leftLabel="You"
      rightLabel="Mladen"
      onScore={onScore}
      onClose={onClose}
      {...overrides}
    />
  );
  return { onScore, onClose };
}

describe("ScoreboardMode", () => {
  it("shows both players, scores and game context", () => {
    renderBoard();

    expect(screen.getByText("You")).toBeInTheDocument();
    expect(screen.getByText("Mladen")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    // Rack 4 = 2 + 1 completed racks + 1; Mladen (player2) breaks next.
    expect(screen.getByText(/Rack 4/)).toBeInTheDocument();
    expect(screen.getByText(/Mladen breaks/)).toBeInTheDocument();
  });

  it("scores a point when a half is tapped", () => {
    const { onScore } = renderBoard();

    fireEvent.click(screen.getByRole("button", { name: /Score for You: 2/ }));
    expect(onScore).toHaveBeenCalledWith("player1", 1);
  });

  it("removes a point via the minus chip without also scoring the half", () => {
    const { onScore } = renderBoard();

    fireEvent.click(screen.getByRole("button", { name: "Remove point for Mladen" }));
    expect(onScore).toHaveBeenCalledTimes(1);
    expect(onScore).toHaveBeenCalledWith("player2", -1);
  });

  it("closes via the X button and via Escape", () => {
    const { onClose } = renderBoard();

    fireEvent.click(screen.getByRole("button", { name: "Exit fullscreen scoreboard" }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("flips the board when the context pill is tapped", () => {
    renderBoard();

    const pill = screen.getByRole("button", { name: "Flip scoreboard to face the opponent" });
    const board = screen.getByText("2").closest("div[class*='flex-1']")?.parentElement;
    fireEvent.click(pill);
    expect(board?.className).toContain("rotate-180");
  });
});
