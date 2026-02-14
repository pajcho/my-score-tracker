import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Index from "@/pages/Index";

describe("Index", () => {
  it("renders placeholder welcome content", () => {
    render(<Index />);
    expect(screen.getByText("Welcome to Your Blank App")).toBeInTheDocument();
    expect(screen.getByText("Start building your amazing project here!")).toBeInTheDocument();
  });
});
