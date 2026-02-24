import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();

vi.mock("@/components/auth/authContext", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("@/components/Navigation", () => ({
  Navigation: () => <div>Navigation</div>,
}));

vi.mock("@/components/scores/LiveGameInviteNotifier", () => ({
  LiveGameInviteNotifier: () => <div>InviteNotifier</div>,
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    Outlet: () => <div>OutletContent</div>,
  };
});

import { Layout } from "@/components/Layout";

describe("Layout", () => {
  const mockProfile = {
    id: "profile-1",
    user_id: "user-1",
    name: "Test User",
    email: "test@example.com",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  };

  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("shows loading state on initial load when there's no profile data", () => {
    useAuthMock.mockReturnValue({ isLoading: true, profile: null });
    render(<Layout />);
    expect(screen.getByText("Loading your profile...")).toBeInTheDocument();
  });

  it("renders layout content once auth is loaded with profile", () => {
    useAuthMock.mockReturnValue({ isLoading: false, profile: mockProfile });
    render(<Layout />);
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("InviteNotifier")).toBeInTheDocument();
    expect(screen.getByText("OutletContent")).toBeInTheDocument();
  });

  it("does NOT show loading state during background refetch when profile already exists", () => {
    useAuthMock.mockReturnValue({ isLoading: true, profile: mockProfile });
    render(<Layout />);
    expect(screen.queryByText("Loading your profile...")).not.toBeInTheDocument();
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("OutletContent")).toBeInTheDocument();
  });
});
