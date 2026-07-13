import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, getScoresByUserIdMock, getTrainingsByUserIdMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getScoresByUserIdMock: vi.fn(),
  getTrainingsByUserIdMock: vi.fn(),
}));

vi.mock("@/components/auth/authContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    getScoresByUserId: getScoresByUserIdMock,
    getTrainingsByUserId: getTrainingsByUserIdMock,
  },
}));

// The detail sheet pulls in the whole edit-form stack; the page only needs
// to hand it a score.
vi.mock("@/components/scores/ScoreDetailSheet", () => ({
  ScoreDetailSheet: ({ score }: { score: { id: string } | null }) =>
    score ? <div>{`ScoreDetailSheet-${score.id}`}</div> : null,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { StatisticsPage } from "@/components/pages/StatisticsPage";
import { queryClient } from "@/lib/queryClient";

function renderStatisticsPage(view: "score" | "training", initialEntries: string[] = ["/statistics/score"]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <StatisticsPage view={view} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

const isoDate = (offsetDays: number) => {
  const value = new Date();
  value.setDate(value.getDate() - offsetDays);
  return value.toISOString().slice(0, 10);
};

function seedScores() {
  getScoresByUserIdMock.mockResolvedValue([
    {
      id: "score-1",
      user_id: "user-1",
      game: "Pool",
      opponent_name: "Ana",
      friend_name: null,
      score: "7-5",
      date: isoDate(1),
      pool_settings: { pool_type: "8-ball" },
    },
    {
      id: "score-2",
      user_id: "user-2",
      game: "Ping Pong",
      opponent_name: "Ana",
      friend_name: null,
      score: "11-9",
      date: isoDate(1),
    },
    {
      id: "score-3",
      user_id: "user-1",
      game: "Pool",
      opponent_name: "Luka",
      friend_name: null,
      score: "7-0",
      date: isoDate(2),
      pool_settings: { pool_type: "9-ball" },
    },
    {
      id: "score-4",
      user_id: "user-1",
      game: "Pool",
      opponent_name: "Luka",
      friend_name: null,
      score: "0-7",
      date: isoDate(3),
      pool_settings: { pool_type: "8-ball" },
    },
  ]);
}

describe("StatisticsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    queryClient.setDefaultOptions({
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
    });
    useAuthMock.mockReturnValue({
      user: { id: "user-1" },
      profile: { user_id: "user-1" },
      isAuthenticated: true,
    });
    getScoresByUserIdMock.mockResolvedValue([]);
    getTrainingsByUserIdMock.mockResolvedValue([]);
  });

  it("renders no-data state for score view", async () => {
    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("No games found matching your filters")).toBeInTheDocument();
    });
  });

  it("renders the reordered score statistics sections", async () => {
    seedScores();
    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("Recent Form")).toBeInTheDocument();
    });
    expect(screen.getByText("Streaks")).toBeInTheDocument();
    expect(screen.getByText("Win rate · last 12 weeks")).toBeInTheDocument();
    expect(screen.getByText("Game Performance")).toBeInTheDocument();
    expect(screen.getByText("Activity Heatmap")).toBeInTheDocument();
    // Headline record tiles (no opponent selected).
    expect(screen.getByText("Total Games")).toBeInTheDocument();
    expect(screen.getByText("Win Rate")).toBeInTheDocument();
  });

  it("shows pool type chips only while Pool is the selected game", async () => {
    seedScores();
    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("Recent Form")).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: "8-Ball" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pool" }));
    expect(screen.getByRole("button", { name: "8-Ball" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "8-Ball" }));
    // score-1 and score-4 are 8-ball: 1 win, 1 loss of 2 games.
    expect(await screen.findByText("1 wins in 2 games for current filters")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Ping Pong" }));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "8-Ball" })).not.toBeInTheDocument();
    });
  });

  it("leads with a head-to-head card when an opponent chip is selected", async () => {
    seedScores();
    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("Recent Form")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Ana" }));

    await waitFor(() => {
      expect(screen.getByText("You vs Ana")).toBeInTheDocument();
    });
    expect(screen.getByText("Your form")).toBeInTheDocument();
    expect(screen.getByText("Ana's form")).toBeInTheDocument();
    // Headline record grid is replaced by the hero card.
    expect(screen.queryByText("Total Games")).not.toBeInTheDocument();

    // Tapping the active chip deselects and restores the record grid.
    fireEvent.click(screen.getByRole("button", { name: "Ana" }));
    await waitFor(() => {
      expect(screen.getByText("Total Games")).toBeInTheDocument();
    });
  });

  it("honors the opponent deep-link from FriendsPage", async () => {
    seedScores();
    renderStatisticsPage("score", ["/statistics/score?opponent=Ana"]);

    await waitFor(() => {
      expect(screen.getByText("You vs Ana")).toBeInTheDocument();
    });
  });

  it("opens the detail sheet from the best game row and links close games to History", async () => {
    seedScores();
    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("Game Performance")).toBeInTheDocument();
    });

    const closeGamesLink = screen.getByRole("link", { name: /Close games/ });
    expect(closeGamesLink).toHaveAttribute("href", "/history/score?close=1");

    fireEvent.click(screen.getByRole("button", { name: /Best game/ }));
    await waitFor(() => {
      // Best game is the 7-0 win vs Luka (score-3).
      expect(screen.getByText("ScoreDetailSheet-score-3")).toBeInTheDocument();
    });
  });

  it("renders training view statistics with chip filtering", async () => {
    getTrainingsByUserIdMock.mockResolvedValue([
      { id: "t1", game: "Pool", duration_minutes: 60, training_date: isoDate(1), title: "Drill" },
      { id: "t2", game: "Pool", duration_minutes: 30, training_date: isoDate(2), title: "Drill B" },
      { id: "t3", game: "Ping Pong", duration_minutes: 90, training_date: isoDate(4), title: "Session C" },
    ]);

    renderStatisticsPage("training", ["/statistics/training"]);

    await waitFor(() => {
      expect(screen.getByText("Analyze your training consistency and load")).toBeInTheDocument();
      expect(screen.getByText("Training Heatmap")).toBeInTheDocument();
    });
    // 60 + 30 + 90 minutes across all games.
    expect(screen.getByText("3.0h")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Pool" }));
    await waitFor(() => {
      // Only the two Pool sessions (90 minutes) remain.
      expect(screen.getByText("1.5h")).toBeInTheDocument();
    });
  });

  it("renders fallback when unauthenticated", async () => {
    useAuthMock.mockReturnValue({
      user: null,
      profile: null,
      isAuthenticated: false,
    });

    renderStatisticsPage("score");

    await waitFor(() => {
      expect(getScoresByUserIdMock).not.toHaveBeenCalled();
      expect(screen.getByText("No games found matching your filters")).toBeInTheDocument();
    });
  });

  it("handles score loading errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getScoresByUserIdMock.mockRejectedValueOnce(new Error("statistics failed"));

    renderStatisticsPage("score");

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Failed to load scores:", expect.any(Error));
    });
    errorSpy.mockRestore();
  });
});
