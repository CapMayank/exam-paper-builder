import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { verticalSumDefaultConfig, verticalSumPlugin, VerticalSumBody } from "./verticalSum";

describe("vertical sums for KG", () => {
  it("refuses a take-away that goes below zero", () => {
    const c = { ...verticalSumDefaultConfig(), op: "SUBTRACT" as const, rows: [{ a: 5, b: 2 }, { a: 2, b: 7 }] };
    expect(verticalSumPlugin.validateConfig(c).valid).toBe(false);
    expect(verticalSumPlugin.validateConfig({ ...c, rows: [{ a: 5, b: 2 }] }).valid).toBe(true);
  });

  it("leaves a single-digit answer box wide enough to write in", () => {
    const html = renderToStaticMarkup(<VerticalSumBody config={{ ...verticalSumDefaultConfig(), rows: [{ a: 2, b: 3 }] }} />);
    expect(html).toMatch(/min-width:\s*3rem/);
  });
});
