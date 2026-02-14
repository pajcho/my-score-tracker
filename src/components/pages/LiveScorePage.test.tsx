import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const navigateMock = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigateMock,
  };
});

vi.mock("@/components/scores/LiveScoreTracker", () => ({
  LiveScoreTracker: ({ onClose, onScoresSaved }: { onClose: () => void; onScoresSaved: () => void }) => (
    <div>
      <button onClick={onClose} type="button">
        Close
      </button>
      <button onClick={onScoresSaved} type="button">
        Saved
      </button>
    </div>
  ),
}));

import { LiveScorePage } from "@/components/pages/LiveScorePage";

describe("LiveScorePage", () => {
  it("navigates home on close and save handlers", () => {
    render(<LiveScorePage />);

    fireEvent.click(screen.getByText("Close"));
    fireEvent.click(screen.getByText("Saved"));

    expect(navigateMock).toHaveBeenCalledTimes(2);
    expect(navigateMock).toHaveBeenCalledWith("/");
  });
});
