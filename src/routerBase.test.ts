import { describe, expect, it } from "vitest";
import { getBaseName } from "@/routerBase";

describe("getBaseName", () => {
  it("returns project basename on GitHub Pages domain", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, hostname: "pajcho.github.io" },
    });
    expect(getBaseName()).toBe("/my-score-tracker");
  });

  it("returns root basename on other domains", () => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...window.location, hostname: "localhost" },
    });
    expect(getBaseName()).toBe("/");
  });
});
