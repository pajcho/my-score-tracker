import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { getStateMock, subscribeMock } = vi.hoisted(() => ({
  getStateMock: vi.fn(),
  subscribeMock: vi.fn(),
}));

vi.mock("@/lib/supabaseAuth", () => ({
  supabaseAuth: {
    getState: getStateMock,
    subscribe: subscribeMock,
  },
}));

import { useAuth } from "@/components/auth/authContext";
import { AuthProvider } from "@/components/auth/AuthProvider";

function AuthProbe() {
  const authState = useAuth();
  return <div>{authState.profile?.name || "no-profile"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
