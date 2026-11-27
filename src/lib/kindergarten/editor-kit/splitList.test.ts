import { describe, expect, it } from "vitest";
import { splitList } from "./splitList";

describe("splitList", () => {
  it("splits on spaces", () => expect(splitList("A B C")).toEqual(["A", "B", "C"]));
  it("splits on commas and repeated spaces", () => expect(splitList("A, B  C")).toEqual(["A", "B", "C"]));
  it("drops empty pieces", () => expect(splitList(" ,, ")).toEqual([]));
  it("keeps Hindi letters whole", () => expect(splitList("क ख ग")).toEqual(["क", "ख", "ग"]));
  it("splits on new lines", () => expect(splitList("cat,dog\nsun")).toEqual(["cat", "dog", "sun"]));
});
