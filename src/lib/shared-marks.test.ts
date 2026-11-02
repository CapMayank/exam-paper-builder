import { describe, expect, it } from "vitest";
import { questionSlotMarks, toPlacedItems } from "./blueprint";
import { validatePaperCompleteness } from "./paperCompletenessEngine";

const sec = (over: object = {}) => ({ id: "s", title: "S", type: "SHORT", count: 2, marksEach: 3, ...over });
const q = (over: object = {}) => ({ id: "q", chapterId: "c", type: "SHORT", text: "t", options: [], ...over });

describe("one marks rule everywhere", () => {
  it("caps sub-question totals at the slot marks and uses them when lower", () => {
    expect(questionSlotMarks(sec(), q({ subparts: [{ marks: 2 }, { marks: 2 }] })).marks).toBe(3);
    expect(questionSlotMarks(sec(), q({ subparts: [{ marks: 1 }, { marks: 1 }] })).marks).toBe(2);
    expect(questionSlotMarks(sec(), q()).marks).toBe(3);
  });

  it("honours attemptCount", () => {
    expect(questionSlotMarks(sec({ marksEach: 6 }), q({ subparts: [{ marks: 2 }, { marks: 2 }, { marks: 2 }, { marks: 2 }], attemptCount: 3 })).marks).toBe(6);
  });

  it("counts match-the-column pairs as units in a multi-slot match section", () => {
    const m = sec({ type: "MATCH_COLUMN", count: 6, marksEach: 1 });
    const mq = q({ type: "MATCH_COLUMN", text: "Match", options: ["a::1", "b::2", "c::3"] });
    expect(questionSlotMarks(m, mq)).toEqual({ marks: 3, units: 3 });
  });

  it("builder placement, completeness and slot marks agree on the section total", () => {
    const s = sec();
    const items = [
      { sectionId: "s", question: q({ id: "a", subparts: [{ marks: 2 }, { marks: 1 }] }) },
      { sectionId: "s", question: q({ id: "b" }) },
    ];
    const placed = toPlacedItems([s], items as never).reduce((a, i) => a + (i.marks ?? 0), 0);
    const completeness = validatePaperCompleteness({
      blueprint: { totalMarks: 6, sections: [s] } as never,
      items: items as never,
    }).marksValidation.actualTotalMarks;
    const direct = items.reduce((a, i) => a + questionSlotMarks(s, i.question as never).marks, 0);
    expect([placed, completeness]).toEqual([direct, direct]);
  });
});
