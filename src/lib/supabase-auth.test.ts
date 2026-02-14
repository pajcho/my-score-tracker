import { beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMockHarness, type SupabaseMockHarness } from "@/test/supabase-mock";

let harness: SupabaseMockHarness;

describe("supabaseAuth", () => {
  beforeEach(() => {
    vi.resetModules();
    harness = createSupabaseMockHarness();
    vi.doMock("@/integrations/supabase/client", () => ({
      supabase: harness.supabase,
    }));
    vi.useRealTimers();
  });

  it("starts unauthenticated when no session exists", async () => {
    harness.supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    const { supabaseAuth } = await import("@/lib/supabase-auth");

    await Promise.resolve();

    const state = supabaseAuth.getState();
    expect(state.isLoading).toBe(false);
  });

  it("calls signUp with redirect and metadata", async () => {
    const { supabaseAuth } = await import("@/lib/supabase-auth");
    await supabaseAuth.signUp("new@example.com", "password123", "Nikola");

    expect(harness.supabase.auth.signUp).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          name: "Nikola",
        },
      },
    });
  });

  it("calls signIn with password credentials", async () => {
    const { supabaseAuth } = await import("@/lib/supabase-auth");
    await supabaseAuth.signIn("new@example.com", "password123");
    expect(harness.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: "new@example.com",
      password: "password123",
    });
  });

  it("resets local auth state on successful signOut", async () => {
    const { supabaseAuth } = await import("@/lib/supabase-auth");
    await supabaseAuth.signOut();
    expect(supabaseAuth.getState()).toEqual({
      user: null,
      profile: null,
      session: null,
      isAuthenticated: false,
      isLoading: false,
    });
  });

  it("loads profile after auth state change to signed-in user", async () => {
    vi.useFakeTimers();
    let authStateListener: ((event: string, session: unknown) => void) | undefined;

    harness.supabase.auth.onAuthStateChange.mockImplementation((listener) => {
      authStateListener = listener;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    const profilesBuilder = harness.getBuilder("profiles");
    profilesBuilder.single.mockResolvedValue({
      data: { user_id: "user-1", name: "Nikola", email: "user@example.com" },
      error: null,
    });

    const { supabaseAuth } = await import("@/lib/supabase-auth");
    const observedStates: Array<{ isLoading: boolean; isAuthenticated: boolean; hasProfile: boolean }> = [];
    supabaseAuth.subscribe((state) => {
      observedStates.push({
        isLoading: state.isLoading,
        isAuthenticated: state.isAuthenticated,
        hasProfile: !!state.profile,
      });
    });

    authStateListener?.("SIGNED_IN", {
      user: { id: "user-1", email: "user@example.com" },
    });

    await vi.runAllTimersAsync();

    const finalState = supabaseAuth.getState();
    expect(finalState.isAuthenticated).toBe(true);
    expect(finalState.profile?.name).toBe("Nikola");
    expect(observedStates.some((state) => state.isLoading)).toBe(true);
  });

  it("keeps state when signOut returns error", async () => {
    harness.supabase.auth.signOut.mockResolvedValueOnce({
      error: { message: "cannot sign out" },
    });
    const { supabaseAuth } = await import("@/lib/supabase-auth");
    const previousState = supabaseAuth.getState();

    const result = await supabaseAuth.signOut();

    expect(result.error).toEqual({ message: "cannot sign out" });
    expect(supabaseAuth.getState()).toEqual(previousState);
  });

  it("handles profile loading errors by clearing profile", async () => {
    vi.useFakeTimers();
    let authStateListener: ((event: string, session: unknown) => void) | undefined;
    harness.supabase.auth.onAuthStateChange.mockImplementation((listener) => {
      authStateListener = listener;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });
    const profilesBuilder = harness.getBuilder("profiles");
    profilesBuilder.single.mockResolvedValue({
      data: null,
      error: { message: "profile missing" },
    });
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const { supabaseAuth } = await import("@/lib/supabase-auth");
    authStateListener?.("SIGNED_IN", {
      user: { id: "user-1", email: "user@example.com" },
    });
    await vi.runAllTimersAsync();

    expect(supabaseAuth.getState().profile).toBeNull();
    expect(errorSpy).toHaveBeenCalledWith("Error loading profile:", expect.anything());
    errorSpy.mockRestore();
  });

  it("handles SIGNED_OUT auth event by clearing profile and stopping loading", async () => {
    vi.useFakeTimers();
    let authStateListener: ((event: string, session: unknown) => void) | undefined;
    harness.supabase.auth.onAuthStateChange.mockImplementation((listener) => {
      authStateListener = listener;
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn(),
          },
        },
      };
    });

    const { supabaseAuth } = await import("@/lib/supabase-auth");
    authStateListener?.("SIGNED_OUT", null);
    await vi.runAllTimersAsync();

    expect(supabaseAuth.getState()).toEqual(
      expect.objectContaining({
        profile: null,
        isLoading: false,
        isAuthenticated: false,
      })
    );
  });

  it("exposes getter helpers and unsubscribe from subscribe", async () => {
    const { supabaseAuth } = await import("@/lib/supabase-auth");
    const listener = vi.fn();
    const unsubscribe = supabaseAuth.subscribe(listener);

    expect(listener).toHaveBeenCalled();
    expect(supabaseAuth.getCurrentUser()).toBeNull();
    expect(supabaseAuth.getCurrentProfile()).toBeNull();
    expect(supabaseAuth.isAuthenticated()).toBe(false);
    expect(supabaseAuth.isLoading()).toBeDefined();

    unsubscribe();
  });

  it("initializes authenticated state from existing session and unsubscribes on beforeunload", async () => {
    const unsubscribeMock = vi.fn();
    harness.supabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: unsubscribeMock,
        },
      },
    });
    harness.supabase.auth.getSession.mockResolvedValueOnce({
      data: {
        session: {
          user: { id: "user-1", email: "user@example.com" },
        },
      },
    });
    const profilesBuilder = harness.getBuilder("profiles");
    profilesBuilder.single.mockResolvedValue({
      data: { user_id: "user-1", name: "Existing User", email: "user@example.com" },
      error: null,
    });

    const { supabaseAuth } = await import("@/lib/supabase-auth");
    await Promise.resolve();

    expect(supabaseAuth.getState()).toEqual(
      expect.objectContaining({
        isAuthenticated: true,
        isLoading: false,
      })
    );

    window.dispatchEvent(new Event("beforeunload"));
    expect(unsubscribeMock).toHaveBeenCalledTimes(1);
  });
});
