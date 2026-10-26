import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import packageJson from "../package.json";

describe("Node version", () => {
  // engines stays a lower bound because Vercel picks its Node version from it
  // and rejects majors it doesn't offer yet (26.x failed on 2026-10-26).
  it("allows the .nvmrc major in package.json engines", () => {
    const nvmrcMajor = Number(readFileSync(".nvmrc", "utf8").trim().replace(/^v/, ""));
    const enginesMinimum = Number(packageJson.engines.node.match(/^>=(\d+)$/)?.[1]);

    expect(enginesMinimum).toBeLessThanOrEqual(nvmrcMajor);
  });
});
