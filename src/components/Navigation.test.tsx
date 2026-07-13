import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/components/auth/authContext";

const { signOutMock, toastMock, setThemeMock, navigateMock, liveGamesDataMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  toastMock: vi.fn(),
  setThemeMock: vi.fn(),
  navigateMock: vi.fn(),
  liveGamesDataMock: { current: [] as Array<Record<string, unknown>> },
}));

vi.mock("@/hooks/useTrackerData", () => ({
  useLiveGamesQuery: () => ({ data: liveGamesDataMock.current }),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    signOut: signOutMock,
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("@/routerBase", () => ({
  getBaseName: () => "/",
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: setThemeMock }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/ui/dropdownMenu", () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuItem: ({
    children,
    onClick,
    asChild,
    className,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    asChild?: boolean;
    className?: string;
  }) =>
    asChild ? (
      <div className={className}>{children}</div>
    ) : (
      <button onClick={onClick} className={className} type="button">
        {children}
      </button>
    ),
  DropdownMenuLabel: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
}));

import { Navigation } from "@/components/Navigation";

const profile = {
  id: "profile-1",
  user_id: "user-1",
  name: "Nikola",
  email: "user@example.com",
  created_at: "",
  updated_at: "",
};

function renderNav(initialPath = "/", user: { id: string } | null = null) {
  return render(
    <AuthContext.Provider
      value={{
        user: user as never,
        session: null,
        isAuthenticated: true,
        isLoading: false,
        profile,
      }}
    >
      <MemoryRouter initialEntries={[initialPath]}>
        <Navigation />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    liveGamesDataMock.current = [];
    Object.defineProperty(globalThis, "crypto", {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
        },
      },
      configurable: true,
    });
  });

  it("renders nav items and dropdown contents", async () => {
    renderNav("/history/score");

    expect(screen.getAllByText("History")[0]).toBeInTheDocument();
    expect(screen.getByText("Nikola")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
    expect(screen.getByText("Friends")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });
  });

  it("renders the three theme picker buttons", () => {
    renderNav();
    expect(screen.getByRole("button", { name: /light theme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark theme/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /system theme/i })).toBeInTheDocument();
  });

  it("changes the theme when a picker button is clicked", () => {
    renderNav();
    fireEvent.click(screen.getByRole("button", { name: /dark theme/i }));
    expect(setThemeMock).toHaveBeenCalledWith("dark");
  });

  it("logs out and navigates to login without a toast", async () => {
    signOutMock.mockResolvedValue({});
    renderNav();

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/login");
    });
    expect(toastMock).not.toHaveBeenCalled();
  });

  it("shows destructive toast when logout fails", async () => {
    signOutMock.mockRejectedValueOnce(new Error("logout failed"));
    renderNav();

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Logout failed",
          variant: "destructive",
        })
      );
    });
  });

  it("shows the live dot on the Live tab when the user has active games", () => {
    liveGamesDataMock.current = [{ created_by_user_id: "user-1", opponent_user_id: null }];
    renderNav("/", { id: "user-1" });
    expect(screen.getByTestId("live-nav-dot")).toBeInTheDocument();
  });

  it("hides the live dot when active games belong to other players", () => {
    liveGamesDataMock.current = [{ created_by_user_id: "someone-else", opponent_user_id: null }];
    renderNav("/", { id: "user-1" });
    expect(screen.queryByTestId("live-nav-dot")).not.toBeInTheDocument();
  });

  it("renders the Profile tab in the bottom nav", () => {
    renderNav();
    expect(screen.getByText("Profile")).toBeInTheDocument();
  });

  it("renders safely when profile email is missing", async () => {
    render(
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          profile: { ...profile, email: "" },
        }}
      >
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    await waitFor(() => {
      expect(screen.getByText("ScoreTracker")).toBeInTheDocument();
      expect(screen.getByText("Nikola")).toBeInTheDocument();
    });
  });
});
