import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { queryClient } from "@/lib/queryClient";

const { authState, getLiveGamesMock, getUniqueOpponentsMock, getFriendsMock, subscribeToLiveGamesMock, completeLiveGameMock, updateLiveGameScoreMock, sendLiveGameTauntMock, toastMock, invalidateTrackerQueriesMock } =
  vi.hoisted(() => ({
    authState: {
      currentUserId: "user-1",
    },
    getLiveGamesMock: vi.fn(),
    getUniqueOpponentsMock: vi.fn(),
    getFriendsMock: vi.fn(),
    subscribeToLiveGamesMock: vi.fn(),
    completeLiveGameMock: vi.fn(),
    updateLiveGameScoreMock: vi.fn(),
    sendLiveGameTauntMock: vi.fn(),
    toastMock: vi.fn(),
    invalidateTrackerQueriesMock: vi.fn(),
  }));

const { useIsMobileMock } = vi.hoisted(() => ({
  useIsMobileMock: vi.fn(() => false),
}));

vi.mock("@/components/auth/authContext", () => ({
  useAuth: () => ({
    user: { id: authState.currentUserId, user_metadata: { name: "Current User" } },
    profile: { user_id: authState.currentUserId, name: "Current User" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/queryCache", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/queryCache")>();
  return {
    ...actual,
    invalidateTrackerQueries: invalidateTrackerQueriesMock,
  };
});

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    getLiveGames: getLiveGamesMock,
    getUniqueOpponents: getUniqueOpponentsMock,
    getFriends: getFriendsMock,
    subscribeToLiveGames: subscribeToLiveGamesMock,
    updateLiveGameScore: updateLiveGameScoreMock,
    sendLiveGameTaunt: sendLiveGameTauntMock,
    deleteLiveGame: vi.fn(),
    completeLiveGame: completeLiveGameMock,
    createLiveGame: vi.fn(),
  },
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SelectValue: () => null,
  SelectContent: () => null,
  SelectItem: () => null,
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/toggleGroup", () => ({
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/opponentAutocomplete", () => ({
  OpponentAutocomplete: () => <div>OpponentAutocomplete</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/drawer", () => ({
  Drawer: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (open ? <div>{children}</div> : null),
  DrawerContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DrawerDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

import { Toaster } from "sonner";
import { LiveScoreTracker } from "@/components/scores/LiveScoreTracker";

function renderLiveScoreTracker() {
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveScoreTracker onClose={() => undefined} onScoresSaved={() => undefined} />
      {/* Real sonner toaster so the undo snackbar is interactable. */}
      <Toaster />
    </QueryClientProvider>
  );
}

describe("LiveScoreTracker perspective labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useIsMobileMock.mockReturnValue(false);
    queryClient.clear();
    queryClient.setDefaultOptions({
      queries: {
        retry: false,
        gcTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
    });
    getUniqueOpponentsMock.mockResolvedValue([]);
    getFriendsMock.mockResolvedValue([]);
    subscribeToLiveGamesMock.mockReturnValue(() => undefined);
    getLiveGamesMock.mockResolvedValue([
      {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Ping Pong",
        opponent_name: null,
        opponent_user_id: "friend-1",
        score1: 7,
        score2: 5,
        date: "2026-02-14",
        started_at: "2026-02-14T10:00:00.000Z",
        created_at: "2026-02-14T10:00:00.000Z",
        updated_at: "2026-02-14T10:00:00.000Z",
        creator_name: "Owner Name",
        opponent_user_name: "Friend One",
      },
    ]);
  });

  it("shows owner view labels as You vs friend", async () => {
    authState.currentUserId = "user-1";

    renderLiveScoreTracker();

    await waitFor(() => {
      expect(screen.getByText("You")).toBeInTheDocument();
      expect(screen.getByText("Friend One")).toBeInTheDocument();
    });

    expect(screen.queryByText("Owner Name")).not.toBeInTheDocument();
  });

  it("shows invited friend view labels as owner vs You", async () => {
    authState.currentUserId = "friend-1";

    renderLiveScoreTracker();

    await waitFor(() => {
      expect(screen.getByText("Owner Name")).toBeInTheDocument();
      expect(screen.getByText("You")).toBeInTheDocument();
    });

    expect(screen.queryByText("Friend One")).not.toBeInTheDocument();
  });

  // Fix 1 test: visibilitychange listener
  it("calls invalidateTrackerQueries when document becomes visible", async () => {
    renderLiveScoreTracker();

    // Simulate the document becoming visible
    Object.defineProperty(document, "visibilityState", {
      writable: true,
      value: "visible",
    });

    document.dispatchEvent(new Event("visibilitychange"));

    await waitFor(() => {
      expect(invalidateTrackerQueriesMock).toHaveBeenCalledWith({ liveGames: true });
    });
  });

  it("separates watched friend games into a collapsible section below active games", async () => {
    authState.currentUserId = "user-1";
    getLiveGamesMock.mockResolvedValueOnce([
      {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Ping Pong",
        opponent_name: null,
        opponent_user_id: "friend-1",
        score1: 7,
        score2: 5,
        date: "2026-02-14",
        started_at: "2026-02-14T10:00:00.000Z",
        created_at: "2026-02-14T10:00:00.000Z",
        updated_at: "2026-02-14T10:00:00.000Z",
        creator_name: "Current User",
        opponent_user_name: "Friend One",
      },
      {
        id: "live-2",
        created_by_user_id: "friend-2",
        game: "Pool",
        opponent_name: "Friend Three",
        opponent_user_id: null,
        score1: 4,
        score2: 3,
        date: "2026-02-15",
        started_at: "2026-02-15T10:00:00.000Z",
        created_at: "2026-02-15T10:00:00.000Z",
        updated_at: "2026-02-15T10:00:00.000Z",
        creator_name: "Friend Two",
      },
    ]);

    renderLiveScoreTracker();

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Live" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Watching friends" })).toBeInTheDocument();
    });

    const watchingSection = screen.getByRole("heading", { name: "Watching friends" }).closest("section");

    expect(watchingSection).not.toBeNull();
    expect(screen.getByText("Friend One")).toBeInTheDocument();

    // With own active games present the watched list starts collapsed.
    fireEvent.click(screen.getByRole("button", { name: "Show watched games" }));

    await waitFor(() => {
      expect(watchingSection).toContainElement(screen.getByText("Friend Two"));
    });
    expect(watchingSection).not.toContainElement(screen.getByText("Friend One"));
    expect(watchingSection).toContainElement(screen.getByText("Watching (read-only)"));
  });

  it("allows collapsing and expanding the watched games section", async () => {
    authState.currentUserId = "user-1";
    getLiveGamesMock.mockResolvedValueOnce([
      {
        id: "live-1",
        created_by_user_id: "friend-2",
        game: "Pool",
        opponent_name: "Friend Three",
        opponent_user_id: null,
        score1: 4,
        score2: 3,
        date: "2026-02-15",
        started_at: "2026-02-15T10:00:00.000Z",
        created_at: "2026-02-15T10:00:00.000Z",
        updated_at: "2026-02-15T10:00:00.000Z",
        creator_name: "Friend Two",
      },
    ]);

    renderLiveScoreTracker();

    await waitFor(() => {
      expect(screen.getByText("Friend Two")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Hide watched games" }));

    await waitFor(() => {
      expect(screen.queryByText("Friend Two")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Show watched games" })).toBeInTheDocument();
      expect(screen.getByText("Show watched games (1)")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Show watched games" }));

    await waitFor(() => {
      expect(screen.getByText("Friend Two")).toBeInTheDocument();
    });
  });

  it("undoes exactly the last tap from the snackbar, even from a stale render", async () => {
    authState.currentUserId = "user-1";

    renderLiveScoreTracker();

    // Seeded game: You 7 - 5 Friend One.
    const youTile = await screen.findByRole("button", { name: /Score for You: 7/ });
    fireEvent.click(youTile);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Score for You: 8/ })).toBeInTheDocument();
    });

    // The snackbar's Undo fires from a closure created at tap time; it must
    // operate on the current cache (8 → 7), not the pre-tap snapshot
    // (7 → 6, the old revert-by-two bug).
    const undoButton = await screen.findByRole("button", { name: "Undo" });
    fireEvent.click(undoButton);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Score for You: 7/ })).toBeInTheDocument();
    });
    expect(screen.queryByRole("button", { name: /Score for You: 6/ })).not.toBeInTheDocument();
  });

  it("only lets the most recent rack winner take a point back, in play order", async () => {
    authState.currentUserId = "user-1";
    getLiveGamesMock.mockResolvedValue([
      {
        id: "live-1",
        created_by_user_id: "user-1",
        game: "Pool",
        opponent_name: null,
        opponent_user_id: "friend-1",
        score1: 2,
        score2: 1,
        rack_history: ["player1", "player2", "player1"],
        date: "2026-02-14",
        started_at: "2026-02-14T10:00:00.000Z",
        created_at: "2026-02-14T10:00:00.000Z",
        updated_at: "2026-02-14T10:00:00.000Z",
        creator_name: "Current User",
        opponent_user_name: "Friend One",
        pool_settings: {
          id: "settings-1",
          live_game_id: "live-1",
          score_id: null,
          created_by_user_id: "user-1",
          pool_type: "9-ball",
          break_rule: "winner_stays",
          first_breaker_side: "player1",
          current_breaker_side: "player1",
          last_rack_winner_side: "player1",
          created_at: "2026-02-14T10:00:00.000Z",
          updated_at: "2026-02-14T10:00:00.000Z",
        },
      },
    ]);

    renderLiveScoreTracker();

    const removeYourPoint = await screen.findByRole("button", { name: "Remove point for You" });
    const removeFriendPoint = screen.getByRole("button", { name: "Remove point for Friend One" });
    // Friend One has a point, but You won the last rack.
    expect(removeFriendPoint).toBeDisabled();
    expect(removeYourPoint).toBeEnabled();

    fireEvent.click(removeYourPoint);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Score for You: 1/ })).toBeInTheDocument();
    });
    // Now Friend One's rack 2 is the latest win.
    expect(screen.getByRole("button", { name: "Remove point for You" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Remove point for Friend One" })).toBeEnabled();
    // Winner stays: the history says Friend One won the previous rack, so no breaker prompt.
    expect(screen.queryByText("Who breaks next?")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(updateLiveGameScoreMock).toHaveBeenCalledWith(
        "live-1",
        1,
        1,
        { current_breaker_side: "player2", last_rack_winner_side: "player2" },
        ["player1", "player2"]
      );
    });
  });

  describe("winning streaks", () => {
    const pingPongGame = (rackHistory: string[]) => ({
      id: "live-1",
      created_by_user_id: "user-1",
      game: "Ping Pong",
      opponent_name: null,
      opponent_user_id: "friend-1",
      score1: rackHistory.filter((side) => side === "player1").length,
      score2: rackHistory.filter((side) => side === "player2").length,
      rack_history: rackHistory,
      date: "2026-02-14",
      started_at: "2026-02-14T10:00:00.000Z",
      created_at: "2026-02-14T10:00:00.000Z",
      updated_at: "2026-02-14T10:00:00.000Z",
      creator_name: "Current User",
      opponent_user_name: "Friend One",
    });

    it("lets the streak winner taunt their opponent once a second rack in a row is won", async () => {
      authState.currentUserId = "user-1";
      getLiveGamesMock.mockResolvedValue([pingPongGame(["player2", "player1"])]);
      sendLiveGameTauntMock.mockResolvedValue(undefined);

      renderLiveScoreTracker();

      fireEvent.click(await screen.findByRole("button", { name: /Score for You: 1/ }));

      expect(await screen.findByRole("dialog", { name: "Double! You won 2 in a row" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Send 💩" }));

      await waitFor(() => {
        expect(sendLiveGameTauntMock).toHaveBeenCalledWith("live-1", "friend-1", ["💩"], 2);
      });
      expect(screen.queryByRole("dialog", { name: /Double!/ })).not.toBeInTheDocument();
    });

    it("shows the opponent's streak without a taunt picker", async () => {
      authState.currentUserId = "user-1";
      getLiveGamesMock.mockResolvedValue([pingPongGame(["player1", "player2", "player2"])]);

      renderLiveScoreTracker();

      fireEvent.click(await screen.findByRole("button", { name: /Score for Friend One: 2/ }));

      expect(await screen.findByRole("dialog", { name: "Triple! Friend One won 3 in a row" })).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Send/ })).not.toBeInTheDocument();
    });
  });

  it("opens the live game setup inside the shared modal", async () => {
    authState.currentUserId = "user-1";

    renderLiveScoreTracker();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Start a new game" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Start a new game" }));

    expect(screen.getByText("Start a New Game")).toBeInTheDocument();
    expect(screen.getByLabelText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("What game do you want to play?")).toBeInTheDocument();
  });

  it("only finishes all games after the confirmation is accepted", async () => {
    authState.currentUserId = "user-1";

    renderLiveScoreTracker();

    const finishAllButton = await screen.findByRole("button", { name: /Finish all/ });
    fireEvent.click(finishAllButton);

    // Opening the dialog must not touch the games yet.
    expect(completeLiveGameMock).not.toHaveBeenCalled();
    expect(await screen.findByText("Finish 1 game?")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Finish & save" }));

    await waitFor(() => {
      expect(completeLiveGameMock).toHaveBeenCalledWith("live-1");
    });
  });
});
