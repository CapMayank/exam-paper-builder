import { describe, expect, it } from "vitest";
import { arrangeOrderPlugin } from "./arrangeOrder";
import { joinLettersPlugin } from "./joinLetters";
import { textMatchPlugin } from "./textMatch";
import { hindiMissingPlugin, configForMode, hindiMissingDefaultConfig } from "./hindiMissing";
import { newTickRow, tickPicturePlugin } from "./tickPicture";

describe("rows left empty would print blank lines for the child", () => {
  it("arrange order refuses an empty row", () => {
    const c = arrangeOrderPlugin.defaultConfig();
    expect(arrangeOrderPlugin.validateConfig(c).valid).toBe(true);
    expect(arrangeOrderPlugin.validateConfig({ ...c, rows: [...c.rows, { items: [] }] }).valid).toBe(false);
  });

  it("join the letters refuses a word with no letters", () => {
    const c = joinLettersPlugin.defaultConfig();
    expect(joinLettersPlugin.validateConfig(c).valid).toBe(true);
    expect(joinLettersPlugin.validateConfig({ ...c, rows: [...c.rows, { parts: [] }] }).valid).toBe(false);
  });

  it("match the columns refuses a half-filled pair", () => {
    const c = textMatchPlugin.defaultConfig();
    expect(textMatchPlugin.validateConfig(c).valid).toBe(true);
    expect(textMatchPlugin.validateConfig({ ...c, pairs: [...c.pairs, { left: "cat", right: " " }] }).valid).toBe(false);
  });

  it("add-the-matra refuses an empty word", () => {
    const c = configForMode(hindiMissingDefaultConfig(), "ADD_MATRA");
    expect(hindiMissingPlugin.validateConfig(c).valid).toBe(true);
    expect(hindiMissingPlugin.validateConfig({ ...c, rows: [...c.rows, { text: "", answer: "", blanks: [] }] }).valid).toBe(false);
  });

  it("missing letter rows need a blank to fill", () => {
    const c = hindiMissingDefaultConfig();
    expect(hindiMissingPlugin.validateConfig({ ...c, rows: [{ text: "क ख ग", blanks: [] }] }).valid).toBe(false);
  });
});

describe("new tick-the-picture questions", () => {
  it("don't always put the answer first", () => {
    expect(new Set([0, 1, 2].map((n) => newTickRow(n).correctIndex)).size).toBe(3);
  });

  it("refuse a question left blank", () => {
    const c = tickPicturePlugin.defaultConfig();
    expect(tickPicturePlugin.validateConfig(c).valid).toBe(true);
    expect(tickPicturePlugin.validateConfig({ ...c, rows: [...c.rows, newTickRow(3)] }).valid).toBe(false);
  });
});
