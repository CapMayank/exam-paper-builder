import { describe, expect, it } from "vitest";
import { isKindergartenType, isPrePrimaryClass } from "./constants";
import {
  getAllKindergartenActivities,
  getKindergartenActivity,
  parseKindergartenConfig,
  serializeKindergartenConfig,
} from "./kindergarten/registry";
import { CLIPART_LIBRARY, getClipartById, searchClipart } from "./kindergarten/clipartLibrary";

describe("Kindergarten Activity Plugin Registry", () => {
  it("registers all 6 core kindergarten activities", () => {
    const activities = getAllKindergartenActivities();
    const types = activities.map((a) => a.type);

    expect(types).toContain("KDG_TRACE_WRITE");
    expect(types).toContain("KDG_NUMBER_GRID");
    expect(types).toContain("KDG_PICTURE_MATCH");
    expect(types).toContain("KDG_COUNT_ITEMS");
    expect(types).toContain("KDG_CIRCLE_TARGET");
    expect(types).toContain("KDG_SEQUENCE_CHAIN");
  });

  it("identifies kindergarten question types correctly", () => {
    expect(isKindergartenType("KDG_TRACE_WRITE")).toBe(true);
    expect(isKindergartenType("KDG_NUMBER_GRID")).toBe(true);
    expect(isKindergartenType("KDG_PICTURE_MATCH")).toBe(true);
    expect(isKindergartenType("KDG_COUNT_ITEMS")).toBe(true);
    expect(isKindergartenType("KDG_CIRCLE_TARGET")).toBe(true);
    expect(isKindergartenType("KDG_SEQUENCE_CHAIN")).toBe(true);

    expect(isKindergartenType("MCQ")).toBe(false);
    expect(isKindergartenType("SHORT")).toBe(false);
    expect(isKindergartenType("DRAW")).toBe(false);
    expect(isKindergartenType(null)).toBe(false);
  });

  it("correctly identifies pre-primary classes", () => {
    expect(isPrePrimaryClass("Nursery")).toBe(true);
    expect(isPrePrimaryClass("LKG")).toBe(true);
    expect(isPrePrimaryClass("UKG")).toBe(true);
    expect(isPrePrimaryClass("KG 1")).toBe(true);
    expect(isPrePrimaryClass("KG-2")).toBe(true);
    expect(isPrePrimaryClass("Playgroup")).toBe(true);

    expect(isPrePrimaryClass("Class 1")).toBe(false);
    expect(isPrePrimaryClass("Class 8")).toBe(false);
    expect(isPrePrimaryClass("Class 10")).toBe(false);
    expect(isPrePrimaryClass("Class 12")).toBe(false);
  });

  it("roundtrips kindergarten activity configurations", () => {
    const countPlugin = getKindergartenActivity("KDG_COUNT_ITEMS")!;
    expect(countPlugin).toBeDefined();

    const sampleConfig = {
      clipartId: "balloon",
      count: 7,
      layout: "GRID",
      answerStyle: "SQUARE_BOX",
      objectName: "balloons",
      instruction: "Count the balloons:",
    };

    const serialized = serializeKindergartenConfig(sampleConfig);
    const parsed = parseKindergartenConfig("KDG_COUNT_ITEMS", serialized);

    expect(parsed.clipartId).toBe("balloon");
    expect(parsed.count).toBe(7);
    expect(parsed.objectName).toBe("balloons");
  });
});

describe("Kindergarten Clipart Library", () => {
  it("contains essential preschool outline objects", () => {
    const ids = CLIPART_LIBRARY.map((c) => c.id);
    expect(ids).toContain("balloon");
    expect(ids).toContain("ball");
    expect(ids).toContain("cat");
    expect(ids).toContain("dog");
    expect(ids).toContain("apple");
    expect(ids).toContain("star");
    expect(ids).toContain("sun");
    expect(ids).toContain("tree");
  });

  it("supports instant keyword search and category filtering", () => {
    const balloonResults = searchClipart("balloon");
    expect(balloonResults.length).toBeGreaterThan(0);
    expect(balloonResults[0].id).toBe("balloon");

    const fruitResults = searchClipart("", "fruits");
    expect(fruitResults.every((f) => f.category === "fruits")).toBe(true);
    expect(fruitResults.some((f) => f.id === "apple")).toBe(true);

    const fetched = getClipartById("cat");
    expect(fetched).toBeDefined();
    expect(fetched?.name).toBe("Cat");
  });
});

describe("Later kindergarten activities", () => {
  const NEW_TYPES = [
    "KDG_MISSING_LETTERS",
    "KDG_PATTERN",
    "KDG_PICTURE_SUM",
    "KDG_COMPARE",
    "KDG_COLOUR",
    "KDG_JOIN_DOTS",
    "KDG_TICK_PICTURE",
    "KDG_PREWRITING",
  ];

  it("registers every new activity with valid default content", () => {
    for (const type of NEW_TYPES) {
      const plugin = getKindergartenActivity(type);
      expect(plugin, type).toBeDefined();
      expect(isKindergartenType(type)).toBe(true);
      expect(plugin!.validateConfig(plugin!.defaultConfig()).valid, type).toBe(true);
    }
  });

  it("only uses clipart that exists in the library", async () => {
    const ids = new Set<string>();
    for (const type of NEW_TYPES) {
      const cfg = JSON.stringify(getKindergartenActivity(type)!.defaultConfig());
      for (const m of cfg.matchAll(/"(?:clipartId)":"([a-z]+)"/g)) ids.add(m[1]);
      for (const m of cfg.matchAll(/"options":\[([^\]]*)\]/g)) m[1].split(",").forEach((x) => ids.add(x.replace(/"/g, "")));
    }
    for (const id of ids) expect(getClipartById(id), id).toBeDefined();
  });

  it("expands patterns with trailing blanks", async () => {
    const { expandPattern } = await import("./kindergarten/activities/pattern");
    const seq = expandPattern({ unit: ["circle", "square"], repeats: 3, blanksAtEnd: 2 });
    expect(seq).toEqual(["circle", "square", "circle", "square", null, null]);
    // never blanks out the whole pattern
    expect(expandPattern({ unit: ["star"], repeats: 2, blanksAtEnd: 9 })).toEqual(["star", null]);
  });

  it("places the requested number of join-the-dots points", async () => {
    const { dotPoints } = await import("./kindergarten/activities/joinDots");
    for (const shape of ["TRIANGLE", "SQUARE", "STAR", "HOUSE", "STAIRS", "ZIGZAG", "CIRCLE"] as const) {
      const pts = dotPoints(shape, 12);
      expect(pts).toHaveLength(12);
      for (const p of pts) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(200);
        expect(p.y).toBeGreaterThanOrEqual(0);
        expect(p.y).toBeLessThanOrEqual(150);
      }
    }
  });

  it("works out the correct side for compare questions", async () => {
    const { correctSide } = await import("./kindergarten/activities/compare");
    expect(correctSide("BIGGER", { clipartId: "ball", left: 2, right: 4 })).toBe(1);
    expect(correctSide("SMALLER", { clipartId: "ball", left: 2, right: 4 })).toBe(0);
    expect(correctSide("MORE", { clipartId: "ball", left: 5, right: 3 })).toBe(0);
    expect(correctSide("FEWER", { clipartId: "ball", left: 5, right: 3 })).toBe(1);
    expect(correctSide("TALLER", { clipartId: "ball", left: 3, right: 3 })).toBe(-1);
  });

  it("prints Nursery, LKG and UKG papers as A4 portrait pages by default", async () => {
    const { defaultLayoutForClass } = await import("./constants");
    for (const c of ["Nursery", "LKG", "UKG", "KG 1"]) expect(defaultLayoutForClass(c)).toBe("PAGE");
    for (const c of ["Class 1", "Class 10", undefined]) expect(defaultLayoutForClass(c)).toBe("BOOKLET_A4");
  });
});

describe("Exam types and worksheet page fit", () => {
  it("offers Unit Test and Pre-Board next to Quarterly, Half Yearly and Annual", async () => {
    const { EXAM_TYPES, EXAM_TYPE_LABEL, inferExamTypeFromText } = await import("./constants");
    expect(EXAM_TYPES).toEqual(["UNIT_TEST", "QUARTERLY", "HALF_YEARLY", "PRE_BOARD", "ANNUAL"]);
    for (const t of EXAM_TYPES) expect(EXAM_TYPE_LABEL[t]).toBeTruthy();
    expect(inferExamTypeFromText("Class 10 Pre Board Examination")).toBe("PRE_BOARD");
    expect(inferExamTypeFromText("Pre-Board 2026")).toBe("PRE_BOARD");
    expect(inferExamTypeFromText("Unit Test 2 – Science")).toBe("UNIT_TEST");
    expect(inferExamTypeFromText("Half Yearly Exam")).toBe("HALF_YEARLY");
    expect(inferExamTypeFromText("Quarterly")).toBe("QUARTERLY");
  });

  it("steps worksheet scale down gradually and stops at the floor", async () => {
    const { WORKSHEET_FIT_LEVELS, WORKSHEET_MAX_PAGES, getFit, nextFitLevel } = await import("./printFit");
    expect(WORKSHEET_MAX_PAGES).toBe(2);
    expect(WORKSHEET_FIT_LEVELS[0].zoom).toBe(1);
    for (let i = 1; i < WORKSHEET_FIT_LEVELS.length; i++) {
      expect(WORKSHEET_FIT_LEVELS[i].zoom).toBeLessThan(WORKSHEET_FIT_LEVELS[i - 1].zoom);
    }
    const last = WORKSHEET_FIT_LEVELS.length - 1;
    expect(WORKSHEET_FIT_LEVELS[last].zoom).toBeGreaterThanOrEqual(0.4);
    expect(getFit(99, WORKSHEET_FIT_LEVELS).level).toBe(last);
    expect(nextFitLevel(0, 2, 2, last)).toBeNull(); // already fits
    expect(nextFitLevel(0, 3, 2, last)).toBe(1); // too long -> next step
    expect(nextFitLevel(last, 5, 2, last)).toBeNull(); // nothing tighter left
  });
});
