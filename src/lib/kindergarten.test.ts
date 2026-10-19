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
