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

vi.mock("@/components/scores/ScoreDayList", () => ({
  ScoreDayList: ({ scores }: { scores: Array<{ id: string }> }) => <div>{`ScoreDayList-${scores.length}`}</div>,
}));

vi.mock("@/components/trainings/TrainingDayList", () => ({
  TrainingDayList: ({
    trainings,
    onTrainingUpdated,
  }: {
    trainings: Array<{ id: string }>;
    onTrainingUpdated?: () => void;
  }) => (
    <button type="button" onClick={() => onTrainingUpdated?.()}>
      {`TrainingDayList-${trainings.length}`}
    </button>
  ),
}));

import { HistoryPage } from "@/components/pages/HistoryPage";
import { queryClient } from "@/lib/queryClient";

function renderHistoryPage(view: "score" | "training", initialEntries: string[] = ["/"]) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={initialEntries}>
        <HistoryPage view={view} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

function openSearch() {
  fireEvent.click(screen.getByRole("button", { name: "Search" }));
}

describe("HistoryPage", () => {
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
    useAuthMock.mockReturnValue({ isAuthenticated: true, user: { id: "user-1" } });
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", game: "Pool", opponent_name: "Ana", friend_name: null, date: "2026-07-06", user_id: "user-1", score: "5-1" },
    ]);
    getTrainingsByUserIdMock.mockResolvedValue([
      { id: "t1", game: "Pool", title: "Drill", notes: "notes" },
    ]);
  });

  it("renders score history view with day list", async () => {
    renderHistoryPage("score");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });
  });

  it("renders training history view with day list", async () => {
    renderHistoryPage("training");

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "History" })).toBeInTheDocument();
      expect(screen.getByText("TrainingDayList-1")).toBeInTheDocument();
    });
  });

  it("handles unauthenticated state", async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false, user: null });
    renderHistoryPage("score");

    await waitFor(() => {
      expect(getScoresByUserIdMock).not.toHaveBeenCalled();
      expect(screen.getByText("No games recorded yet")).toBeInTheDocument();
    });
  });

  it("filters scores via the search toggle", async () => {
    renderHistoryPage("score");

    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });

    openSearch();
    fireEvent.change(screen.getByPlaceholderText("Search by opponent name..."), { target: { value: "nobody" } });
    await waitFor(() => {
      expect(screen.getByText("No games match your filters")).toBeInTheDocument();
    });
  });

  it("filters scores by opponent chip and toggles it off", async () => {
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", game: "Pool", opponent_name: "Ana", friend_name: null, date: "2026-07-06", user_id: "user-1", score: "5-1" },
      { id: "s2", game: "Pool", opponent_name: "Marko", friend_name: null, date: "2026-07-06", user_id: "user-1", score: "2-5" },
    ]);
    renderHistoryPage("score");

    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Marko" }));
    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Marko" }));
    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-2")).toBeInTheDocument();
    });
  });

  it("filters by game chip", async () => {
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", game: "Pool", opponent_name: "Ana", friend_name: null, date: "2026-07-06", user_id: "user-1", score: "5-1" },
      { id: "s2", game: "Ping Pong", opponent_name: "Marko", friend_name: null, date: "2026-07-05", user_id: "user-1", score: "11-8" },
    ]);
    renderHistoryPage("score");

    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-2")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Ping Pong" }));
    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });
  });

  it("reads game and opponent filters from the URL", async () => {
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", game: "Pool", opponent_name: "Ana", friend_name: null, date: "2026-07-06", user_id: "user-1", score: "5-1" },
      { id: "s2", game: "Ping Pong", opponent_name: "Marko", friend_name: null, date: "2026-07-05", user_id: "user-1", score: "11-8" },
    ]);
    renderHistoryPage("score", ["/history/score?game=Pool&opponent=Ana"]);

    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });
  });

  it("filters to close games via the URL and clears with the chip", async () => {
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", game: "Pool", opponent_name: "Ana", friend_name: null, date: "2026-07-06", user_id: "user-1", score: "5-4" },
      { id: "s2", game: "Pool", opponent_name: "Ana", friend_name: null, date: "2026-07-05", user_id: "user-1", score: "7-1" },
    ]);
    renderHistoryPage("score", ["/history/score?close=1"]);

    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Close games (≤2)" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Close games (≤2)" }));
    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-2")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Close games (≤2)" })).not.toBeInTheDocument();
    });
  });

  it("updates training search and training callback reloads data", async () => {
    renderHistoryPage("training");

    await waitFor(() => {
      expect(screen.getByText("TrainingDayList-1")).toBeInTheDocument();
    });

    openSearch();
    const trainingSearchInput = screen.getByPlaceholderText("Search by training name or notes...");
    fireEvent.change(trainingSearchInput, { target: { value: "not-found" } });
    await waitFor(() => {
      expect(screen.getByText("No trainings match your filters")).toBeInTheDocument();
    });

    fireEvent.change(trainingSearchInput, { target: { value: "" } });
    fireEvent.click(screen.getByText("TrainingDayList-1"));

    await waitFor(() => {
      expect(getTrainingsByUserIdMock).toHaveBeenCalledTimes(1);
    });
  });

  it("handles history load errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getScoresByUserIdMock.mockRejectedValueOnce(new Error("history failed"));

    renderHistoryPage("score");

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Failed to load history data:", expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it("covers score friend-name search and training notes fallback branches", async () => {
    getScoresByUserIdMock.mockResolvedValueOnce([
      { id: "s1", game: "Pool", opponent_name: null, friend_name: "Friend Ana", date: "2026-07-06", user_id: "user-1", score: "5-1" },
    ]);
    getTrainingsByUserIdMock.mockResolvedValueOnce([
      { id: "t1", game: "Pool", title: "Drill", notes: null },
    ]);

    const scoreView = renderHistoryPage("score");

    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });
    openSearch();
    fireEvent.change(screen.getByPlaceholderText("Search by opponent name..."), { target: { value: "friend" } });
    await waitFor(() => {
      expect(screen.getByText("ScoreDayList-1")).toBeInTheDocument();
    });

    scoreView.unmount();
    renderHistoryPage("training");
    await waitFor(() => {
      expect(screen.getByText("TrainingDayList-1")).toBeInTheDocument();
    });
    openSearch();
    fireEvent.change(screen.getByPlaceholderText("Search by training name or notes..."), { target: { value: "x" } });
    await waitFor(() => {
      expect(screen.getByText("No trainings match your filters")).toBeInTheDocument();
    });
  });

  it("shows no trainings recorded message when list is empty", async () => {
    getTrainingsByUserIdMock.mockResolvedValueOnce([]);
    renderHistoryPage("training");
    await waitFor(() => {
      expect(screen.getByText("No trainings recorded yet")).toBeInTheDocument();
    });
  });

  it("filters training list by notes text", async () => {
    getTrainingsByUserIdMock.mockResolvedValueOnce([
      { id: "t1", game: "Pool", title: "Drill", notes: "serve practice" },
    ]);
    renderHistoryPage("training");
    await waitFor(() => {
      expect(screen.getByText("TrainingDayList-1")).toBeInTheDocument();
    });
    openSearch();
    fireEvent.change(screen.getByPlaceholderText("Search by training name or notes..."), { target: { value: "serve" } });
    await waitFor(() => {
      expect(screen.getByText("TrainingDayList-1")).toBeInTheDocument();
    });
  });
});
