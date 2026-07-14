import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const { useHasHoverMock } = vi.hoisted(() => ({ useHasHoverMock: vi.fn() }));

vi.mock("@/hooks/useHasHover", () => ({
  useHasHover: () => useHasHoverMock(),
}));

// Surface the controlled `open` state without pulling in Radix's portal.
vi.mock("@/components/ui/popover", () => ({
  Popover: ({ open, children }: { open: boolean; children: React.ReactNode }) => (
    <div data-testid="popover" data-open={String(open)}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => children,
  PopoverContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

import { ChartHint } from "@/components/ui/chartHint";

describe("ChartHint", () => {
  it("opens on hover and closes on leave on pointer devices", () => {
    useHasHoverMock.mockReturnValue(true);
    render(
      <ChartHint content="Win vs Ana">
        <button type="button">W</button>
      </ChartHint>
    );

    const popover = screen.getByTestId("popover");
    expect(popover).toHaveAttribute("data-open", "false");

    fireEvent.mouseEnter(screen.getByRole("button", { name: "W" }));
    expect(popover).toHaveAttribute("data-open", "true");

    fireEvent.mouseLeave(screen.getByRole("button", { name: "W" }));
    expect(popover).toHaveAttribute("data-open", "false");
  });

  it("does not wire hover on touch devices (tap-to-open is left to the popover)", () => {
    useHasHoverMock.mockReturnValue(false);
    render(
      <ChartHint content="Win vs Ana">
        <button type="button">W</button>
      </ChartHint>
    );

    fireEvent.mouseEnter(screen.getByRole("button", { name: "W" }));
    expect(screen.getByTestId("popover")).toHaveAttribute("data-open", "false");
  });

  it("renders the trigger and its hint content", () => {
    useHasHoverMock.mockReturnValue(true);
    render(
      <ChartHint content="Win vs Ana (7-5)">
        <button type="button" aria-label="Jul 6: 1 game" />
      </ChartHint>
    );

    expect(screen.getByLabelText("Jul 6: 1 game")).toBeInTheDocument();
    expect(screen.getByText("Win vs Ana (7-5)")).toBeInTheDocument();
  });
});
