import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { AuthContext } from "@/components/auth/authContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import type { AuthState } from "@/lib/supabaseAuth";

const baseAuthState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isAuthenticated: false,
  isLoading: false,
};

const renderWithAuthState = (authState: AuthState) => {
  return render(
    <AuthContext.Provider value={authState}>
      <MemoryRouter initialEntries={["/private"]}>
        <Routes>
          <Route
            path="/private"
            element={
              <ProtectedRoute>
                <div>Protected content</div>
              </ProtectedRoute>
            }
          />
          <Route path="/login" element={<div>Login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
};

describe("ProtectedRoute", () => {
  it("renders loading UI while auth state is loading", () => {
    renderWithAuthState({ ...baseAuthState, isLoading: true });
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("redirects unauthenticated users to login", () => {
    renderWithAuthState(baseAuthState);
    expect(screen.getByText("Login page")).toBeInTheDocument();
  });

  it("renders protected content for authenticated users", () => {
    renderWithAuthState({
      ...baseAuthState,
      user: { id: "user-1" } as AuthState["user"],
      isAuthenticated: true,
    });
    expect(screen.getByText("Protected content")).toBeInTheDocument();
  });
});
