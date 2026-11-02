import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Toaster, toast } from "@/components/ui/sonner";

describe("Toaster", () => {
  it("lets a snackbar be dismissed right away with its close button", async () => {
    render(<Toaster />);

    act(() => {
      toast("+1 you", { duration: 60_000 });
    });

    fireEvent.click(await screen.findByRole("button", { name: "Close toast" }));

    await waitFor(() => {
      expect(screen.queryByText("+1 you")).not.toBeInTheDocument();
    });
  });
});
