import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/toaster", () => ({
  Toaster: () => <div>Toaster</div>,
}));

vi.mock("@/components/ui/sonner", () => ({
  Toaster: () => <div>Sonner</div>,
}));

vi.mock("@/components/ui/theme-provider", () => ({
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/ui/tooltip", () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/auth/AuthProvider", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/routes", () => ({
  router: { id: "router" },
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    RouterProvider: () => <div>RouterProvider</div>,
  };
});

import App from "@/App";

describe("App", () => {
  it("renders root providers and router", () => {
    render(<App />);
    expect(screen.getByText("Toaster")).toBeInTheDocument();
    expect(screen.getByText("Sonner")).toBeInTheDocument();
    expect(screen.getByText("RouterProvider")).toBeInTheDocument();
  });
});
