import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState } = vi.hoisted(() => ({
  authState: {
    currentUserId: "user-1",
  },
}));

vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/lib/supabase-auth", () => ({
  supabaseAuth: {
    isAuthenticated: () => true,
    getCurrentUser: () => ({ id: authState.currentUserId }),
  },
}));

vi.mock("@/lib/supabase-database", () => ({
  supabaseDb: {
    deleteScore: vi.fn(),
  },
}));

vi.mock("@/components/scores/ScoreEditDialog", () => ({
  ScoreEditDialog: () => null,
}));

import { ScoreList } from "@/components/scores/ScoreList";

const sharedScore = {
  id: "score-1",
  user_id: "user-1",
  game: "Pool",
  opponent_name: null,
  opponent_user_id: "friend-1",
  score: "7-5",
  date: "2026-02-14",
  created_at: "2026-02-14T10:00:00.000Z",
  updated_at: "2026-02-14T10:00:00.000Z",
  friend_name: "Friend One",
};

describe("ScoreList perspective labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows owner perspective labels", () => {
    authState.currentUserId = "user-1";
    render(<ScoreList scores={[sharedScore]} onScoreUpdated={() => undefined} compact />);
    expect(screen.getByText("You vs Friend One")).toBeInTheDocument();
  });

  it("shows invited friend perspective labels", () => {
    authState.currentUserId = "friend-1";
    render(<ScoreList scores={[sharedScore]} onScoreUpdated={() => undefined} compact />);
    expect(screen.getByText("Friend One vs You")).toBeInTheDocument();
  });
});
