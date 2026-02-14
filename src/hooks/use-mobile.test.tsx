import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useIsMobile } from "@/hooks/use-mobile";

interface MockMediaQueryList {
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
  dispatchChange: () => void;
}

const installMatchMediaMock = (): MockMediaQueryList => {
  let changeListener: ((event: MediaQueryListEvent) => void) | null = null;

  const addEventListener = vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
    if (eventName === "change") {
      changeListener = listener;
    }
  });

  const removeEventListener = vi.fn((eventName: string, listener: (event: MediaQueryListEvent) => void) => {
    if (eventName === "change" && changeListener === listener) {
      changeListener = null;
    }
  });

  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: vi.fn(() => ({
      matches: window.innerWidth < 768,
      media: "(max-width: 767px)",
      onchange: null,
      addEventListener,
      removeEventListener,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  return {
    addEventListener,
    removeEventListener,
    dispatchChange: () => {
      changeListener?.({ matches: window.innerWidth < 768 } as MediaQueryListEvent);
    },
  };
};

describe("useIsMobile", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns true when viewport width is below mobile breakpoint", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 500,
    });
    installMatchMediaMock();

    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("reacts to media query change events", async () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 1000,
    });
    const mediaQuery = installMatchMediaMock();
    const { result } = renderHook(() => useIsMobile());

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 600,
    });
    mediaQuery.dispatchChange();

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it("subscribes and unsubscribes to matchMedia change events", () => {
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      writable: true,
      value: 900,
    });
    const mediaQuery = installMatchMediaMock();

    const { unmount } = renderHook(() => useIsMobile());
    expect(mediaQuery.addEventListener).toHaveBeenCalledTimes(1);

    unmount();
    expect(mediaQuery.removeEventListener).toHaveBeenCalledTimes(1);
  });
});
