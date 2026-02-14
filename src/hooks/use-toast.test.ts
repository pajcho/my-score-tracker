import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reducer, useToast } from "@/hooks/use-toast";

describe("toast reducer", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("keeps only one toast when adding multiple items", () => {
    const firstState = reducer(
      { toasts: [] },
      { type: "ADD_TOAST", toast: { id: "1", open: true, title: "First" } }
    );
    const secondState = reducer(firstState, {
      type: "ADD_TOAST",
      toast: { id: "2", open: true, title: "Second" },
    });

    expect(secondState.toasts).toHaveLength(1);
    expect(secondState.toasts[0].id).toBe("2");
  });

  it("updates a toast by id", () => {
    const state = {
      toasts: [{ id: "1", open: true, title: "Initial title" }],
    };

    const updatedState = reducer(state, {
      type: "UPDATE_TOAST",
      toast: { id: "1", title: "Updated title" },
    });

    expect(updatedState.toasts[0].title).toBe("Updated title");
    expect(updatedState.toasts[0].open).toBe(true);
  });

  it("dismisses a specific toast", () => {
    const state = {
      toasts: [
        { id: "1", open: true, title: "Toast 1" },
        { id: "2", open: true, title: "Toast 2" },
      ],
    };

    const dismissedState = reducer(state, {
      type: "DISMISS_TOAST",
      toastId: "1",
    });

    expect(dismissedState.toasts[0].open).toBe(false);
    expect(dismissedState.toasts[1].open).toBe(true);
  });

  it("dismisses all toasts when toast id is omitted", () => {
    const state = {
      toasts: [
        { id: "1", open: true, title: "Toast 1" },
        { id: "2", open: true, title: "Toast 2" },
      ],
    };

    const dismissedState = reducer(state, {
      type: "DISMISS_TOAST",
    });

    expect(dismissedState.toasts.every((toast) => toast.open === false)).toBe(true);
  });

  it("removes a specific toast", () => {
    const state = {
      toasts: [
        { id: "1", open: false, title: "Toast 1" },
        { id: "2", open: true, title: "Toast 2" },
      ],
    };

    const removedState = reducer(state, {
      type: "REMOVE_TOAST",
      toastId: "1",
    });

    expect(removedState.toasts).toHaveLength(1);
    expect(removedState.toasts[0].id).toBe("2");
  });

  it("removes all toasts when toastId is undefined", () => {
    const state = {
      toasts: [
        { id: "1", open: false, title: "Toast 1" },
        { id: "2", open: true, title: "Toast 2" },
      ],
    };
    const removedState = reducer(state, {
      type: "REMOVE_TOAST",
    });
    expect(removedState.toasts).toHaveLength(0);
  });
});

describe("useToast hook", () => {
  it("creates, updates, dismisses and removes a toast", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    let createdToast: ReturnType<typeof result.current.toast> | undefined;
    act(() => {
      createdToast = result.current.toast({
        title: "Initial title",
      });
    });

    expect(result.current.toasts).toHaveLength(1);
    expect(result.current.toasts[0].title).toBe("Initial title");

    act(() => {
      createdToast?.update({
        id: createdToast.id,
        title: "Updated title",
      } as never);
    });

    expect(result.current.toasts[0].title).toBe("Updated title");

    act(() => {
      createdToast?.dismiss();
    });
    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      vi.runOnlyPendingTimers();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("dismisses from onOpenChange and from dismiss() helper", () => {
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Toast title" });
    });

    act(() => {
      result.current.toasts[0].onOpenChange?.(false);
    });

    expect(result.current.toasts[0].open).toBe(false);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("ignores duplicate remove-queue scheduling for the same toast id", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useToast());

    act(() => {
      result.current.toast({ title: "Toast title" });
    });

    act(() => {
      result.current.dismiss(result.current.toasts[0].id);
      result.current.dismiss(result.current.toasts[0].id);
    });

    expect(result.current.toasts[0].open).toBe(false);
  });

  it("executes timeout callback and removes toast from state", () => {
    const originalSetTimeout = globalThis.setTimeout;
    const setTimeoutMock = vi.fn((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 1 as unknown as ReturnType<typeof setTimeout>;
    });
    (globalThis as { setTimeout: typeof setTimeout }).setTimeout = ((callback: TimerHandler) => {
      return setTimeoutMock(callback);
    }) as never;

    try {
      const { result } = renderHook(() => useToast());
      act(() => {
        result.current.toast({ title: "Timeout Toast" });
      });
      expect(result.current.toasts).toHaveLength(1);

      act(() => {
        result.current.dismiss(result.current.toasts[0].id);
      });

      expect(setTimeoutMock).toHaveBeenCalled();
      expect(result.current.toasts[0].open).toBe(false);
    } finally {
      (globalThis as { setTimeout: typeof setTimeout }).setTimeout = originalSetTimeout;
    }
  });
});
