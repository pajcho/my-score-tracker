import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState } = vi.hoisted(() => ({
  authState: {
    currentUserId: "user-1",
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

vi.mock("@/hooks/useMobile", () => ({
  useIsMobile: () => false,
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    isAuthenticated: () => true,
    getCurrentUser: () => ({ id: authState.currentUserId }),
  },
}));

vi.mock("@/lib/supabaseDatabase", () => ({
  supabaseDb: {
    deleteScore: vi.fn(),
  },
}));

vi.mock("@/components/scores/ScoreEditDialog", () => ({
  ScoreEditDialog: () => null,
}));

import { GameList } from "@/components/ui/gameList";

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

describe("GameList perspective labels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows owner perspective as You vs friend", () => {
    authState.currentUserId = "user-1";

    render(<GameList scores={[sharedScore]} onScoreUpdated={() => undefined} showActions={false} />);

    expect(screen.getByText("You vs Friend One")).toBeInTheDocument();
    expect(screen.queryByText("Friend One vs You")).not.toBeInTheDocument();
  });

  it("shows invited friend perspective as friend vs You", () => {
    authState.currentUserId = "friend-1";

    render(<GameList scores={[sharedScore]} onScoreUpdated={() => undefined} showActions={false} />);

    expect(screen.getByText("Friend One vs You")).toBeInTheDocument();
    expect(screen.queryByText("You vs Friend One")).not.toBeInTheDocument();
  });
});
