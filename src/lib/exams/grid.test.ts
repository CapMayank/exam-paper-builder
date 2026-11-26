import { describe, expect, it } from "vitest";
import { checkAddClass, checkAddDate, checkCellSubjects, checkMoveDate, copyLayout } from "./grid";
import type { BlockView, ExamView, SlotView } from "./types";

const high: BlockView = { id: "b1", title: "High / Higher Secondary School", position: 0, timeText: "11:00 am to 02:00 pm", dates: ["2026-12-10", "2026-12-12"], classes: ["Class 12", "Class 10"] };
const middle: BlockView = { id: "b2", title: "Middle School", position: 1, timeText: "11:00 am to 02:00 pm", dates: ["2026-12-10"], classes: ["Class 8"] };

describe("checkAddClass", () => {
  it("refuses a class already in another block of the exam", () => {
    expect(checkAddClass([high, middle], "b2", "Class 10")).toBe("Class 10 is already in High / Higher Secondary School");
  });
  it("allows a class in no block yet", () => {
    expect(checkAddClass([high, middle], "b2", "Class 7")).toBeNull();
  });
  it("does not complain about the block the class is already in", () => {
    expect(checkAddClass([high, middle], "b1", "Class 10")).toBeNull();
  });
});

describe("checkMoveDate", () => {
  it("refuses moving a column onto a date the block already has", () => {
    expect(checkMoveDate(high, "2026-12-10", "2026-12-12")).toBe("12/12/2026 is already a date in High / Higher Secondary School");
  });
  it("refuses moving a date the block does not have", () => {
    expect(checkMoveDate(high, "2026-12-14", "2026-12-15")).toBe("14/12/2026 is not a date in High / Higher Secondary School");
  });
  it("allows moving to a free date", () => {
    expect(checkMoveDate(high, "2026-12-10", "2026-12-11")).toBeNull();
  });
});

describe("checkAddDate", () => {
  it("refuses a duplicate date", () => {
    expect(checkAddDate(high, "2026-12-12")).toBe("12/12/2026 is already a date in High / Higher Secondary School");
  });
  it("allows a new date", () => {
    expect(checkAddDate(high, "2026-12-14")).toBeNull();
  });
});

describe("copyLayout", () => {
  const base: Omit<SlotView, "id" | "blockId" | "className" | "subject" | "examDate"> = {
    paper: null, hasBlueprint: true, printedAt: null, printedByName: null, printedPaperAt: null, dateChangedAfterPrint: false, status: "NO_PAPER", warnings: [],
  };
  const exam: ExamView = {
    id: "e1", name: "Half Yearly", examType: "HALF_YEARLY", academicSession: "2026–27", status: "CIRCULATED", signatureMode: "SIGNED", showInstructions: false, instructions: "",
    blocks: [middle, high],
    slots: [
      { ...base, id: "s1", blockId: "b1", className: "Class 12", subject: "Chemistry", examDate: "2026-12-10", paper: { id: "p1", title: "Chem", status: "FINAL", updatedAt: "x" }, printedAt: "2026-12-01T00:00:00Z", status: "PRINTED" },
      { ...base, id: "s2", blockId: "b1", className: "Class 10", subject: "Math", examDate: "2026-12-12" },
      { ...base, id: "s3", blockId: "b2", className: "Class 8", subject: "SST", examDate: "2026-12-10" },
    ],
  };
  it("keeps blocks in position order with their dates and classes", () => {
    const c = copyLayout(exam);
    expect(c.blocks.map((b) => b.title)).toEqual(["High / Higher Secondary School", "Middle School"]);
    expect(c.blocks[0]).toEqual({ title: high.title, position: 0, timeText: high.timeText, dates: high.dates, classes: high.classes });
  });
  it("keeps every slot's subject and date but no paper or printed state", () => {
    const c = copyLayout(exam);
    expect(c.slots).toEqual([
      { blockIndex: 0, className: "Class 12", subject: "Chemistry", examDate: "2026-12-10" },
      { blockIndex: 0, className: "Class 10", subject: "Math", examDate: "2026-12-12" },
      { blockIndex: 1, className: "Class 8", subject: "SST", examDate: "2026-12-10" },
    ]);
  });
});

describe("checkCellSubjects", () => {
  const placed = [
    { className: "Class 5", examDate: "2026-12-11", subject: "English" },
    { className: "Class 5", examDate: "2026-12-15", subject: "Mathematics" },
    { className: "Class 4", examDate: "2026-12-11", subject: "General Knowledge" },
  ];
  it("allows two papers on one day, such as GK and Drawing", () => {
    expect(checkCellSubjects(placed, "Class 5", "2026-12-22", ["General Knowledge", "Drawing"])).toBeNull();
  });
  it("refuses a third paper on one day", () => {
    expect(checkCellSubjects(placed, "Class 5", "2026-12-22", ["General Knowledge", "Drawing", "Hindi"])).toBe("A day can hold at most two papers for a class");
  });
  it("refuses the same subject twice in a cell", () => {
    expect(checkCellSubjects(placed, "Class 5", "2026-12-22", ["Drawing", "Drawing"])).toBe("Drawing is already in this cell");
  });
  it("refuses a subject the class already has on another date", () => {
    expect(checkCellSubjects(placed, "Class 5", "2026-12-22", ["Mathematics"])).toBe("Mathematics is already on 15/12/2026 for Class 5");
  });
  it("ignores the cell's own date and other classes", () => {
    expect(checkCellSubjects(placed, "Class 5", "2026-12-11", ["English", "General Knowledge"])).toBeNull();
  });
});
