import { describe, expect, it } from "vitest";
import { buildWordSearch, wordSearchDefaultConfig } from "./activities/wordSearch";

describe("buildWordSearch", () => {
  const config = wordSearchDefaultConfig();

  it("gives the same grid for the same config", () => {
    expect(buildWordSearch(config)).toEqual(buildWordSearch({ ...config }));
  });

  it("reads every placed word from its start in its direction", () => {
    const { grid, placed } = buildWordSearch(config);
    for (const p of placed) {
      const read = Array.from(p.word, (_, k) => grid[p.row + (p.down ? k : 0)][p.col + (p.down ? 0 : k)]).join("");
      expect(read).toBe(p.word);
    }
  });

  it("fills rows x cols with letters A-Z", () => {
    const { grid } = buildWordSearch(config);
    expect(grid).toHaveLength(config.rows);
    for (const r of grid) {
      expect(r).toHaveLength(config.cols);
      for (const c of r) expect(c).toMatch(/^[A-Z]$/);
    }
  });

  it("skips a word longer than both sides", () => {
    const { skipped, placed } = buildWordSearch({ ...config, words: [{ word: "ABCDEFGHIJKLMNOP" }, { word: "CAT" }] });
    expect(skipped).toEqual(["ABCDEFGHIJKLMNOP"]);
    expect(placed.map((p) => p.word)).toEqual(["CAT"]);
  });
});
