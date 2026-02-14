import { describe, expect, it, vi } from "vitest";

const renderMock = vi.fn();
const createRootMock = vi.fn(() => ({ render: renderMock }));

vi.mock("react-dom/client", () => ({
  createRoot: createRootMock,
}));

vi.mock("@/App.tsx", () => ({
  default: () => <div>App</div>,
}));

describe("main entrypoint", () => {
  it("mounts App into root element", async () => {
    document.body.innerHTML = '<div id="root"></div>';
    await import("@/main");
    expect(createRootMock).toHaveBeenCalledWith(document.getElementById("root"));
    expect(renderMock).toHaveBeenCalledTimes(1);
  });
});
