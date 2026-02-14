import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { useAuthMock, getScoresByUserIdMock, getTrainingsByUserIdMock } = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  getScoresByUserIdMock: vi.fn(),
  getTrainingsByUserIdMock: vi.fn(),
}));

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/supabase-database", () => ({
  supabaseDb: {
    getScoresByUserId: getScoresByUserIdMock,
    getTrainingsByUserId: getTrainingsByUserIdMock,
  },
}));

vi.mock("@/components/scores/ScoreList", () => ({
  ScoreList: ({ scores }: { scores: Array<{ id: string }> }) => <div>{`ScoreList-${scores.length}`}</div>,
}));

vi.mock("@/components/trainings/TrainingCard", () => ({
  TrainingCard: ({ onTrainingUpdated }: { onTrainingUpdated?: () => void }) => (
    <button type="button" onClick={() => onTrainingUpdated?.()}>
      TrainingCard
    </button>
  ),
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onValueChange?.("Pool")}>
        SelectPool
      </button>
      <button type="button" onClick={() => onValueChange?.("Chess")}>
        SelectChess
      </button>
      {children}
    </div>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectItem: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <div>{placeholder}</div>,
}));

import { HistoryPage } from "@/components/pages/HistoryPage";

describe("HistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuthMock.mockReturnValue({ isAuthenticated: true });
    getScoresByUserIdMock.mockResolvedValue([
      { id: "s1", game: "Pool", opponent_name: "Ana", friend_name: null },
    ]);
    getTrainingsByUserIdMock.mockResolvedValue([
      { id: "t1", game: "Pool", title: "Drill", notes: "notes" },
    ]);
  });

  it("renders score history view", async () => {
    render(
      <MemoryRouter>
        <HistoryPage view="score" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Score History")).toBeInTheDocument();
      expect(screen.getByText("ScoreList-1")).toBeInTheDocument();
    });
  });

  it("renders training history view", async () => {
    render(
      <MemoryRouter>
        <HistoryPage view="training" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("Training History")).toBeInTheDocument();
      expect(screen.getByText("TrainingCard")).toBeInTheDocument();
    });
  });

  it("handles unauthenticated state", async () => {
    useAuthMock.mockReturnValue({ isAuthenticated: false });
    render(
      <MemoryRouter>
        <HistoryPage view="score" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(getScoresByUserIdMock).not.toHaveBeenCalled();
      expect(screen.getByText("No games recorded yet")).toBeInTheDocument();
    });
  });

  it("updates score search term", async () => {
    render(
      <MemoryRouter>
        <HistoryPage view="score" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ScoreList-1")).toBeInTheDocument();
    });

    const searchInput = screen.getAllByPlaceholderText("Search by opponent name...")[0];
    fireEvent.change(searchInput, { target: { value: "nobody" } });
    await waitFor(() => {
      expect(screen.getByText("No games match your filters")).toBeInTheDocument();
    });
  });

  it("applies score and training game filters", async () => {
    const scoreView = render(
      <MemoryRouter>
        <HistoryPage view="score" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("ScoreList-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "SelectChess" })[0]);
    await waitFor(() => {
      expect(screen.getByText("No games match your filters")).toBeInTheDocument();
    });

    scoreView.unmount();

    render(
      <MemoryRouter>
        <HistoryPage view="training" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("TrainingCard")).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "SelectChess" })[0]);
    await waitFor(() => {
      expect(screen.getByText("No trainings match your filters")).toBeInTheDocument();
    });
  });

  it("updates training search and training callback reloads data", async () => {
    render(
      <MemoryRouter>
        <HistoryPage view="training" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("TrainingCard")).toBeInTheDocument();
    });

    const trainingSearchInput = screen.getByPlaceholderText("Search by training name or notes...");
    fireEvent.change(trainingSearchInput, { target: { value: "not-found" } });
    await waitFor(() => {
      expect(screen.getByText("No trainings match your filters")).toBeInTheDocument();
    });

    fireEvent.change(trainingSearchInput, { target: { value: "" } });
    fireEvent.click(screen.getByText("TrainingCard"));

    await waitFor(() => {
      expect(getTrainingsByUserIdMock).toHaveBeenCalledTimes(2);
    });
  });

  it("handles history load errors", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    getScoresByUserIdMock.mockRejectedValueOnce(new Error("history failed"));

    render(
      <MemoryRouter>
        <HistoryPage view="score" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalledWith("Failed to load history data:", expect.any(Error));
    });
    errorSpy.mockRestore();
  });

  it("covers score friend-name search and training notes fallback branches", async () => {
    getScoresByUserIdMock.mockResolvedValueOnce([
      { id: "s1", game: "Pool", opponent_name: null, friend_name: "Friend Ana" },
    ]);
    getTrainingsByUserIdMock.mockResolvedValueOnce([
      { id: "t1", game: "Pool", title: "Drill", notes: null },
    ]);

    const scoreView = render(
      <MemoryRouter>
        <HistoryPage view="score" />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText("ScoreList-1")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Search by opponent name..."), { target: { value: "friend" } });
    await waitFor(() => {
      expect(screen.getByText("ScoreList-1")).toBeInTheDocument();
    });

    scoreView.unmount();
    render(
      <MemoryRouter>
        <HistoryPage view="training" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("TrainingCard")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Search by training name or notes..."), { target: { value: "x" } });
    await waitFor(() => {
      expect(screen.getByText("No trainings match your filters")).toBeInTheDocument();
    });
  });

  it("shows no trainings recorded message when list is empty", async () => {
    getTrainingsByUserIdMock.mockResolvedValueOnce([]);
    render(
      <MemoryRouter>
        <HistoryPage view="training" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("No trainings recorded yet")).toBeInTheDocument();
    });
  });

  it("filters training list by notes text", async () => {
    getTrainingsByUserIdMock.mockResolvedValueOnce([
      { id: "t1", game: "Pool", title: "Drill", notes: "serve practice" },
    ]);
    render(
      <MemoryRouter>
        <HistoryPage view="training" />
      </MemoryRouter>
    );
    await waitFor(() => {
      expect(screen.getByText("TrainingCard")).toBeInTheDocument();
    });
    fireEvent.change(screen.getByPlaceholderText("Search by training name or notes..."), { target: { value: "serve" } });
    await waitFor(() => {
      expect(screen.getByText("TrainingCard")).toBeInTheDocument();
    });
  });
});
