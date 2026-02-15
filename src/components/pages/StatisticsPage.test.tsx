import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
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

vi.mock("@/components/ui/select", () => ({
  Select: ({
    children,
    onValueChange,
  }: {
    children: React.ReactNode;
    onValueChange?: (value: string) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onValueChange?.("all")}>
        SelectAll
      </button>
      <button type="button" onClick={() => onValueChange?.("Pool")}>
        SelectPool
      </button>
      <button type="button" onClick={() => onValueChange?.("Ping Pong")}>
        SelectPingPong
      </button>
      <button type="button" onClick={() => onValueChange?.("8-ball")}>
        Select8Ball
      </button>
      <button type="button" onClick={() => onValueChange?.("Ana")}>
        SelectAna
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

vi.mock("@/components/ui/popover", () => ({
  Popover: ({
    children,
    onOpenChange,
  }: {
    children: React.ReactNode;
    onOpenChange?: (open: boolean) => void;
  }) => (
    <div>
      <button type="button" onClick={() => onOpenChange?.(true)}>
        OpenPopover
      </button>
      <button type="button" onClick={() => onOpenChange?.(false)}>
        ClosePopover
      </button>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { StatisticsPage } from "@/components/pages/StatisticsPage";
import { queryClient } from "@/lib/query-client";

function renderStatisticsPage(view: "score" | "training") {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <StatisticsPage view={view} />
      </MemoryRouter>
    </QueryClientProvider>
  );
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

  it("renders score statistics for populated data", async () => {
    const today = new Date();
    const isoDate = (offsetDays: number) => {
      const value = new Date(today);
      value.setDate(today.getDate() - offsetDays);
      return value.toISOString().slice(0, 10);
    };

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
        pool_settings: { pool_type: "8-ball" },
      },
      {
        id: "score-4",
        user_id: "user-1",
        game: "Pool",
        opponent_name: null,
        friend_name: null,
        score: "0-7",
        date: isoDate(3),
      },
    ]);

    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("Game Performance")).toBeInTheDocument();
      expect(screen.getByText("Social Stats")).toBeInTheDocument();
      expect(screen.getByText("Recent Form")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "OpenPopover" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "ClosePopover" })[0]);
    screen.getAllByRole("button", { name: "OpenPopover" }).forEach((openButton) => fireEvent.click(openButton));
    screen.getAllByRole("button", { name: "ClosePopover" }).forEach((closeButton) => fireEvent.click(closeButton));
    fireEvent.click(screen.getAllByRole("button", { name: "SelectPool" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Select8Ball" })[1]);
    fireEvent.click(screen.getAllByRole("button", { name: "SelectAna" })[2]);

    await waitFor(() => {
      expect(screen.getByText("Game Performance")).toBeInTheDocument();
    });
  });

  it("covers pool-type filter branches for non-pool and mismatched pool settings", async () => {
    const today = new Date();
    const isoDate = (offsetDays: number) => {
      const value = new Date(today);
      value.setDate(today.getDate() - offsetDays);
      return value.toISOString().slice(0, 10);
    };

    getScoresByUserIdMock.mockResolvedValueOnce([
      {
        id: "score-a",
        user_id: "user-1",
        game: "Pool",
        opponent_name: "Ana",
        friend_name: null,
        score: "7-5",
        date: isoDate(1),
        pool_settings: { pool_type: "9-ball" },
      },
      {
        id: "score-b",
        user_id: "user-1",
        game: "Ping Pong",
        opponent_name: "Ana",
        friend_name: null,
        score: "11-8",
        date: isoDate(2),
      },
    ]);

    renderStatisticsPage("score");

    await waitFor(() => {
      expect(screen.getByText("Game Performance")).toBeInTheDocument();
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Select8Ball" })[1]);
    await waitFor(() => {
      expect(screen.getByText("No games found matching your filters")).toBeInTheDocument();
    });
  });

  it("renders training view statistics section", async () => {
    const today = new Date();
    const isoDate = (offsetDays: number) => {
      const value = new Date(today);
      value.setDate(today.getDate() - offsetDays);
      return value.toISOString().slice(0, 10);
    };

    getTrainingsByUserIdMock.mockResolvedValue([
      { id: "t1", game: "Pool", duration_minutes: 60, training_date: isoDate(1), title: "Drill" },
      { id: "t2", game: "Pool", duration_minutes: 30, training_date: isoDate(2), title: "Drill B" },
      { id: "t3", game: "Ping Pong", duration_minutes: 90, training_date: isoDate(4), title: "Session C" },
    ]);

    renderStatisticsPage("training");

    await waitFor(() => {
      expect(screen.getByText("Analyze your training consistency and load")).toBeInTheDocument();
      expect(screen.getByText("Training Heatmap")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole("button", { name: "SelectPool" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "OpenPopover" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "ClosePopover" })[0]);
    await waitFor(() => {
      expect(screen.getByText("Training Heatmap")).toBeInTheDocument();
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
