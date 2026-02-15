import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/components/auth/authContext";

const { signOutMock, toastMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  toastMock: vi.fn(),
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

vi.mock("@/components/ThemeSelector", () => ({
  ThemeSelector: () => <div>ThemeSelector</div>,
}));

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
  DropdownMenuSeparator: () => <hr />,
}));

import { Navigation } from "@/components/Navigation";

describe("Navigation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(globalThis, "crypto", {
      value: {
        subtle: {
          digest: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
        },
      },
      configurable: true,
    });
  });

  it("renders nav items and profile controls", async () => {
    render(
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          profile: {
            id: "profile-1",
            user_id: "user-1",
            name: "Nikola",
            email: "user@example.com",
            created_at: "",
            updated_at: "",
          },
        }}
      >
        <MemoryRouter initialEntries={["/history/score"]}>
          <Navigation />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    expect(screen.getAllByText("History")[0]).toBeInTheDocument();
    expect(screen.getByText("Nikola")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /logout/i })).toBeInTheDocument();
    });
  });

  it("logs out and shows toast", async () => {
    signOutMock.mockResolvedValue({});

    render(
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          profile: {
            id: "profile-1",
            user_id: "user-1",
            name: "Nikola",
            email: "user@example.com",
            created_at: "",
            updated_at: "",
          },
        }}
      >
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      </AuthContext.Provider>
    );

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "Logged out",
        })
      );
    });
  });

  it("shows destructive toast when logout fails", async () => {
    signOutMock.mockRejectedValueOnce(new Error("logout failed"));

    render(
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          profile: {
            id: "profile-1",
            user_id: "user-1",
            name: "Nikola",
            email: "user@example.com",
            created_at: "",
            updated_at: "",
          },
        }}
      >
        <MemoryRouter>
          <Navigation />
        </MemoryRouter>
      </AuthContext.Provider>
    );

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

  it("renders safely when profile email is missing", async () => {
    render(
      <AuthContext.Provider
        value={{
          user: null,
          session: null,
          isAuthenticated: true,
          isLoading: false,
          profile: {
            id: "profile-1",
            user_id: "user-1",
            name: "Nikola",
            email: "",
            created_at: "",
            updated_at: "",
          },
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
