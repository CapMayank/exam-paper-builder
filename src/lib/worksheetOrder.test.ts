import { describe, expect, it } from "vitest";
import { moveToIndex } from "./worksheetOrder";

describe("moveToIndex", () => {
  const ids = ["a", "b", "c", "d"];
  it("moves an activity down", () => expect(moveToIndex(ids, "a", 2)).toEqual(["b", "c", "a", "d"]));
  it("moves an activity up", () => expect(moveToIndex(ids, "d", 0)).toEqual(["d", "a", "b", "c"]));
  it("clamps past the end", () => expect(moveToIndex(ids, "b", 99)).toEqual(["a", "c", "d", "b"]));
  it("clamps below zero", () => expect(moveToIndex(ids, "c", -3)).toEqual(["c", "a", "b", "d"]));
  it("leaves the order alone for an unknown id", () => expect(moveToIndex(ids, "z", 1)).toEqual(ids));
});
