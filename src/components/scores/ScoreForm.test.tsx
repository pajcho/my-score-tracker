import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  useAuthMock,
  isAuthenticatedMock,
  createScoreMock,
  setScorePoolTypeMock,
  getFriendsMock,
  getUniqueOpponentsMock,
  getScoresByUserIdMock,
  toastMock,
  invalidateTrackerQueriesMock,
} = vi.hoisted(() => ({
  useAuthMock: vi.fn(),
  isAuthenticatedMock: vi.fn(),
  createScoreMock: vi.fn(),
  setScorePoolTypeMock: vi.fn(),
  getFriendsMock: vi.fn(),
  getUniqueOpponentsMock: vi.fn(),
  getScoresByUserIdMock: vi.fn(),
  toastMock: vi.fn(),
  invalidateTrackerQueriesMock: vi.fn(),
}));

vi.mock("@/components/auth/authContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    isAuthenticated: isAuthenticatedMock,
  },
}));

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    createScore: createScoreMock,
    setScorePoolType: setScorePoolTypeMock,
    getFriends: getFriendsMock,
    getUniqueOpponents: getUniqueOpponentsMock,
    getScoresByUserId: getScoresByUserIdMock,
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/queryCache", () => ({
  invalidateTrackerQueries: invalidateTrackerQueriesMock,
  trackerQueryKeys: {
    scores: ["scores"],
    trainings: ["trainings"],
    liveGames: ["liveGames"],
    opponents: ["opponents"],
    friends: ["friends"],
  },
}));

vi.mock("@/components/ui/popover", () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/calendar", () => ({
  Calendar: () => <div>calendar</div>,
}));

import { ScoreForm } from "@/components/scores/ScoreForm";
import { queryClient } from "@/lib/queryClient";

function renderScoreForm(onSuccess = vi.fn()) {
  return render(
    <QueryClientProvider client={queryClient}>
      <ScoreForm onCancel={vi.fn()} onSuccess={onSuccess} />
    </QueryClientProvider>
  );
}

describe("ScoreForm", () => {
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
    isAuthenticatedMock.mockReturnValue(true);
    createScoreMock.mockResolvedValue({ id: "score-1" });
    setScorePoolTypeMock.mockResolvedValue(undefined);
    getFriendsMock.mockResolvedValue([{ id: "friend-1", name: "Mladen Pajic", email: "m@example.com" }]);
    getUniqueOpponentsMock.mockResolvedValue(["Luka"]);
    getScoresByUserIdMock.mockResolvedValue([]);
    invalidateTrackerQueriesMock.mockResolvedValue(undefined);
  });

  it("disables saving until a score is entered", () => {
    renderScoreForm();

    expect(screen.getByRole("button", { name: "Save Score" })).toBeDisabled();
  });

  it("previews the outcome on the save button as scores change", () => {
    renderScoreForm();

    const increaseYours = screen.getByRole("button", { name: "Increase your score" });
    const increaseTheirs = screen.getByRole("button", { name: "Increase opponent score" });

    fireEvent.click(increaseYours);
    fireEvent.click(increaseYours);
    fireEvent.click(increaseTheirs);
    expect(screen.getByRole("button", { name: "Save · Win 2-1" })).toBeEnabled();

    fireEvent.click(increaseTheirs);
    expect(screen.getByRole("button", { name: "Save · Draw 2-2" })).toBeInTheDocument();

    fireEvent.click(increaseTheirs);
    expect(screen.getByRole("button", { name: "Save · Loss 2-3" })).toBeInTheDocument();
  });

  it("saves a friend game built entirely from taps", async () => {
    const onSuccess = vi.fn();
    renderScoreForm(onSuccess);

    // Friend chips arrive after the friends query resolves.
    fireEvent.click(await screen.findByRole("button", { name: "Mladen P." }));

    fireEvent.click(screen.getByRole("button", { name: "Increase your score" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase your score" }));
    fireEvent.click(screen.getByRole("button", { name: "Increase opponent score" }));

    fireEvent.click(screen.getByRole("button", { name: "Save · Win 2-1" }));

    await waitFor(() => {
      expect(createScoreMock).toHaveBeenCalledWith("Pool", null, "2-1", expect.any(String), "friend-1");
      expect(setScorePoolTypeMock).toHaveBeenCalledWith("score-1", "9-ball");
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });

  it("saves a custom-opponent ping pong game without pool settings", async () => {
    const onSuccess = vi.fn();
    renderScoreForm(onSuccess);

    fireEvent.click(screen.getByRole("radio", { name: /Ping Pong/ }));
    expect(screen.queryByRole("radio", { name: "9-Ball" })).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole("button", { name: "Custom opponent" }));
    fireEvent.change(screen.getByPlaceholderText("Opponent's name"), { target: { value: "Luka" } });

    fireEvent.click(screen.getByRole("button", { name: "Increase opponent score" }));
    fireEvent.click(screen.getByRole("button", { name: "Save · Loss 0-1" }));

    await waitFor(() => {
      expect(createScoreMock).toHaveBeenCalledWith("Ping Pong", "Luka", "0-1", expect.any(String), undefined);
      expect(setScorePoolTypeMock).not.toHaveBeenCalled();
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
