import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and removes tailwind conflicts", () => {
    const optionalHiddenClassName: string | undefined = undefined;
    const mergedClassName = cn("p-2 text-sm", optionalHiddenClassName, "text-lg");
    expect(mergedClassName).toBe("p-2 text-lg");
  });

  it("keeps non-conflicting class names", () => {
    const mergedClassName = cn("px-4", "font-semibold", "bg-blue-500");
    expect(mergedClassName).toBe("px-4 font-semibold bg-blue-500");
  });
});
