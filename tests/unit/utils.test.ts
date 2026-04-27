import { describe, it, expect } from "vitest";
import { getUniqueSessionName } from "../../src/sidepanel/shared/utils";

describe("getUniqueSessionName", () => {
  it("returns the base name when no duplicates exist", () => {
    expect(getUniqueSessionName("Call Script", {})).toBe("Call Script");
  });

  it("returns Name (2) when Name exists", () => {
    const sessions = { a: { name: "Call Script" } };
    expect(getUniqueSessionName("Call Script", sessions)).toBe(
      "Call Script (2)",
    );
  });

  it("returns Name (3) when Name and Name (2) exist", () => {
    const sessions = {
      a: { name: "Call Script" },
      b: { name: "Call Script (2)" },
    };
    expect(getUniqueSessionName("Call Script", sessions)).toBe(
      "Call Script (3)",
    );
  });
});
