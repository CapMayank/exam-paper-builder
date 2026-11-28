import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MatchingCanvas, rightColumnOrder } from "./MatchingCanvas";

const pairs = ["A", "B", "C", "D"].map((l, i) => ({ id: String(i), clipartId: "", label: `w${l}`, matchLabel: l }));

describe("picture match right column", () => {
  it("puts no answer straight across from its own picture when mixing", () => {
    const order = rightColumnOrder(pairs, true);
    expect([...order].sort()).toEqual([0, 1, 2, 3]);
    order.forEach((from, place) => expect(from).not.toBe(place));
  });

  it("mixes the same way every render", () => {
    expect(rightColumnOrder(pairs, true)).toEqual(rightColumnOrder(pairs.map((p) => ({ ...p })), true));
  });

  it("keeps the teacher's order when mixing is off", () => {
    expect(rightColumnOrder(pairs, false)).toEqual([0, 1, 2, 3]);
  });

  it("prints the right column in the mixed order", () => {
    const html = renderToStaticMarkup(<MatchingCanvas pairs={pairs} shuffle />);
    const right = [...html.matchAll(/tracking-wider">([A-D])</g)].map((m) => m[1]);
    expect(right).toEqual(rightColumnOrder(pairs, true).map((i) => pairs[i].matchLabel));
    expect(html).not.toContain("border-dashed");
  });
});
