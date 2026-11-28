import { describe, expect, it } from "vitest";
import { moveToIndex, sectionOrderFor } from "./worksheetOrder";

describe("moveToIndex", () => {
  const ids = ["a", "b", "c", "d"];
  it("moves an activity down", () => expect(moveToIndex(ids, "a", 2)).toEqual(["b", "c", "a", "d"]));
  it("moves an activity up", () => expect(moveToIndex(ids, "d", 0)).toEqual(["d", "a", "b", "c"]));
  it("clamps past the end", () => expect(moveToIndex(ids, "b", 99)).toEqual(["a", "c", "d", "b"]));
  it("clamps below zero", () => expect(moveToIndex(ids, "c", -3)).toEqual(["c", "a", "b", "d"]));
  it("leaves the order alone for an unknown id", () => expect(moveToIndex(ids, "z", 1)).toEqual(ids));
});

describe("sectionOrderFor", () => {
  const items = [
    { id: "q1", sectionId: "s1" },
    { id: "q2", sectionId: "s2" },
    { id: "q3", sectionId: "s3" },
  ];

  it("gives the sections in the order of the activities", () => {
    expect(sectionOrderFor(items, ["q3", "q1", "q2"])).toEqual(["s3", "s1", "s2"]);
  });

  it("refuses a list that is missing an activity", () => {
    expect(sectionOrderFor(items, ["q3", "q1"])).toBeNull();
  });

  it("refuses a list with an unknown or repeated activity", () => {
    expect(sectionOrderFor(items, ["q3", "q1", "q9"])).toBeNull();
    expect(sectionOrderFor(items, ["q3", "q1", "q1"])).toBeNull();
  });
});
