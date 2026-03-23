import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

// Opt-in to React Router v7 future flags globally so individual tests
// don't need to pass them to every <MemoryRouter>.
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");

  const MemoryRouterWithFuture = ({ children, future, ...rest }: React.ComponentProps<typeof actual.MemoryRouter>) => (
    <actual.MemoryRouter
      {...rest}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true, ...future }}
    >
      {children}
    </actual.MemoryRouter>
  );

  return { ...actual, MemoryRouter: MemoryRouterWithFuture };
});

afterEach(() => {
  cleanup();
});
