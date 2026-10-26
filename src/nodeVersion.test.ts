import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

describe("Node version", () => {
  it("keeps package.json engines in sync with .nvmrc", () => {
    const nvmrcMajor = readFileSync(".nvmrc", "utf8").trim().replace(/^v/, "");

    expect(packageJson.engines.node).toBe(`${nvmrcMajor}.x`);
  });
});
