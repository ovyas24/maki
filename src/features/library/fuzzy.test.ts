import { describe, expect, it } from "vitest";
import { fuzzyScore } from "./fuzzy";

describe("fuzzyScore", () => {
  it("matches subsequences and rejects non-matches", () => {
    expect(fuzzyScore("mby", "Moby-Dick")).not.toBeNull();
    expect(fuzzyScore("xyz", "Moby-Dick")).toBeNull();
  });

  it("is case-insensitive", () => {
    expect(fuzzyScore("MOBY", "moby-dick")).not.toBeNull();
  });

  it("prefers word starts and consecutive runs", () => {
    const exact = fuzzyScore("moby", "Moby-Dick")!;
    const scattered = fuzzyScore("moby", "Anatomy of Beyond")!;
    expect(exact).toBeGreaterThan(scattered);
  });

  it("ignores spaces in the query", () => {
    expect(fuzzyScore("herman melville", "Herman Melville")).not.toBeNull();
  });

  it("empty query matches everything with zero score", () => {
    expect(fuzzyScore("", "anything")).toBe(0);
  });
});
