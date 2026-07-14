import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStateMock, subscribeMock, invalidateTrackerQueriesMock } = vi.hoisted(() => ({
  getStateMock: vi.fn(),
  subscribeMock: vi.fn(),
  invalidateTrackerQueriesMock: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    getState: getStateMock,
    subscribe: subscribeMock,
  },
}));

vi.mock("@/lib/queryCache", () => ({
  invalidateTrackerQueries: invalidateTrackerQueriesMock,
}));

import { useAuth } from "@/components/auth/authContext";
import { AuthProvider } from "@/components/auth/AuthProvider";
import type { AuthState } from "@/lib/supabaseAuth";

function AuthProbe() {
  const authState = useAuth();
  return <div>{authState.profile?.name || "no-profile"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    getStateMock.mockReturnValue({
      user: null,
      profile: { id: "profile-1", user_id: "user-1", name: "Initial", email: "i@example.com", created_at: "", updated_at: "" },
      session: null,
      isAuthenticated: true,
      isLoading: false,
    });
    subscribeMock.mockImplementation((listener) => {
      listener({
        user: null,
        profile: { id: "profile-2", user_id: "user-1", name: "Updated", email: "u@example.com", created_at: "", updated_at: "" },
        session: null,
        isAuthenticated: true,
        isLoading: false,
      });
      return () => undefined;
    });
  });

  it("provides auth state and subscribes to updates", () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </QueryClientProvider>
    );

    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(getStateMock).toHaveBeenCalledTimes(1);
    expect(subscribeMock).toHaveBeenCalledTimes(1);
  });

  const authStateWithUser = (userId: string | null, isLoading = false): AuthState => ({
    user: userId ? ({ id: userId } as AuthState["user"]) : null,
    profile: null,
    session: null,
    isAuthenticated: !!userId,
    isLoading,
  });

  const renderWithListener = () => {
    let authListener: ((state: AuthState) => void) | undefined;
    subscribeMock.mockImplementation((listener) => {
      authListener = listener;
      return () => undefined;
    });
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const removeQueriesSpy = vi.spyOn(queryClient, "removeQueries");

    render(
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AuthProbe />
        </AuthProvider>
      </QueryClientProvider>
    );

    return { emitAuthState: (state: AuthState) => authListener?.(state), removeQueriesSpy };
  };

  it("keeps the query cache when auth resolves to the same user after a cold start", () => {
    localStorage.setItem("score-tracker-last-user", "user-1");
    const { emitAuthState, removeQueriesSpy } = renderWithListener();

    emitAuthState(authStateWithUser(null, true));
    emitAuthState(authStateWithUser("user-1"));

    expect(removeQueriesSpy).not.toHaveBeenCalled();
    expect(invalidateTrackerQueriesMock).not.toHaveBeenCalled();
  });

  it("wipes the query cache when a different user signs in", () => {
    localStorage.setItem("score-tracker-last-user", "user-1");
    const { emitAuthState, removeQueriesSpy } = renderWithListener();

    emitAuthState(authStateWithUser("user-2"));

    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ["tracker"] });
    expect(invalidateTrackerQueriesMock).toHaveBeenCalled();
    expect(localStorage.getItem("score-tracker-last-user")).toBe("user-2");
  });

  it("wipes the query cache on sign-out but not while auth is still resolving", () => {
    localStorage.setItem("score-tracker-last-user", "user-1");
    const { emitAuthState, removeQueriesSpy } = renderWithListener();

    emitAuthState(authStateWithUser(null, true));
    expect(removeQueriesSpy).not.toHaveBeenCalled();

    emitAuthState(authStateWithUser(null, false));
    expect(removeQueriesSpy).toHaveBeenCalledWith({ queryKey: ["tracker"] });
    expect(localStorage.getItem("score-tracker-last-user")).toBeNull();
  });
});
