import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "@/components/auth/authContext";

const { signOutMock, toastMock, navigateMock, setThemeMock } = vi.hoisted(() => ({
  signOutMock: vi.fn(),
  toastMock: vi.fn(),
  navigateMock: vi.fn(),
  setThemeMock: vi.fn(),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    signOut: signOutMock,
  },
}));

vi.mock("@/hooks/useToast", () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock("next-themes", () => ({
  useTheme: () => ({ theme: "system", setTheme: setThemeMock }),
}));

vi.mock("@/hooks/useTrackerData", () => ({
  useFriendsQuery: () => ({ data: [{ id: "f1" }, { id: "f2" }] }),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

import { ProfilePage } from "@/components/pages/ProfilePage";

const profile = {
  id: "profile-1",
  user_id: "user-1",
  name: "Nikola",
  email: "user@example.com",
  created_at: "",
  updated_at: "",
};

function renderPage() {
  return render(
    <AuthContext.Provider
      value={{
        user: { id: "user-1" } as never,
        session: null,
        isAuthenticated: true,
        isLoading: false,
        profile,
      }}
    >
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("ProfilePage", () => {
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

  it("shows user identity, theme picker and hub links", () => {
    renderPage();

    expect(screen.getByText("Nikola")).toBeInTheDocument();
    expect(screen.getByText("user@example.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /dark theme/i })).toBeInTheDocument();
    expect(screen.getByText("Friends")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("Account settings")).toBeInTheDocument();
    expect(screen.getByText("Notifications")).toBeInTheDocument();
  });

  it("links the notifications row to the settings notifications tab", () => {
    renderPage();
    const notificationsRow = screen.getByText("Notifications").closest("a");
    expect(notificationsRow).toHaveAttribute("href", "/settings?tab=notifications");
  });

  it("logs out and navigates to login", async () => {
    signOutMock.mockResolvedValue({});
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(signOutMock).toHaveBeenCalledTimes(1);
      expect(navigateMock).toHaveBeenCalledWith("/login");
    });
  });

  it("shows a destructive toast when logout fails", async () => {
    signOutMock.mockRejectedValueOnce(new Error("nope"));
    renderPage();

    fireEvent.click(screen.getByRole("button", { name: /logout/i }));
    await waitFor(() => {
      expect(toastMock).toHaveBeenCalledWith(
        expect.objectContaining({ title: "Logout failed", variant: "destructive" })
      );
    });
  });
});
