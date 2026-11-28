import { describe, expect, it } from "vitest";
import { afterPicturePick } from "./pictureMatch";

describe("picking a new picture for a match pair", () => {
  it("follows the picture's first letter on a letter match", () => {
    expect(afterPicturePick({ id: "1", clipartId: "apple", label: "Apple", matchLabel: "A" }, { id: "ball", name: "Ball" })).toMatchObject({
      clipartId: "ball",
      label: "Ball",
      matchLabel: "B",
    });
  });

  it("keeps a word answer like where it lives", () => {
    expect(afterPicturePick({ id: "1", clipartId: "fish", label: "Fish", matchLabel: "Water" }, { id: "cow", name: "Cow" })).toMatchObject({
      clipartId: "cow",
      label: "Cow",
      matchLabel: "Water",
    });
  });

  it("keeps a name the teacher typed", () => {
    expect(afterPicturePick({ id: "1", clipartId: "mango", label: "आम", matchLabel: "आ" }, { id: "kite", name: "Kite" })).toMatchObject({
      clipartId: "kite",
      label: "आम",
      matchLabel: "आ",
    });
  });
});
