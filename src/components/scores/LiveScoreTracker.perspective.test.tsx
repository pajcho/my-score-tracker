import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi, afterEach } from "vitest";
import { queryClient } from "@/lib/queryClient";

const { authState, getLiveGamesMock, getUniqueOpponentsMock, getFriendsMock, subscribeToLiveGamesMock, toastMock, invalidateTrackerQueriesMock } =
  vi.hoisted(() => ({
    authState: {
      currentUserId: "user-1",
    },
    getLiveGamesMock: vi.fn(),
    getUniqueOpponentsMock: vi.fn(),
    getFriendsMock: vi.fn(),
    subscribeToLiveGamesMock: vi.fn(),
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
    updateLiveGameScore: vi.fn(),
    deleteLiveGame: vi.fn(),
    completeLiveGame: vi.fn(),
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

import { LiveScoreTracker } from "@/components/scores/LiveScoreTracker";

function renderLiveScoreTracker() {
  return render(
    <QueryClientProvider client={queryClient}>
      <LiveScoreTracker onClose={() => undefined} onScoresSaved={() => undefined} />
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
      expect(screen.getByRole("heading", { name: "Live Score Tracking" })).toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Watching friends" })).toBeInTheDocument();
    });

    const watchingSection = screen.getByRole("heading", { name: "Watching friends" }).closest("section");

    expect(watchingSection).not.toBeNull();
    expect(screen.getByText("Friend One")).toBeInTheDocument();
    expect(watchingSection).not.toContainElement(screen.getByText("Friend One"));
    expect(watchingSection).toContainElement(screen.getByText("Friend Two"));
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

  it("opens the live game setup inside the shared modal", async () => {
    authState.currentUserId = "user-1";

    renderLiveScoreTracker();

    await waitFor(() => {
      expect(screen.getByText("Add New Game")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Add New Game"));

    expect(screen.getByText("Start a New Game")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("What game do you want to play?")).toBeInTheDocument();
  });
});
