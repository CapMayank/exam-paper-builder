import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { countItemsPlugin, choicesWithCount, countItemsDefaultConfig } from "./countItems";
import type { CountItemsConfig } from "../types";

const Print = countItemsPlugin.renderPrint;
const html = (c: CountItemsConfig) => renderToStaticMarkup(<Print config={c} instructionText="" />);

describe("count items: circle the number", () => {
  it("keeps the right count among the numbers when the count changes", () => {
    expect(choicesWithCount(8, [3, 5, 7], 5)).toEqual([3, 7, 8]);
    expect(choicesWithCount(8, [3, 5, 7])).toContain(8);
    expect(choicesWithCount(5, [3, 5, 7], 4)).toEqual([3, 5, 7]);
  });

  it("offers three numbers around the count when none were given", () => {
    expect(choicesWithCount(1, [])).toEqual([1, 2, 3]);
    expect(choicesWithCount(6, [])).toEqual([5, 6, 7]);
  });

  it("refuses a paper whose numbers don't include the count", () => {
    const c = { ...countItemsDefaultConfig(), answerStyle: "CHOICE_OPTIONS" as const, count: 8, choiceOptions: [3, 5, 7] };
    expect(countItemsPlugin.validateConfig(c).valid).toBe(false);
    expect(countItemsPlugin.validateConfig({ ...c, choiceOptions: [3, 8] }).valid).toBe(true);
  });
});

describe("count items: arranging the pictures", () => {
  const base = { ...countItemsDefaultConfig(), count: 6 };

  it("prints each layout differently", () => {
    const outs = (["GRID", "ROW", "SCATTERED"] as const).map((layout) => html({ ...base, layout }));
    expect(new Set(outs).size).toBe(3);
  });

  it("never hides pictures in a long row of groups", () => {
    const out = html({ ...base, layout: "ROW", count: 15, groups: [{ clipartId: "apple", count: 3 }] });
    expect(out).not.toContain("overflow-hidden");
    expect(out.match(/data-count-item/g)?.length).toBe(18);
  });

  it("prints every picture in each layout", () => {
    for (const layout of ["GRID", "ROW", "SCATTERED"] as const) {
      expect(html({ ...base, layout, count: 12 }).match(/data-count-item/g)?.length).toBe(12);
    }
  });
});
