import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import NotFound from "@/pages/NotFound";

describe("NotFound", () => {
  it("renders the 404 message and home link", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    render(
      <MemoryRouter>
        <NotFound />
      </MemoryRouter>
    );

    expect(screen.getByText("404")).toBeInTheDocument();
    expect(screen.getByText("Oops! Page not found")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Return to Home" })).toHaveAttribute("href", "/");
    errorSpy.mockRestore();
  });

  it("logs attempted unknown route path", () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    render(
      <MemoryRouter initialEntries={["/missing-page"]}>
        <NotFound />
      </MemoryRouter>
    );

    expect(errorSpy).toHaveBeenCalledWith(
      "404 Error: User attempted to access non-existent route:",
      "/missing-page"
    );
    errorSpy.mockRestore();
  });
});
