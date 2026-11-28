import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AnswerLinesBody, answerLinesPlugin } from "./answerLines";
import { missingLettersPlugin } from "./missingLetters";
import { comparePlugin, compareDefaultConfig } from "./compare";

describe("answer lines with older or odd configs", () => {
  const base = answerLinesPlugin.defaultConfig();

  it("prints a saved config that has no answer label", () => {
    const old = { ...base, answerLabel: undefined as unknown as string };
    expect(() => renderToStaticMarkup(<AnswerLinesBody config={old} />)).not.toThrow();
  });

  it("prints some lines when the line count is missing", () => {
    const html = renderToStaticMarkup(<AnswerLinesBody config={{ ...base, style: "LIST", listCount: NaN }} />);
    expect(html.match(/border-b-2/g)?.length).toBeGreaterThan(0);
  });

  it("gives a long Hindi prompt room beside its line", () => {
    const html = renderToStaticMarkup(<AnswerLinesBody config={{ ...base, style: "BESIDE", rows: [{ prompt: "मेरे विद्यालय का नाम" }] }} />);
    const width = Number(html.match(/min-width:\s*([\d.]+)ch/)?.[1]);
    expect(width).toBeGreaterThanOrEqual(20);
  });
});

describe("missing letters", () => {
  it("lets a long word's boxes wrap instead of running off the page", () => {
    const c = { ...missingLettersPlugin.defaultConfig(), items: [{ word: "ELEPHANTFOOT", blanks: [1, 3] }] };
    const html = renderToStaticMarkup(<missingLettersPlugin.renderPrint config={c} instructionText="" />);
    expect(html).toContain("flex-wrap");
    expect(html).toContain("grid-cols-1");
  });
});

describe("compare", () => {
  it("wraps its pairs to the room it has, so half width never overflows", () => {
    const html = renderToStaticMarkup(<comparePlugin.renderPrint config={compareDefaultConfig()} instructionText="" />);
    expect(html).toContain("auto-fill");
  });
});
