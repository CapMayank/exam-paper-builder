import { describe, expect, test } from "vitest";
import { figureBriefScene, parseFigureBrief, sceneAfterImageChange } from "./figureBrief";

describe("figure brief", () => {
  test("brief round-trip", () => {
    expect(parseFigureBrief(figureBriefScene("Circle, centre O"))).toEqual({
      description: "Circle, centre O",
      needsFigure: true,
      autoDrawn: false,
    });
  });

  test("brief keeps the figure-doc shape the in-app generator uses", () => {
    expect(JSON.parse(figureBriefScene("X"))).toMatchObject({ summary: "X", canvasWidth: 640, canvasHeight: 360, objects: [] });
  });

  test("auto-drawn image clears needsFigure, sets autoDrawn", () => {
    const next = sceneAfterImageChange(figureBriefScene("X"), "a.png", true);
    expect(parseFigureBrief(next)).toEqual({ description: "X", needsFigure: false, autoDrawn: true });
  });

  test("teacher replacing image clears autoDrawn", () => {
    const drawn = sceneAfterImageChange(figureBriefScene("X"), "a.png", true);
    expect(parseFigureBrief(sceneAfterImageChange(drawn, "b.png", undefined))?.autoDrawn).toBe(false);
  });

  test("Looks right clears autoDrawn and keeps the image", () => {
    const drawn = sceneAfterImageChange(figureBriefScene("X"), "a.png", true);
    expect(parseFigureBrief(sceneAfterImageChange(drawn, "a.png", false))).toEqual({ description: "X", needsFigure: false, autoDrawn: false });
  });

  test("removing image re-flags needsFigure", () => {
    const drawn = sceneAfterImageChange(figureBriefScene("X"), "a.png", true);
    expect(parseFigureBrief(sceneAfterImageChange(drawn, null, undefined))).toEqual({ description: "X", needsFigure: true, autoDrawn: false });
  });

  test("non-brief figureScene parses to null and is left untouched", () => {
    const aiDoc = JSON.stringify({ summary: "Ray diagram", canvasWidth: 640, canvasHeight: 360, objects: [{ kind: "line" }] });
    expect(parseFigureBrief(aiDoc)).toBeNull();
    expect(sceneAfterImageChange(aiDoc, "a.png", true)).toBe(aiDoc);
    expect(parseFigureBrief("not json")).toBeNull();
    expect(parseFigureBrief(null)).toBeNull();
    expect(sceneAfterImageChange(null, "a.png", undefined)).toBeNull();
  });
});
