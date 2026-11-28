import { describe, expect, it } from "vitest";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { circleTargetPlugin, circleTargetDefaultConfig, newCircleRow } from "./circleTarget";
import { sequenceChainPlugin, sequenceChainDefaultConfig } from "./sequenceChain";
import { joinDotsDefaultConfig, joinDotsInstruction, JOIN_DOTS_AUTO } from "./joinDots";
import { wordSearchPlugin, wordSearchDefaultConfig } from "./wordSearch";
import { evsSortPlugin, evsSortDefaultConfig, instructionFor } from "./evsSort";
import { colourPlugin, colourDefaultConfig } from "./colourPicture";
import { followMode } from "../autoInstruction";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const render = (plugin: any, config: any) => renderToStaticMarkup(React.createElement(plugin.renderPrint, { config, instructionText: "" }));

describe("circle target", () => {
  it("prints the targetDescription under the instruction", () => {
    const c = { ...circleTargetDefaultConfig(), targetDescription: "Circle the fruits" };
    expect(render(circleTargetPlugin, c)).toContain("Circle the fruits");
  });
  it("rejects rows that are not an array and bad target counts", () => {
    const c = circleTargetDefaultConfig();
    expect(circleTargetPlugin.validateConfig({ ...c, rows: undefined }).valid).toBe(false);
    expect(circleTargetPlugin.validateConfig(c).valid).toBe(true);
    const noTarget = { ...c, rows: [{ items: c.rows[0].items.map((i) => ({ ...i, isTarget: false })) }] };
    expect(circleTargetPlugin.validateConfig(noTarget).valid).toBe(false);
    expect(circleTargetPlugin.validateConfig({ ...noTarget, mode: "FIND_TARGET" }).valid).toBe(false);
    const two = { ...c, rows: [{ items: c.rows[0].items.map((i) => ({ ...i, isTarget: true })) }] };
    expect(circleTargetPlugin.validateConfig(two).valid).toBe(false);
    expect(circleTargetPlugin.validateConfig({ ...two, mode: "FIND_TARGET" }).valid).toBe(true);
  });
  it("varies the target position between new rows", () => {
    const pos = (n: number) => newCircleRow(n).items.findIndex((i) => i.isTarget);
    expect(new Set([0, 1, 2, 3].map(pos)).size).toBe(4);
    expect(newCircleRow(2).items.filter((i) => i.isTarget)).toHaveLength(1);
  });
});

describe("sequence chain", () => {
  it("gives APPLES its own look, not plain bubbles", () => {
    const apples = render(sequenceChainPlugin, { ...sequenceChainDefaultConfig(), theme: "APPLES" });
    expect(apples).toContain("data-apple");
    expect(render(sequenceChainPlugin, { ...sequenceChainDefaultConfig(), theme: "BUBBLES" })).not.toContain("data-apple");
  });
});

describe("join the dots", () => {
  it("names the labels in the automatic instruction and follows a switch", () => {
    expect(joinDotsInstruction("LETTERS", "STAR")).toContain("from A");
    const cfg = joinDotsDefaultConfig();
    expect(cfg.instruction).toBe(joinDotsInstruction("NUMBERS", cfg.shape));
    const next = followMode(cfg.instruction, JOIN_DOTS_AUTO, "LETTERS_OPEN");
    expect(next).toBe(JOIN_DOTS_AUTO.LETTERS_OPEN);
    expect(followMode("My own words", JOIN_DOTS_AUTO, "LETTERS_OPEN")).toBe("My own words");
  });
  it("tells the child to join back to the first dot on closed shapes only", () => {
    expect(joinDotsInstruction("NUMBERS", "STAR")).toMatch(/last dot back to the first/);
    expect(joinDotsInstruction("NUMBERS", "ZIGZAG")).not.toMatch(/back to the first/);
  });
  it("still treats the old default text as automatic", () => {
    expect(followMode("Join the dots in order from 1 and see the picture:", JOIN_DOTS_AUTO, "LETTERS_CLOSED")).toBe(JOIN_DOTS_AUTO.LETTERS_CLOSED);
  });
});

describe("word search print", () => {
  it("omits skipped and empty words and fails validation", () => {
    const base = wordSearchDefaultConfig();
    expect(wordSearchPlugin.validateConfig(base).valid).toBe(true);
    const bad = { ...base, answerLines: true, words: [{ word: "CAT" }, { word: "" }, { word: "ABCDEFGHIJKLMNOP" }] };
    const html = render(wordSearchPlugin, bad);
    expect(html).toContain("(i)");
    expect(html).not.toContain("(ii)");
    const v1 = wordSearchPlugin.validateConfig(bad);
    expect(v1.valid).toBe(false);
    expect(wordSearchPlugin.validateConfig({ ...base, words: [{ word: "CAT" }, { word: "" }] })).toMatchObject({ valid: false });
    expect(wordSearchPlugin.validateConfig({ ...base, words: [{ word: "CAT" }, { word: "ABCDEFGHIJKLMNOP" }] })).toMatchObject({ valid: false, error: expect.stringContaining("ABCDEFGHIJKLMNOP") });
  });
});

describe("evs sort", () => {
  it("fits half a page: four columns", () => {
    const html = render(evsSortPlugin, evsSortDefaultConfig());
    expect(html).toContain("grid-cols-4");
    expect(html).not.toContain("grid-cols-6");
  });
  it("reads correctly for each kind of group name", () => {
    expect(instructionFor("Fruit", "Not a fruit")).toBe("Put a tick (✓) on each picture that is a fruit and a cross (✗) on each picture that is not a fruit:");
    expect(instructionFor("Animal things", "Toy things")).toContain("is an animal thing");
    expect(instructionFor("Animal things", "Toy things")).toContain("is a toy thing");
    expect(instructionFor("Living", "Non-living")).toContain("is living");
    expect(instructionFor("Living", "Non-living")).toContain("is non-living");
    expect(instructionFor("Animal", "Toy")).toContain("is an animal");
  });
});

describe("colour picture", () => {
  it("is half width only when few pictures", () => {
    const c = colourDefaultConfig();
    const half = colourPlugin.halfWidth!;
    expect(half({ ...c, items: c.items.slice(0, 2) })).toBe(true);
    expect(half(c)).toBe(false);
  });
});
