import { describe, expect, test } from "vitest";
import { canAttachAutoDrawn, figureBriefScene, figureSceneForEdit, parseFigureBrief, sceneAfterImageChange } from "./figureBrief";

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

describe("figure brief on a question edit", () => {
  const drawn = sceneAfterImageChange(figureBriefScene("X"), "a.png", true);

  test("slot edit replacing an auto-drawn image clears the note", () => {
    const out = figureSceneForEdit(drawn, "a.png", "b.png");
    expect(parseFigureBrief(out.figureScene)?.autoDrawn).toBe(false);
  });

  test("slot edit removing the image re-flags Figure needed", () => {
    expect(parseFigureBrief(figureSceneForEdit(drawn, "a.png", null).figureScene)?.needsFigure).toBe(true);
  });

  test("slot edit keeping the same image leaves figureScene alone", () => {
    expect(figureSceneForEdit(drawn, "a.png", "a.png")).toEqual({});
    expect(figureSceneForEdit(drawn, "a.png", undefined)).toEqual({});
  });
});

describe("auto-draw never replaces an existing figure", () => {
  test("only a question with no image takes an auto-drawn one", () => {
    expect(canAttachAutoDrawn(null)).toBe(true);
    expect(canAttachAutoDrawn("teacher.png")).toBe(false);
  });
});
