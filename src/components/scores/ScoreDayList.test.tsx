import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Score } from "@/lib/supabaseDatabase";

const { deleteScoreMock, toastMock, invalidateTrackerQueriesMock } = vi.hoisted(() => ({
  deleteScoreMock: vi.fn(),
  toastMock: vi.fn(),
  invalidateTrackerQueriesMock: vi.fn(),
}));

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    deleteScore: deleteScoreMock,
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/lib/queryCache", () => ({
  invalidateTrackerQueries: invalidateTrackerQueriesMock,
}));

vi.mock("@/components/scores/ScoreEditDialog", () => ({
  ScoreEditDialog: ({ open }: { open: boolean }) => (open ? <div>ScoreEditDialog</div> : null),
}));

vi.mock("@/components/ui/responsiveFormModal", () => ({
  ResponsiveFormModal: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div>{children}</div> : null,
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => true,
}));

import { ScoreDayList } from "@/components/scores/ScoreDayList";

type ScoreWithFriend = Score & { friend_name?: string | null };

const scores = [
  // Two games on Jul 6 vs the same opponent: one win, one loss.
  { id: "s1", user_id: "user-1", game: "Pool", opponent_name: "Marko Djedovic", friend_name: null, score: "5-1", date: "2026-07-06", created_at: "", updated_at: "" },
  { id: "s2", user_id: "user-1", game: "Pool", opponent_name: "Marko Djedovic", friend_name: null, score: "2-5", date: "2026-07-06", created_at: "", updated_at: "" },
  // One game on Jul 1 recorded by the opponent (perspective flip).
  { id: "s3", user_id: "friend-1", game: "Ping Pong", opponent_name: null, friend_name: "Mladen Pajic", score: "11-8", date: "2026-07-01", created_at: "", updated_at: "" },
] as unknown as ScoreWithFriend[];

describe("ScoreDayList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("groups games under day headers with an evening tally", () => {
    render(<ScoreDayList scores={scores} currentUserId="user-1" onScoreUpdated={() => undefined} />);

    expect(screen.getByText(/Jul 6, 2026/)).toBeInTheDocument();
    expect(screen.getByText(/Jul 1, 2026/)).toBeInTheDocument();
    // Single-opponent day reads as a head-to-head tally with first name.
    expect(screen.getByText("You 1-1 Marko")).toBeInTheDocument();
  });

  it("shows a per-opponent tally when an evening had multiple opponents", () => {
    const eveningScores = [
      { id: "e1", user_id: "user-1", game: "Pool", opponent_name: "Marko Djedovic", friend_name: null, score: "7-5", date: "2026-07-10", created_at: "", updated_at: "" },
      { id: "e2", user_id: "user-1", game: "Pool", opponent_name: "Marko Djedovic", friend_name: null, score: "5-7", date: "2026-07-10", created_at: "", updated_at: "" },
      { id: "e3", user_id: "user-1", game: "Pool", opponent_name: "Marko Djedovic", friend_name: null, score: "7-6", date: "2026-07-10", created_at: "", updated_at: "" },
      { id: "e4", user_id: "user-1", game: "Pool", opponent_name: "Ana Anic", friend_name: null, score: "7-4", date: "2026-07-10", created_at: "", updated_at: "" },
      { id: "e5", user_id: "user-1", game: "Pool", opponent_name: "Ana Anic", friend_name: null, score: "3-7", date: "2026-07-10", created_at: "", updated_at: "" },
    ] as unknown as ScoreWithFriend[];

    render(<ScoreDayList scores={eveningScores} currentUserId="user-1" onScoreUpdated={() => undefined} />);

    // Ordered by games played per opponent, first names only.
    expect(screen.getByText("You 2-1 Marko · 1-1 Ana")).toBeInTheDocument();
  });

  it("shows scores from the current user's perspective", () => {
    render(<ScoreDayList scores={scores} currentUserId="user-1" onScoreUpdated={() => undefined} />);

    // s3 was recorded by the opponent as 11-8; user-1 reads it flipped.
    expect(screen.getByText("8-11")).toBeInTheDocument();
    expect(screen.getByText("Mladen Pajic vs You")).toBeInTheDocument();
  });

  it("opens the detail sheet with edit and delete for own games", () => {
    render(<ScoreDayList scores={scores} currentUserId="user-1" onScoreUpdated={() => undefined} />);

    fireEvent.click(screen.getAllByText("vs Marko Djedovic")[0]);

    expect(screen.getByText("WIN")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Edit/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Delete/ })).toBeInTheDocument();
  });

  it("hides edit and delete for games recorded by the opponent", () => {
    render(<ScoreDayList scores={scores} currentUserId="user-1" onScoreUpdated={() => undefined} />);

    fireEvent.click(screen.getByText("Mladen Pajic vs You"));

    expect(screen.getByText("LOSS")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Edit/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Delete/ })).not.toBeInTheDocument();
  });

  it("opens the edit dialog from the detail sheet", () => {
    render(<ScoreDayList scores={scores} currentUserId="user-1" onScoreUpdated={() => undefined} />);

    fireEvent.click(screen.getAllByText("vs Marko Djedovic")[0]);
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));

    expect(screen.getByText("ScoreEditDialog")).toBeInTheDocument();
  });
});
