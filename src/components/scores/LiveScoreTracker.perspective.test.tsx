import { render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { queryClient } from "@/lib/query-client";

const { authState, getLiveGamesMock, getUniqueOpponentsMock, getFriendsMock, subscribeToLiveGamesMock, toastMock } =
  vi.hoisted(() => ({
    authState: {
      currentUserId: "user-1",
    },
    getLiveGamesMock: vi.fn(),
    getUniqueOpponentsMock: vi.fn(),
    getFriendsMock: vi.fn(),
    subscribeToLiveGamesMock: vi.fn(),
    toastMock: vi.fn(),
  }));

vi.mock("@/components/auth/auth-context", () => ({
  useAuth: () => ({
    user: { id: authState.currentUserId, user_metadata: { name: "Current User" } },
    profile: { user_id: authState.currentUserId, name: "Current User" },
    isAuthenticated: true,
    isLoading: false,
  }),
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/supabase-database", () => ({
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

vi.mock("@/components/ui/toggle-group", () => ({
  ToggleGroup: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  ToggleGroupItem: ({ children }: { children: React.ReactNode }) => <button type="button">{children}</button>,
}));

vi.mock("@/components/ui/opponent-autocomplete", () => ({
  OpponentAutocomplete: () => <div>OpponentAutocomplete</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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
});
