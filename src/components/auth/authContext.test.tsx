import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, useAuth } from "@/components/auth/authContext";

describe("useAuth", () => {
  it("throws when used outside provider", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderHook(() => useAuth())).toThrow("useAuth must be used within AuthProvider");
    errorSpy.mockRestore();
  });

  it("returns context value from provider", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AuthContext.Provider
        value={{
          user: null,
          profile: { id: "p1", user_id: "u1", name: "Nikola", email: "n@example.com", created_at: "", updated_at: "" },
          session: null,
          isAuthenticated: true,
          isLoading: false,
        }}
      >
        {children}
      </AuthContext.Provider>
    );

    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.profile?.name).toBe("Nikola");
    expect(result.current.isAuthenticated).toBe(true);
  });
});
