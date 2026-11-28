import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { RowList } from "./index";

const numbers = (html: string) => [...html.matchAll(/text-slate-400">(\d+)<\/span>/g)].map((m) => Number(m[1]));

describe("RowList numbering", () => {
  const props = { label: "Groups", rows: ["a", "b"], onChange: () => {}, makeRow: () => "c", max: 5, addLabel: "Add", renderRow: (r: string) => r };

  it("numbers rows from 1 by default", () => {
    expect(numbers(renderToStaticMarkup(<RowList<string> {...props} />))).toEqual([1, 2]);
  });

  it("continues from an item shown above the list", () => {
    expect(numbers(renderToStaticMarkup(<RowList<string> {...props} startAt={2} />))).toEqual([2, 3]);
  });
});
