import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();

vi.mock("@/components/auth/auth-context", () => ({
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
  beforeEach(() => {
    useAuthMock.mockReset();
  });

  it("shows loading state while auth is loading", () => {
    useAuthMock.mockReturnValue({ isLoading: true });
    render(<Layout />);
    expect(screen.getByText("Loading your profile...")).toBeInTheDocument();
  });

  it("renders layout content once auth is loaded", () => {
    useAuthMock.mockReturnValue({ isLoading: false });
    render(<Layout />);
    expect(screen.getByText("Navigation")).toBeInTheDocument();
    expect(screen.getByText("InviteNotifier")).toBeInTheDocument();
    expect(screen.getByText("OutletContent")).toBeInTheDocument();
  });
});
