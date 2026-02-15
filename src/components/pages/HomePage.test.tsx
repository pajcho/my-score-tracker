import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, getScoresByUserIdMock, getLiveGamesMock, getTrainingsByUserIdMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getScoresByUserIdMock: vi.fn(),
  getLiveGamesMock: vi.fn(),
  getTrainingsByUserIdMock: vi.fn(),
}));

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/supabase-database", () => ({
  supabaseDb: {
    getScoresByUserId: getScoresByUserIdMock,
    getLiveGames: getLiveGamesMock,
    getTrainingsByUserId: getTrainingsByUserIdMock,
  },
}));

vi.mock("@/components/scores/ScoreForm", () => ({
  ScoreForm: ({ onCancel, onSuccess }: { onCancel: () => void; onSuccess: () => void }) => (
    <div>
      <button onClick={onSuccess} type="button">
        ScoreFormSuccess
      </button>
      <button onClick={onCancel} type="button">
        ScoreFormCancel
      </button>
    </div>
  ),
}));

vi.mock("@/components/scores/ScoreList", () => ({
  ScoreList: ({ onScoreUpdated }: { onScoreUpdated: () => void }) => (
    <button onClick={onScoreUpdated} type="button">
      ScoreListUpdate
    </button>
  ),
}));

vi.mock("@/components/trainings/TrainingForm", () => ({
  TrainingForm: ({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) => (
    <div>
      <button onClick={onSuccess} type="button">
        TrainingFormSuccess
      </button>
      <button onClick={onCancel} type="button">
        TrainingFormCancel
      </button>
    </div>
  ),
}));

vi.mock("@/components/trainings/TrainingCard", () => ({
  TrainingCard: ({ onTrainingUpdated }: { onTrainingUpdated: () => void }) => (
    <button onClick={onTrainingUpdated} type="button">
      TrainingCardUpdate
    </button>
  ),
}));

vi.mock("@/components/ui/game-type-icon", () => ({
  GameTypeIcon: () => <span>GameTypeIcon</span>,
}));

import { HomePage } from "@/components/pages/HomePage";
import { queryClient } from "@/lib/query-client";

function renderHomePage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("HomePage", () => {
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
      isAuthenticated: true,
      user: { id: "user-1" },
      profile: { name: "Nikola" },
    });
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", user_id: "user-1", score: "7-5", game: "Pool", opponent_name: "Ana" },
    ]);
    getLiveGamesMock.mockResolvedValue([{ id: "live-1" }]);
    getTrainingsByUserIdMock.mockResolvedValue([{ id: "t1", game: "Pool", duration_minutes: 40 }]);
  });

  it("loads dashboard data for authenticated user", async () => {
    renderHomePage();

    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText("Welcome back, Nikola!")).toBeInTheDocument();
      expect(screen.getAllByText("1")[0]).toBeInTheDocument();
    });
  });

  it("shows empty data when unauthenticated", async () => {
    useAuthMock.mockReturnValue({
      isAuthenticated: false,
      user: null,
      profile: null,
    });

    renderHomePage();

    await waitFor(() => {
      expect(getScoresByUserIdMock).not.toHaveBeenCalled();
      expect(screen.getByText("No scores recorded yet. Start your first game above!")).toBeInTheDocument();
    });
  });

  it("opens score form quick action", async () => {
    renderHomePage();

    fireEvent.click(screen.getAllByRole("button", { name: /add finished score/i })[0]);
    expect(screen.getByText("ScoreFormSuccess")).toBeInTheDocument();
  });

  it("opens training form quick action", () => {
    renderHomePage();

    fireEvent.click(screen.getAllByRole("button", { name: /add training/i })[0]);
    expect(screen.getByText("TrainingFormSuccess")).toBeInTheDocument();
  });

  it("handles dashboard load errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getScoresByUserIdMock.mockRejectedValueOnce(new Error("load failed"));

    renderHomePage();

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Failed to load scores:", expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it("handles score form success by reloading and closing quick action", async () => {
    renderHomePage();

    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: /add finished score/i })[0]);
    fireEvent.click(screen.getByText("ScoreFormSuccess"));

    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(2);
      expect(screen.queryByText("ScoreFormSuccess")).not.toBeInTheDocument();
    });
  });

  it("handles training form success by reloading and closing quick action", async () => {
    renderHomePage();

    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getAllByRole("button", { name: /add training/i })[0]);
    fireEvent.click(screen.getByText("TrainingFormSuccess"));

    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(1);
      expect(screen.queryByText("TrainingFormSuccess")).not.toBeInTheDocument();
    });
  });

  it("reloads from score and training update callbacks", async () => {
    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("ScoreListUpdate")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("ScoreListUpdate"));
    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(screen.getByRole("button", { name: "Trainings" }));
    await waitFor(() => {
      expect(screen.getByText("TrainingCardUpdate")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("TrainingCardUpdate"));
    await waitFor(() => {
      expect(getScoresByUserIdMock).toHaveBeenCalledTimes(2);
    });
  });

  it("handles score and training form cancel actions", () => {
    renderHomePage();

    fireEvent.click(screen.getAllByRole("button", { name: /add finished score/i })[0]);
    fireEvent.click(screen.getByText("ScoreFormCancel"));
    expect(screen.queryByText("ScoreFormSuccess")).not.toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /add training/i })[0]);
    fireEvent.click(screen.getByText("TrainingFormCancel"));
    expect(screen.queryByText("TrainingFormSuccess")).not.toBeInTheDocument();
  });

  it("covers win count invalid score and favorite game tie branch", async () => {
    getScoresByUserIdMock.mockResolvedValueOnce([
      { id: "s1", user_id: "user-1", score: "NaN-5", game: "Pool", opponent_name: "Ana" },
      { id: "s2", user_id: "user-1", score: "7-5", game: "Ping Pong", opponent_name: "Mika" },
      { id: "s3", user_id: "user-1", score: "7-5", game: "Pool", opponent_name: "Luka" },
      { id: "s4", user_id: "user-1", score: "7-5", game: "Ping Pong", opponent_name: "Iva" },
    ]);
    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("Welcome back, Nikola!")).toBeInTheDocument();
      expect(screen.getAllByText("Ping Pong").length).toBeGreaterThan(0);
    });
  });

  it("switches recent tabs back to scores", async () => {
    renderHomePage();

    await waitFor(() => {
      expect(screen.getByText("ScoreListUpdate")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Trainings" }));
    await waitFor(() => {
      expect(screen.getByText("TrainingCardUpdate")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Scores" }));
    await waitFor(() => {
      expect(screen.getByText("ScoreListUpdate")).toBeInTheDocument();
    });
  });

  it("covers opponent perspective win-rate branch and empty trainings tab message", async () => {
    getScoresByUserIdMock.mockResolvedValueOnce([
      { id: "s1", user_id: "user-2", score: "4-7", game: "Pool", opponent_name: "Ana" },
    ]);
    getTrainingsByUserIdMock.mockResolvedValueOnce([]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getAllByText("100%").length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByRole("button", { name: "Trainings" }));
    await waitFor(() => {
      expect(screen.getByText("No trainings recorded yet. Add your first training above.")).toBeInTheDocument();
    });
  });

  it("covers favorite game reducer branch with clear winner", async () => {
    getScoresByUserIdMock.mockResolvedValueOnce([
      { id: "s1", user_id: "user-1", score: "7-5", game: "Pool", opponent_name: "Ana" },
      { id: "s2", user_id: "user-1", score: "7-5", game: "Pool", opponent_name: "Mika" },
      { id: "s3", user_id: "user-1", score: "7-5", game: "Ping Pong", opponent_name: "Luka" },
    ]);

    renderHomePage();

    await waitFor(() => {
      expect(screen.getAllByText("Pool").length).toBeGreaterThan(0);
    });
  });
});
