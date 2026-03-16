import { render, screen } from "@testing-library/react";
import { History } from "lucide-react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/ui/pageHeader";

describe("PageHeader", () => {
  it("renders title, description, status, and actions", () => {
    render(
      <PageHeader
        title="Score History"
        description="View and manage all your recorded games"
        icon={History}
        status={<span>Live</span>}
        actions={<button type="button">Action</button>}
      />
    );

    expect(screen.getByRole("heading", { name: "Score History" })).toBeInTheDocument();
    expect(screen.getByText("View and manage all your recorded games")).toBeInTheDocument();
    expect(screen.getByText("Live")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Action" })).toBeInTheDocument();
  });

  it("can keep the icon visible on mobile layouts when requested", () => {
    const { container } = render(
      <PageHeader
        title="Friends"
        icon={History}
        hideIconOnMobile={false}
      />
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
    expect(container.querySelector(".hidden")).not.toBeInTheDocument();
  });
});
