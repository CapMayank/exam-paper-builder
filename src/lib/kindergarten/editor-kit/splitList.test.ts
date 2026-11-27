import { describe, expect, it } from "vitest";
import { joinPrompt, splitList, splitPrompt } from "./splitList";

describe("splitList", () => {
  it("splits on spaces", () => expect(splitList("A B C")).toEqual(["A", "B", "C"]));
  it("splits on commas and repeated spaces", () => expect(splitList("A, B  C")).toEqual(["A", "B", "C"]));
  it("drops empty pieces", () => expect(splitList(" ,, ")).toEqual([]));
  it("keeps Hindi letters whole", () => expect(splitList("क ख ग")).toEqual(["क", "ख", "ग"]));
  it("splits on new lines", () => expect(splitList("cat,dog\nsun")).toEqual(["cat", "dog", "sun"]));
  it("keeps a multi-word item whole", () => expect(splitList("ice cream")).toEqual(["ice cream"]));
  it("splits multi-word items on commas", () => expect(splitList("ice cream, apple pie")).toEqual(["ice cream", "apple pie"]));
  it("splits a run of numbers on spaces", () => expect(splitList("98 99 100")).toEqual(["98", "99", "100"]));
  it("splits Hindi letters with matras on spaces", () => expect(splitList("कि की कु")).toEqual(["कि", "की", "कु"]));
});

describe("trace prompt text", () => {
  it("reads old single-spaced letters", () => expect(splitPrompt("A B C D")).toEqual(["A", "B", "C", "D"]));
  it("reads double-spaced items, keeping words together", () => expect(splitPrompt("ice cream  Apple")).toEqual(["ice cream", "Apple"]));
  it("round-trips through join", () => expect(splitPrompt(joinPrompt(["ice cream", "A", "क"]))).toEqual(["ice cream", "A", "क"]));
});
