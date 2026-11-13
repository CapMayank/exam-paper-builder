import { describe, it, expect } from "vitest";
import {
  sectionStatusLine,
  sectionWarning,
  choicePolicyNote,
  rowActions,
  rowMenuItems,
  orMenuItems,
} from "./workbenchView";

describe("sectionStatusLine", () => {
  it("prints filled questions and marks for a normal section", () => {
    expect(sectionStatusLine({ type: "SHORT", count: 4, filledUnits: 1, itemCount: 1, placedMarks: 3, targetMarks: 12 })).toBe("1/4 questions · 3/12 marks");
  });
  it("shows pairs for a match column with one item", () => {
    expect(sectionStatusLine({ type: "MATCH_COLUMN", count: 5, filledUnits: 5, itemCount: 1, placedMarks: 5, targetMarks: 5, matchPairs: 5 })).toBe("1 question (5 pairs) · 5/5 marks");
  });
  it("shows zero pairs for an empty match column", () => {
    expect(sectionStatusLine({ type: "MATCH_COLUMN", count: 5, filledUnits: 0, itemCount: 0, placedMarks: 0, targetMarks: 5 })).toBe("0/1 question (5 pairs) · 0/5 marks");
  });
  it("shows parts for one item spanning several slots", () => {
    expect(sectionStatusLine({ type: "FILL_BLANK", count: 4, filledUnits: 4, itemCount: 1, placedMarks: 4, targetMarks: 4 })).toBe("1 question (4 parts) · 4/4 marks");
  });
  it("prints fractional marks without trailing zeros", () => {
    expect(sectionStatusLine({ type: "SHORT", count: 2, filledUnits: 1, itemCount: 1, placedMarks: 2.5, targetMarks: 5 })).toBe("1/2 questions · 2.5/5 marks");
  });
});

describe("sectionWarning", () => {
  it("returns null when the section is not full and marks are still open", () => {
    expect(sectionWarning({ count: 4, filledUnits: 2, placedMarks: 6, targetMarks: 12 })).toBeNull();
  });
  it("reports the excess when overfilled", () => {
    expect(sectionWarning({ count: 4, filledUnits: 6, placedMarks: 18, targetMarks: 12 })).toBe("2 more than this section holds");
  });
  it("reports a marks mismatch once the section is full", () => {
    expect(sectionWarning({ count: 4, filledUnits: 4, placedMarks: 10, targetMarks: 12 })).toBe("Placed marks (10) do not match the section total (12)");
  });
  it("returns null when full and marks match", () => {
    expect(sectionWarning({ count: 4, filledUnits: 4, placedMarks: 12, targetMarks: 12 })).toBeNull();
  });
});

describe("choicePolicyNote", () => {
  it("notes a mandatory OR policy", () => {
    expect(choicePolicyNote("MANDATORY_EVERY_SLOT", false)).toBe("OR on every question");
  });
  it("notes a forbidden OR policy", () => {
    expect(choicePolicyNote("FORBIDDEN", true)).toBe("No OR questions");
  });
  it("says nothing for an optional policy", () => {
    expect(choicePolicyNote("OPTIONAL", false)).toBe("");
  });
});

describe("rowActions", () => {
  it("offers no actions when the row cannot be edited", () => {
    expect(rowActions({ canEdit: false, hasOr: true, orForbidden: false })).toEqual([]);
  });
  it("offers all actions for an editable row", () => {
    expect(rowActions({ canEdit: true, hasOr: false, orForbidden: false })).toEqual(["edit", "replace", "or", "delete", "more"]);
  });
  it("hides OR when forbidden and none exists", () => {
    expect(rowActions({ canEdit: true, hasOr: false, orForbidden: true })).toEqual(["edit", "replace", "delete", "more"]);
  });
  it("keeps OR when forbidden but one exists, so it can be removed", () => {
    expect(rowActions({ canEdit: true, hasOr: true, orForbidden: true })).toContain("or");
  });
});

describe("rowMenuItems", () => {
  it("lists add diagram, page break, move and quick swap for a bare first row", () => {
    expect(rowMenuItems({ hasFigure: false, pageBreakBefore: false, index: 0, total: 3, moving: false }).map((i) => i.key)).toEqual(["addDiagram", "pageBreak", "moveUp", "moveDown", "quickSwap"]);
  });
  it("disables move up on the first row but not move down", () => {
    const first = rowMenuItems({ hasFigure: false, pageBreakBefore: false, index: 0, total: 3, moving: false });
    expect(first.find((i) => i.key === "moveUp")!.disabled).toBe(true);
    expect(first.find((i) => i.key === "moveDown")!.disabled).toBeFalsy();
  });
  it("shows diagram actions and remove page break on the last row", () => {
    const last = rowMenuItems({ hasFigure: true, pageBreakBefore: true, index: 2, total: 3, moving: false });
    expect(last.map((i) => i.key).slice(0, 4)).toEqual(["changeDiagram", "editDiagram", "previewDiagramBw", "removeDiagram"]);
    expect(last.find((i) => i.key === "pageBreak")!.label).toBe("Remove page break");
    expect(last.find((i) => i.key === "moveDown")!.disabled).toBe(true);
  });
  it("disables both move items while moving", () => {
    expect(rowMenuItems({ hasFigure: false, pageBreakBefore: false, index: 1, total: 3, moving: true }).filter((i) => i.disabled).map((i) => i.key)).toEqual(["moveUp", "moveDown"]);
  });
});

describe("orMenuItems", () => {
  it("returns nothing when the slot has no OR question", () => {
    expect(orMenuItems(false)).toEqual([]);
  });
  it("returns edit, change and remove when an OR question exists", () => {
    expect(orMenuItems(true).map((i) => i.key)).toEqual(["editOr", "changeOr", "removeOr"]);
  });
});
